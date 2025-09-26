from collections.abc import Sequence
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_membership import ClassroomMemberRole, CourseMembership
from app.utils.ids import generate_id


async def get(
    session: AsyncSession, course_id: str, user_id: str
) -> Optional[CourseMembership]:
    result = await session.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def upsert(
    session: AsyncSession,
    course_id: str,
    user_id: str,
    role: ClassroomMemberRole,
) -> CourseMembership:
    membership = await get(session, course_id, user_id)

    if membership is None:
        membership = CourseMembership(
            id=generate_id(),
            course_id=course_id,
            user_id=user_id,
            role=role,
        )
        session.add(membership)
    else:
        if membership.role != role:
            membership.role = role

    await session.flush()
    return membership


async def list_for_user(session: AsyncSession, user_id: str) -> Sequence[CourseMembership]:
    result = await session.execute(
        select(CourseMembership).where(CourseMembership.user_id == user_id)
    )
    return result.scalars().all()


async def delete(session: AsyncSession, membership: CourseMembership) -> None:
    await session.delete(membership)
    await session.flush()
