from collections.abc import Sequence
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate
from app.utils.ids import generate_id


async def list_by_student(
    session: AsyncSession, student_id: str, skip: int = 0, limit: int = 100
) -> Sequence[Attendance]:
    result = await session.execute(
        select(Attendance)
        .where(Attendance.student_id == student_id)
        .order_by(Attendance.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def list_by_date(
    session: AsyncSession, target_date: date | None = None, skip: int = 0, limit: int = 100
) -> Sequence[Attendance]:
    query = select(Attendance)
    if target_date:
        query = query.where(Attendance.date == target_date)
    result = await session.execute(
        query.order_by(Attendance.recorded_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def list_by_course_and_date(
    session: AsyncSession, course_id: str, target_date: date, skip: int = 0, limit: int = 100
) -> Sequence[Attendance]:
    result = await session.execute(
        select(Attendance)
        .where(Attendance.course_id == course_id)
        .where(Attendance.date == target_date)
        .order_by(Attendance.recorded_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def create(session: AsyncSession, payload: AttendanceCreate) -> Attendance:
    attendance = Attendance(
        id=payload.id or generate_id(),
        student_id=payload.student_id,
        course_id=payload.course_id,
        date=payload.date,
        status=payload.status,
        notes=payload.notes,
    )
    session.add(attendance)
    await session.commit()
    await session.refresh(attendance)
    return attendance


async def create_bulk(session: AsyncSession, attendances: list[AttendanceCreate]) -> list[Attendance]:
    """Create multiple attendance records in a single transaction"""
    attendance_objects = []
    for payload in attendances:
        attendance = Attendance(
            id=payload.id or generate_id(),
            student_id=payload.student_id,
            course_id=payload.course_id,
            date=payload.date,
            status=payload.status,
            notes=payload.notes,
        )
        attendance_objects.append(attendance)
        session.add(attendance)

    await session.commit()
    for attendance in attendance_objects:
        await session.refresh(attendance)
    return attendance_objects
