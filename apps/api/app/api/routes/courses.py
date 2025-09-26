from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.models.course import Course
from app.models.user import User, UserRole
from app.repositories import courses
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=dict)
async def list_courses_endpoint(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    teacher_id: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size
    target_teacher_id = teacher_id
    if current_user.role == UserRole.TEACHER:
        target_teacher_id = current_user.id

    items = await courses.list_courses(session, teacher_id=target_teacher_id, skip=skip, limit=size)

    total_query = select(func.count()).select_from(Course)
    if target_teacher_id:
        total_query = total_query.where(Course.teacher_id == target_teacher_id)
    total = await session.scalar(total_query) or 0

    return {
        "items": [CourseRead.model_validate(item).model_dump() for item in items],
        "pagination": {"total": total, "page": page, "size": size},
    }


@router.post("/", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
async def create_course_endpoint(
    payload: CourseCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR)),
) -> CourseRead:
    course = await courses.create(session, payload)
    return CourseRead.model_validate(course)


@router.get("/{course_id}", response_model=CourseRead)
async def retrieve_course(
    course_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> CourseRead:
    course = await courses.get(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    if current_user.role == UserRole.TEACHER and course.teacher_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contenido no autorizado")

    return CourseRead.model_validate(course)


@router.patch("/{course_id}", response_model=CourseRead)
async def update_course_endpoint(
    course_id: str,
    payload: CourseUpdate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR)),
) -> CourseRead:
    course = await courses.get(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    course = await courses.update(session, course, payload)
    return CourseRead.model_validate(course)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_endpoint(
    course_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    course = await courses.get(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    await courses.delete(session, course)
