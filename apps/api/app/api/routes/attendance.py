from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.models.attendance import Attendance
from app.models.user import User, UserRole
from app.repositories import attendance as attendance_repo
from app.schemas.attendance import AttendanceCreate, AttendanceRead
from app.services.analytics import summarize_attendance

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/", response_model=dict)
async def list_attendance(
    student_id: str | None = Query(default=None),
    course_id: str | None = Query(default=None),
    target_date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size

    if current_user.role == UserRole.STUDENT:
        student_profile = getattr(current_user, "student_profile", None)
        student_id = student_profile.id if student_profile else None

    # Priority: course_id + date > student_id > date only
    if course_id and target_date:
        items = await attendance_repo.list_by_course_and_date(session, course_id=course_id, target_date=target_date, skip=skip, limit=size)
    elif student_id:
        items = await attendance_repo.list_by_student(session, student_id=student_id, skip=skip, limit=size)
    else:
        items = await attendance_repo.list_by_date(session, target_date=target_date, skip=skip, limit=size)

    records = [AttendanceRead.model_validate(item).model_dump() for item in items]
    summary = summarize_attendance(items)

    return {
        "items": records,
        "summary": summary,
        "page": page,
        "size": size,
    }


@router.post("/", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    payload: AttendanceCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> AttendanceRead:
    attendance = await attendance_repo.create(session, payload)
    return AttendanceRead.model_validate(attendance)


@router.post("/bulk", response_model=list[AttendanceRead], status_code=status.HTTP_201_CREATED)
async def create_bulk_attendance(
    payload: list[AttendanceCreate],
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> list[AttendanceRead]:
    attendances = await attendance_repo.create_bulk(session, payload)
    return [AttendanceRead.model_validate(attendance) for attendance in attendances]
