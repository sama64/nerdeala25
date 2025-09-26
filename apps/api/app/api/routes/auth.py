from __future__ import annotations

import secrets
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
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
)
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import email

router = APIRouter(prefix="/auth", tags=["auth"])

_login_attempts: dict[str, list[float]] = {}
ATTEMPT_WINDOW = 60.0


def _normalize_email(email_address: str) -> str:
    return email_address.lower().strip()


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
