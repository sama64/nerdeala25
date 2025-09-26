from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.models.notification import NotificationStatus
from app.models.student import Student
from app.models.user import User, UserRole
from app.repositories import notifications as notifications_repo
from app.repositories import students as students_repo
from app.schemas.attendance import AttendanceRead
from app.schemas.notification import NotificationRead
from app.schemas.report import ReportRead
from app.schemas.student import (
    StudentCreate,
    StudentDetail,
    StudentOverview,
    StudentRead,
    StudentUpdate,
)
from app.services.analytics import summarize_attendance, summarize_notifications, summarize_students

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=dict)
async def list_students_endpoint(
    course_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size
    target_course_id = course_id

    if current_user.role == UserRole.TEACHER and not course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe indicar un curso para listar estudiantes",
        )

    items = await students_repo.list_students(
        session, course_id=target_course_id, skip=skip, limit=size
    )

    enriched: list[dict] = []
    for student in items:
        pending_alerts = sum(
            1 for notification in student.notifications if notification.status == NotificationStatus.PENDING
        )
        overview = StudentOverview(
            id=student.id,
            user_id=student.user_id,
            course_id=student.course_id,
            progress=student.progress,
            attendance_rate=student.attendance_rate,
            created_at=student.created_at,
            updated_at=student.updated_at,
            user={
                "id": student.user.id,
                "name": student.user.name,
                "email": student.user.email,
                "role": student.user.role.value,
                "verified": student.user.verified,
            },
            alerts=pending_alerts,
        )
        enriched.append(overview.model_dump())

    total_query = select(func.count()).select_from(Student)
    if target_course_id:
        total_query = total_query.where(Student.course_id == target_course_id)
    total = await session.scalar(total_query) or 0

    metrics = summarize_students(items)

    return {
        "items": enriched,
        "pagination": {"total": total, "page": page, "size": size},
        "metrics": metrics,
    }


@router.post("/", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
async def create_student_endpoint(
    payload: StudentCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR)),
) -> StudentRead:
    if payload.id and await students_repo.get(session, payload.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El estudiante ya existe")
    student = await students_repo.create(session, payload)
    return StudentRead.model_validate(student)


@router.get("/{student_id}", response_model=dict)
async def retrieve_student(
    student_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    student = await students_repo.get(session, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

    if current_user.role == UserRole.TEACHER and student.course and student.course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    notifications_list = await notifications_repo.list_notifications(
        session, student_id=student.id, skip=0, limit=50
    )
    notifications_summary = summarize_notifications(notifications_list)

    detail = StudentDetail(
        id=student.id,
        user_id=student.user_id,
        course_id=student.course_id,
        progress=student.progress,
        attendance_rate=student.attendance_rate,
        created_at=student.created_at,
        updated_at=student.updated_at,
        user={
            "id": student.user.id,
            "name": student.user.name,
            "email": student.user.email,
            "role": student.user.role.value,
            "verified": student.user.verified,
        },
        notifications=[NotificationRead.model_validate(item) for item in notifications_list],
        reports=[ReportRead.model_validate(report) for report in student.reports],
        attendance_records=[
            AttendanceRead.model_validate(record) for record in student.attendance_records
        ],
        alerts=notifications_summary.get("pending", 0),
    )

    return {
        "student": detail.model_dump(),
        "attendance_summary": summarize_attendance(student.attendance_records),
        "notifications_summary": notifications_summary,
    }


@router.patch("/{student_id}", response_model=StudentRead)
async def update_student_endpoint(
    student_id: str,
    payload: StudentUpdate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> StudentRead:
    student = await students_repo.get(session, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

    student = await students_repo.update(session, student, payload)
    return StudentRead.model_validate(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student_endpoint(
    student_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Response:
    student = await students_repo.get(session, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

    await students_repo.delete(session, student)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
