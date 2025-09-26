from __future__ import annotations

import secrets
import time
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.token import AuthToken, TokenType
from app.models.user import User, UserRole
from app.repositories import tokens, users
from app.schemas.auth import (
    LoginRequest,
    PasswordRecoveryRequest,
    PasswordResetRequest,
    RegisterRequest,
    Token,
    VerifyRequest,
    GoogleExchangeRequest,
)
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import email
from urllib.parse import urlencode, urlparse
import logging

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)

_login_attempts: dict[str, list[float]] = {}
ATTEMPT_WINDOW = 60.0


def _normalize_email(email_address: str) -> str:
    return email_address.lower().strip()


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_oauth_states: dict[str, tuple[float, str]] = {}
OAUTH_STATE_TTL = 600.0


def _cleanup_states(current_time: float) -> None:
    threshold = current_time - OAUTH_STATE_TTL
    for key, value in list(_oauth_states.items()):
        if value[0] < threshold:
            _oauth_states.pop(key, None)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(payload: RegisterRequest, session: AsyncSession = Depends(get_db)) -> UserRead:
    normalized_email = _normalize_email(payload.email)
    existing = await users.get_by_email(session, normalized_email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya está registrado")

    try:
        role = UserRole(payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido") from exc

    user = await users.create(
        session,
        UserCreate(name=payload.name, email=normalized_email, password=payload.password, role=role),
    )

    verification_token = secrets.token_urlsafe(32)
    expires_at = AuthToken.expiry(60 * 24)
    await tokens.create(session, user.id, verification_token, TokenType.VERIFY, expires_at)
    await email.send_verification_email(user.email, verification_token)

    return UserRead.model_validate(user)


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)) -> Token:
    normalized_email = _normalize_email(payload.email)
    now = time.time()
    attempts = _login_attempts.setdefault(normalized_email, [])
    attempts.append(now)
    attempts[:] = [ts for ts in attempts if now - ts <= ATTEMPT_WINDOW]

    if len(attempts) > settings.rate_limit_login_per_minute:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Demasiados intentos, espera un minuto")

    user = await users.get_by_email(session, normalized_email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not user.verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verifica tu correo antes de iniciar sesión")

    expires_at = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expires_minutes)
    token = Token(access_token=create_access_token(user.id), expires_at=expires_at)
    return token


@router.get("/me", response_model=UserRead)
async def get_profile(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.get("/google/login", status_code=status.HTTP_302_FOUND)
async def google_login(request: Request) -> RedirectResponse:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth no está configurado")

    state = secrets.token_urlsafe(32)
    now = time.time()
    _cleanup_states(now)

    redirect_uri = settings.google_oauth_redirect_uri

    redirect_override = request.query_params.get("redirect_uri")
    if redirect_override:
        parsed = urlparse(redirect_override)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            origin_candidate = f"{parsed.scheme}://{parsed.netloc}"
            path = parsed.path.rstrip("/")
            if origin_candidate in settings.cors_origins and path == "/oauth/callback":
                redirect_uri = redirect_override
    else:
        origin = request.headers.get("origin")
        if origin:
            origin_clean = origin.rstrip("/")
            if origin_clean in settings.cors_origins:
                redirect_uri = f"{origin_clean}/oauth/callback"

    _oauth_states[state] = (now, redirect_uri)

    params = {
        "client_id": settings.google_client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }

    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)


@router.post("/google/exchange", response_model=Token)
async def google_exchange(
    payload: GoogleExchangeRequest, session: AsyncSession = Depends(get_db)
) -> Token:
    state_entry = _oauth_states.pop(payload.state, None)
    if not state_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado inválido o expirado")

    issued_at, redirect_uri = state_entry
    if time.time() - issued_at > OAUTH_STATE_TTL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado inválido o expirado")

    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth no está configurado")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": payload.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise ValueError("missing access token")

            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_response.raise_for_status()
            profile = userinfo_response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Error al comunicarse con Google") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Respuesta inválida de Google") from exc

    email = profile.get("email")
    email_verified = profile.get("email_verified", True)
    full_name = profile.get("name") or " ".join(
        part
        for part in [profile.get("given_name"), profile.get("family_name")]
        if part
    ).strip()

    if not email or not email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cuenta de Google no está verificada")

    normalized_email = _normalize_email(email)

    user = await users.get_by_email(session, normalized_email)
    creation_error: str | None = None
    if not user:
        random_password = secrets.token_hex(16)
        display_name = full_name or normalized_email.split("@")[0]
        try:
            user = await users.create(
                session,
                UserCreate(
                    name=display_name,
                    email=normalized_email,
                    password=random_password,
                    role=UserRole.TEACHER,
                ),
            )
        except ValueError as exc:
            creation_error = str(exc)
            logger.exception("No pudimos crear el usuario con Google: %s", exc)
            user = await users.get_by_email(session, normalized_email)

    if not user:
        detail = "No pudimos crear el usuario"
        if creation_error:
            detail = f"{detail}: {creation_error}"
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

    updates: dict[str, object] = {}
    if not user.verified:
        updates["verified"] = True
    if full_name and user.name != full_name:
        updates["name"] = full_name

    if updates:
        user = await users.update(session, user, UserUpdate(**updates))

    expires_at = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expires_minutes)
    token = create_access_token(user.id)
    return Token(access_token=token, expires_at=expires_at)


@router.post("/verify", response_model=UserRead)
async def verify_account(payload: VerifyRequest, session: AsyncSession = Depends(get_db)) -> UserRead:
    auth_token = await tokens.get(session, payload.token, TokenType.VERIFY)
    if not auth_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado")

    user = await users.get(session, auth_token.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    user = await users.update(session, user, UserUpdate(verified=True))
    await tokens.consume(session, auth_token)
    return UserRead.model_validate(user)


@router.post("/password/recovery")
async def request_password_recovery(
    payload: PasswordRecoveryRequest, session: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    normalized_email = _normalize_email(payload.email)
    user = await users.get_by_email(session, normalized_email)
    if user:
        reset_token = secrets.token_urlsafe(32)
        expires_at = AuthToken.expiry(30)
        await tokens.create(session, user.id, reset_token, TokenType.RESET, expires_at)
        await email.send_password_reset_email(normalized_email, reset_token)
    return {"message": "Si el correo existe, se enviaron instrucciones"}


@router.post("/password/reset")
async def reset_password(
    payload: PasswordResetRequest, session: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    auth_token = await tokens.get(session, payload.token, TokenType.RESET)
    if not auth_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado")

    user = await users.get(session, auth_token.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    user.hashed_password = get_password_hash(payload.new_password)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    await tokens.consume(session, auth_token)
    return {"message": "Contraseña actualizada"}
