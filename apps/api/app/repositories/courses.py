from collections.abc import Sequence
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate
from app.utils.ids import generate_id


async def get(session: AsyncSession, course_id: str) -> Course | None:
    result = await session.execute(select(Course).where(Course.id == course_id))
    return result.scalar_one_or_none()


async def list_courses(
    session: AsyncSession,
    teacher_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Course]:
    query = select(Course)
    if teacher_id:
        query = query.where(Course.teacher_id == teacher_id)
    result = await session.execute(
        query.order_by(Course.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def create(session: AsyncSession, payload: CourseCreate) -> Course:
    course = Course(
        id=payload.id or generate_id(),
        name=payload.name,
        description=payload.description,
        teacher_id=payload.teacher_id,
    )
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course


async def update(session: AsyncSession, course: Course, payload: CourseUpdate) -> Course:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return course

    await session.execute(update(Course).where(Course.id == course.id).values(**data))
    await session.commit()
    await session.refresh(course)
    return course


async def delete(session: AsyncSession, course: Course) -> None:
    await session.delete(course)
    await session.commit()
