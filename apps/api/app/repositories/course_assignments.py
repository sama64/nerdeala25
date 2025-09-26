from collections.abc import Sequence
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_assignment import CourseAssignment
from app.utils.ids import generate_id


async def get(session: AsyncSession, assignment_id: str) -> Optional[CourseAssignment]:
    result = await session.execute(
        select(CourseAssignment).where(CourseAssignment.id == assignment_id)
    )
    return result.scalar_one_or_none()


async def upsert(
    session: AsyncSession,
    *,
    assignment_id: str,
    course_id: str,
    title: str,
    description: str | None,
    work_type: str | None,
    state: str | None,
    due_at: datetime | None,
    alternate_link: str | None,
    max_points: float | None,
    created_time: datetime | None,
    updated_time: datetime | None,
) -> CourseAssignment:
    assignment = await get(session, assignment_id)

    if assignment is None:
        assignment = CourseAssignment(
            id=assignment_id or generate_id(),
            course_id=course_id,
            title=title,
            description=description,
            work_type=work_type,
            state=state,
            due_at=due_at,
            alternate_link=alternate_link,
            max_points=max_points,
            created_time=created_time,
            updated_time=updated_time,
        )
        session.add(assignment)
    else:
        assignment.title = title
        assignment.description = description
        assignment.work_type = work_type
        assignment.state = state
        assignment.due_at = due_at
        assignment.alternate_link = alternate_link
        assignment.max_points = max_points
        assignment.created_time = created_time
        assignment.updated_time = updated_time

    await session.flush()
    return assignment


async def list_for_course(session: AsyncSession, course_id: str) -> Sequence[CourseAssignment]:
    result = await session.execute(
        select(CourseAssignment).where(CourseAssignment.course_id == course_id)
    )
    return result.scalars().all()


async def delete(session: AsyncSession, assignment: CourseAssignment) -> None:
    await session.delete(assignment)
    await session.flush()
