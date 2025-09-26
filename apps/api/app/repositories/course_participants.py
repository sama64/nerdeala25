from collections.abc import Sequence
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_participant import CourseParticipant, ParticipantRole
from app.utils.ids import generate_id


async def get(
    session: AsyncSession, course_id: str, google_user_id: str
) -> Optional[CourseParticipant]:
    result = await session.execute(
        select(CourseParticipant).where(
            CourseParticipant.course_id == course_id,
            CourseParticipant.google_user_id == google_user_id,
        )
    )
    return result.scalar_one_or_none()


async def upsert(
    session: AsyncSession,
    *,
    course_id: str,
    google_user_id: str,
    email: str | None,
    full_name: str | None,
    photo_url: str | None,
    role: ParticipantRole,
    matched_user_id: str | None,
) -> CourseParticipant:
    participant = await get(session, course_id, google_user_id)

    if participant is None:
        participant = CourseParticipant(
            id=generate_id(),
            course_id=course_id,
            google_user_id=google_user_id,
            email=email,
            full_name=full_name,
            photo_url=photo_url,
            role=role,
            matched_user_id=matched_user_id,
        )
        session.add(participant)
    else:
        participant.email = email or participant.email
        participant.full_name = full_name or participant.full_name
        participant.photo_url = photo_url or participant.photo_url
        participant.role = role
        participant.matched_user_id = matched_user_id

    participant.last_seen_at = datetime.utcnow()
    await session.flush()
    return participant


async def list_for_course(session: AsyncSession, course_id: str) -> Sequence[CourseParticipant]:
    result = await session.execute(
        select(CourseParticipant).where(CourseParticipant.course_id == course_id)
    )
    return result.scalars().all()


async def delete(session: AsyncSession, participant: CourseParticipant) -> None:
    await session.delete(participant)
    await session.flush()
