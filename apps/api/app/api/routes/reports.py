from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.models.user import User, UserRole
from app.repositories import reports as reports_repo
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/", response_model=dict)
async def list_reports_endpoint(
    student_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    if current_user.role == UserRole.STUDENT:
        student_profile = getattr(current_user, "student_profile", None)
        if student_profile is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado")
        student_id = student_profile.id

    skip = (page - 1) * size
    items = await reports_repo.list_reports(session, student_id=student_id, skip=skip, limit=size)
    return {
        "items": [ReportRead.model_validate(item).model_dump() for item in items],
        "page": page,
        "size": size,
    }


@router.post("/", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report_endpoint(
    payload: ReportCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> ReportRead:
    report = await reports_repo.create(session, payload)
    return ReportRead.model_validate(report)


@router.get("/{report_id}", response_model=ReportRead)
async def retrieve_report(
    report_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> ReportRead:
    report = await reports_repo.get(session, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    if current_user.role == UserRole.STUDENT:
        student_profile = getattr(current_user, "student_profile", None)
        if not student_profile or student_profile.id != report.student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    return ReportRead.model_validate(report)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report_endpoint(
    report_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR)),
) -> Response:
    report = await reports_repo.get(session, report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    await reports_repo.delete(session, report)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
