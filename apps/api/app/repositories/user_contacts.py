from collections.abc import Iterable
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_contact import UserContact


class _UnsetType:
    __slots__ = ()


_UNSET: Any = _UnsetType()


async def get(session: AsyncSession, user_id: str) -> UserContact | None:
    return await session.get(UserContact, user_id)


async def upsert(
    session: AsyncSession,
    *,
    user_id: str,
    email: str | None = None,
    phone_e164: str | None | _UnsetType = _UNSET,
) -> UserContact:
    contact = await get(session, user_id)
    email_normalized = email.lower() if isinstance(email, str) else None

    if contact is None:
        contact = UserContact(
            user_id=user_id,
            email=email_normalized,
            phone_e164=None if isinstance(phone_e164, _UnsetType) else phone_e164,
        )
        session.add(contact)
    else:
        if email_normalized:
            contact.email = email_normalized
        if not isinstance(phone_e164, _UnsetType):
            contact.phone_e164 = phone_e164

    await session.flush()
    return contact


async def get_phone_map(
    session: AsyncSession, user_ids: Iterable[str]
) -> dict[str, str]:
    user_ids = [uid for uid in user_ids if uid]
    if not user_ids:
        return {}

    result = await session.execute(
        select(UserContact).where(UserContact.user_id.in_(user_ids))
    )
    contacts = result.scalars().all()
    return {
        contact.user_id: contact.phone_e164
        for contact in contacts
        if contact.phone_e164
    }
