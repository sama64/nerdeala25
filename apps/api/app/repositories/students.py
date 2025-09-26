from collections.abc import Sequence
from typing import Optional

from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate
from app.utils.ids import generate_id


async def get(session: AsyncSession, student_id: str) -> Student | None:
    result = await session.execute(
        select(Student)
        .options(
            selectinload(Student.user),
            selectinload(Student.notifications),
            selectinload(Student.reports),
            selectinload(Student.attendance_records),
        )
        .where(Student.id == student_id)
    )
    return result.scalar_one_or_none()


async def get_by_user(session: AsyncSession, user_id: str) -> Student | None:
    result = await session.execute(
        select(Student)
        .options(selectinload(Student.user), selectinload(Student.notifications))
        .where(Student.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_students(
    session: AsyncSession,
    course_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Student]:
    query = select(Student)
    if course_id:
        query = query.where(Student.course_id == course_id)
    result = await session.execute(
        query.options(
            selectinload(Student.user),
            selectinload(Student.notifications),
        )
        .order_by(Student.progress.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def create(session: AsyncSession, payload: StudentCreate) -> Student:
    student = Student(
        id=payload.id or generate_id(),
        user_id=payload.user_id,
        course_id=payload.course_id,
        progress=payload.progress,
        attendance_rate=payload.attendance_rate,
    )
    session.add(student)
    await session.commit()
    await session.refresh(student)
    return student


async def update(session: AsyncSession, student: Student, payload: StudentUpdate) -> Student:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return student

    await session.execute(sa_update(Student).where(Student.id == student.id).values(**data))
    await session.commit()
    await session.refresh(student)
    return student


async def delete(session: AsyncSession, student: Student) -> None:
    await session.delete(student)
    await session.commit()
