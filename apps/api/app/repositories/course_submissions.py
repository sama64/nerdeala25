from collections.abc import Sequence
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_submission import CourseSubmission


async def get(session: AsyncSession, submission_id: str) -> Optional[CourseSubmission]:
    result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.id == submission_id)
    )
    return result.scalar_one_or_none()


async def upsert(
    session: AsyncSession,
    *,
    submission_id: str,
    course_id: str,
    coursework_id: str,
    google_user_id: str,
    matched_user_id: str | None,
    state: str | None,
    late: bool,
    turned_in_at: datetime | None,
    assigned_grade: float | None,
    draft_grade: float | None,
    updated_time: datetime | None,
) -> CourseSubmission:
    submission = await get(session, submission_id)

    if submission is None:
        submission = CourseSubmission(
            id=submission_id,
            course_id=course_id,
            coursework_id=coursework_id,
            google_user_id=google_user_id,
            matched_user_id=matched_user_id,
            state=state,
            late=late,
            turned_in_at=turned_in_at,
            assigned_grade=assigned_grade,
            draft_grade=draft_grade,
            updated_time=updated_time,
        )
        session.add(submission)
    else:
        submission.course_id = course_id
        submission.coursework_id = coursework_id
        submission.google_user_id = google_user_id
        submission.matched_user_id = matched_user_id
        submission.state = state
        submission.late = late
        submission.turned_in_at = turned_in_at
        submission.assigned_grade = assigned_grade
        submission.draft_grade = draft_grade
        submission.updated_time = updated_time

    await session.flush()
    return submission


async def list_for_course(session: AsyncSession, course_id: str) -> Sequence[CourseSubmission]:
    result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.course_id == course_id)
    )
    return result.scalars().all()


async def list_for_coursework(session: AsyncSession, coursework_id: str) -> Sequence[CourseSubmission]:
    result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.coursework_id == coursework_id)
    )
    return result.scalars().all()


async def delete(session: AsyncSession, submission: CourseSubmission) -> None:
    await session.delete(submission)
    await session.flush()
