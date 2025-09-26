from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token import AuthToken, TokenType
from app.utils.ids import generate_id


async def create(
    session: AsyncSession, user_id: str, token: str, token_type: TokenType, expires_at: datetime
) -> AuthToken:
    auth_token = AuthToken(
        id=generate_id(),
        user_id=user_id,
        token=token,
        token_type=token_type,
        expires_at=expires_at,
    )
    session.add(auth_token)
    await session.commit()
    await session.refresh(auth_token)
    return auth_token


async def get(session: AsyncSession, token: str, token_type: TokenType) -> Optional[AuthToken]:
    result = await session.execute(
        select(AuthToken).where(
            AuthToken.token == token,
            AuthToken.token_type == token_type,
            AuthToken.expires_at >= datetime.utcnow(),
            AuthToken.consumed.is_(False),
        )
    )
    return result.scalar_one_or_none()


async def consume(session: AsyncSession, auth_token: AuthToken) -> None:
    auth_token.consumed = True
    await session.commit()
