from collections.abc import Sequence
from typing import Optional

from sqlalchemy import func, select, update as sa_update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.utils.ids import generate_id


async def get_by_email(session: AsyncSession, email: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get(session: AsyncSession, user_id: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_by_name(session: AsyncSession, name: str) -> Optional[User]:
    result = await session.execute(
        select(User).where(func.lower(User.name) == name.lower())
    )
    return result.scalar_one_or_none()


async def list_users(
    session: AsyncSession, role: UserRole | None = None, skip: int = 0, limit: int = 100
) -> Sequence[User]:
    query = select(User)
    if role:
        query = query.where(User.role == role)
    result = await session.execute(
        query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def create(session: AsyncSession, payload: UserCreate) -> User:
    user = User(
        id=generate_id(),
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        message = "El correo ya está registrado"
        if exc.orig:
            message = f"{message}: {exc.orig}"
        raise ValueError(message) from exc
    await session.refresh(user)
    return user


async def update(session: AsyncSession, user: User, payload: UserUpdate) -> User:
    patch_data = payload.model_dump(exclude_unset=True)
    if not patch_data:
        return user

    await session.execute(
        sa_update(User)
        .where(User.id == user.id)
        .values(**patch_data)
    )
    await session.commit()
    await session.refresh(user)
    return user


async def delete(session: AsyncSession, user: User) -> None:
    await session.delete(user)
    await session.commit()
