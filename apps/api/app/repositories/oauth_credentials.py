from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_credential import UserOAuthCredential
from app.utils.ids import generate_id


async def get_google_credentials(
    session: AsyncSession, user_id: str
) -> Optional[UserOAuthCredential]:
    result = await session.execute(
        select(UserOAuthCredential).where(
            UserOAuthCredential.user_id == user_id,
            UserOAuthCredential.provider == "google",
        )
    )
    return result.scalar_one_or_none()


async def upsert_google_credentials(
    session: AsyncSession,
    user_id: str,
    access_token: str,
    refresh_token: str | None,
    expires_at: datetime | None,
) -> UserOAuthCredential:
    credential = await get_google_credentials(session, user_id)
    now = datetime.utcnow()

    if credential is None:
        credential = UserOAuthCredential(
            id=generate_id(),
            user_id=user_id,
            provider="google",
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
        session.add(credential)
    else:
        credential.access_token = access_token
        credential.token_expires_at = expires_at
        credential.updated_at = now
        if refresh_token:
            credential.refresh_token = refresh_token

    await session.commit()
    await session.refresh(credential)
    return credential
