from __future__ import annotations

from datetime import datetime, timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories import oauth_credentials


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

TOKEN_REFRESH_MARGIN_SECONDS = 300
HTTP_TIMEOUT_SECONDS = 10.0


class GoogleOAuthError(RuntimeError):
    """Raised when interacting with Google OAuth fails."""


async def ensure_google_access_token(
    session: AsyncSession, user_id: str, *, force_refresh: bool = False
) -> str:
    """Return a valid Google access token, refreshing it if it is close to expiring."""

    credential = await oauth_credentials.get_google_credentials(session, user_id)
    if not credential:
        raise GoogleOAuthError("No hay credenciales de Google almacenadas")

    expires_at = credential.token_expires_at
    refresh_needed = force_refresh
    if not refresh_needed and expires_at is not None:
        refresh_needed = expires_at <= datetime.utcnow() + timedelta(seconds=TOKEN_REFRESH_MARGIN_SECONDS)

    if refresh_needed:
        credential = await _refresh_google_access_token(session, credential.user_id)

    if not credential.access_token:
        raise GoogleOAuthError("No se dispone de un access token válido")

    return credential.access_token


async def _refresh_google_access_token(session: AsyncSession, user_id: str):
    credential = await oauth_credentials.get_google_credentials(session, user_id)
    if not credential:
        raise GoogleOAuthError("No hay credenciales de Google almacenadas")

    if not credential.refresh_token:
        raise GoogleOAuthError("No hay refresh token disponible para Google")

    if not settings.google_client_id or not settings.google_client_secret:
        raise GoogleOAuthError("Google OAuth no está configurado")

    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": credential.refresh_token,
        "grant_type": "refresh_token",
    }

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:  # pragma: no cover - network interaction
        raise GoogleOAuthError("No se pudo refrescar el token de Google") from exc

    payload = response.json()
    access_token = payload.get("access_token")
    if not access_token:
        raise GoogleOAuthError("Respuesta inválida de Google al refrescar el token")

    expires_in_raw = payload.get("expires_in")
    expires_at = None
    if isinstance(expires_in_raw, (int, float)):
        expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in_raw))

    refresh_token = payload.get("refresh_token")

    return await oauth_credentials.upsert_google_credentials(
        session,
        user_id=user_id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )
