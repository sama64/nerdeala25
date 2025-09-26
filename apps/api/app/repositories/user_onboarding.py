from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole
from app.models.user_onboarding import UserOnboardingState


class _UnsetType:
    __slots__ = ()


_UNSET: Any = _UnsetType()


async def get(session: AsyncSession, user_id: str) -> UserOnboardingState | None:
    return await session.get(UserOnboardingState, user_id)


async def upsert(
    session: AsyncSession,
    *,
    user_id: str,
    selected_role: UserRole | None = None,
    whatsapp_opt_in: bool | None = None,
    phone_e164: str | None | _UnsetType = _UNSET,
    mark_completed: bool | None = None,
) -> UserOnboardingState:
    state = await get(session, user_id)
    if state is None:
        state = UserOnboardingState(user_id=user_id)
        session.add(state)

    if selected_role is not None:
        state.selected_role = selected_role
    if whatsapp_opt_in is not None:
        state.whatsapp_opt_in = whatsapp_opt_in
    if not isinstance(phone_e164, _UnsetType):
        state.phone_e164 = phone_e164
    if mark_completed is not None:
        state.completed_at = datetime.utcnow() if mark_completed else None

    await session.flush()
    await session.refresh(state)
    return state
