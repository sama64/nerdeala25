from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.core.config import settings
from app.models.user import User, UserRole
from app.repositories import courses as courses_repo
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate
from app.services.google_classroom import ClassroomIntegrationError, google_classroom_service

router = APIRouter(prefix="/classroom", tags=["classroom"])


@router.get("/courses", response_model=dict)
async def fetch_classroom_courses(
    token: str = Header(default="", alias="X-Goog-Access-Token"),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> dict:
    if not token and settings.classroom_service_account_file is None:
        # In demo mode the token is optional.
        token = "demo"

    try:
        courses = await google_classroom_service.fetch_courses(token)
    except ClassroomIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return {"items": [course.__dict__ for course in courses]}


@router.post("/sync", response_model=dict)
async def sync_classroom_courses(
    token: str = Header(default="", alias="X-Goog-Access-Token"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> dict:
    if not token and settings.classroom_service_account_file is None:
        token = "demo"

    try:
        classroom_courses = await google_classroom_service.fetch_courses(token)
    except ClassroomIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    synced: list[CourseRead] = []
    for classroom_course in classroom_courses:
        existing = await courses_repo.get(session, classroom_course.id)
        teacher_id = (
            existing.teacher_id
            if existing and existing.teacher_id
            else (current_user.id if current_user.role == UserRole.TEACHER else None)
        )
        if existing:
            updated = await courses_repo.update(
                session,
                existing,
                CourseUpdate(
                    name=classroom_course.name,
                    description=f"Curso sincronizado desde Classroom por {current_user.name}",
                    teacher_id=teacher_id,
                ),
            )
            synced.append(CourseRead.model_validate(updated))
        else:
            created = await courses_repo.create(
                session,
                CourseCreate(
                    id=classroom_course.id,
                    name=classroom_course.name,
                    description=f"Curso sincronizado desde Classroom por {current_user.name}",
                    teacher_id=teacher_id,
                ),
            )
            synced.append(CourseRead.model_validate(created))

    return {"items": [course.model_dump() for course in synced], "count": len(synced)}
