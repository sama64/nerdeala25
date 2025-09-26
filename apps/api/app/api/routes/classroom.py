from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db
from app.core.config import settings
from app.models.course_membership import ClassroomMemberRole
from app.models.course_participant import ParticipantRole
from app.models.user import User, UserRole
from app.repositories import (
    course_assignments as assignments_repo,
    course_participants as participants_repo,
    course_memberships as memberships_repo,
    course_submissions as submissions_repo,
    courses as courses_repo,
    users as users_repo,
)
from app.schemas.classroom import (
    ClassroomParticipantRole,
    CourseAssignmentRead,
    CourseParticipantRead,
    CourseSubmissionRead,
)
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate
from app.schemas.user import UserUpdate
from app.services.google_classroom import ClassroomIntegrationError, google_classroom_service
from app.services.google_oauth import GoogleOAuthError, ensure_google_access_token
from app.services.google_sync import sync_delta_courses, sync_full_metadata

router = APIRouter(prefix="/classroom", tags=["classroom"])

logger = logging.getLogger("nerdeala.api.classroom")


@router.get("/courses", response_model=dict)
async def fetch_classroom_courses(
    token: str = Header(default="", alias="X-Goog-Access-Token"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    token = await _resolve_google_token(token, session, current_user)

    try:
        courses = await google_classroom_service.fetch_courses(token)
    except ClassroomIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return {"items": [course.__dict__ for course in courses]}


@router.post("/sync", response_model=dict)
async def sync_classroom_courses(
    token: str = Header(default="", alias="X-Goog-Access-Token"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    token = await _resolve_google_token(token, session, current_user)

    try:
        classroom_courses = await google_classroom_service.fetch_courses(token)
    except ClassroomIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    synced: list[CourseRead] = []
    desired_membership_course_ids: set[str] = set()
    existing_memberships = await memberships_repo.list_for_user(session, current_user.id)

    teaches_any = False
    participants_payload: dict[str, list[dict[str, object]]] = {}
    assignments_payload: dict[str, list[dict[str, object]]] = {}
    submissions_payload: dict[str, list[dict[str, object]]] = {}

    for classroom_course in classroom_courses:
        course_participants_out = participants_payload.setdefault(classroom_course.id, [])
        course_assignments_out = assignments_payload.setdefault(classroom_course.id, [])
        course_submissions_out = submissions_payload.setdefault(classroom_course.id, [])
        existing = await courses_repo.get(session, classroom_course.id)
        teacher_id = existing.teacher_id if existing else None

        if classroom_course.is_teacher:
            teaches_any = True
            teacher_id = current_user.id
        elif existing and existing.teacher_id == current_user.id:
            teacher_id = None

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

        membership_role: ClassroomMemberRole | None = None
        if classroom_course.is_teacher:
            membership_role = ClassroomMemberRole.TEACHER
        elif classroom_course.is_student:
            membership_role = ClassroomMemberRole.STUDENT

        if membership_role:
            desired_membership_course_ids.add(classroom_course.id)
            await memberships_repo.upsert(
                session,
                course_id=classroom_course.id,
                user_id=current_user.id,
                role=membership_role,
            )

        participants = await google_classroom_service.fetch_participants(token, classroom_course.id)
        existing_participants = await participants_repo.list_for_course(session, classroom_course.id)
        seen_participant_ids: set[str] = set()
        participant_match_index: dict[str, str | None] = {}

        for participant in participants:
            matched_user_id: str | None = None
            email_normalized = participant.email.lower() if participant.email else None

            if email_normalized:
                matched_user = await users_repo.get_by_email(session, email_normalized)
            else:
                matched_user = None

            if not matched_user and participant.full_name:
                matched_user = await users_repo.get_by_name(session, participant.full_name)

            if matched_user:
                matched_user_id = matched_user.id

            role = (
                ParticipantRole.TEACHER
                if participant.role == "teacher"
                else ParticipantRole.STUDENT
            )

            record = await participants_repo.upsert(
                session,
                course_id=classroom_course.id,
                google_user_id=participant.google_user_id,
                email=participant.email,
                full_name=participant.full_name,
                photo_url=participant.photo_url,
                role=role,
                matched_user_id=matched_user_id,
            )
            seen_participant_ids.add(record.google_user_id)
            participant_match_index[record.google_user_id] = record.matched_user_id
            course_participants_out.append(
                {
                    "google_user_id": record.google_user_id,
                    "email": record.email,
                    "full_name": record.full_name,
                    "photo_url": record.photo_url,
                    "role": record.role.value,
                    "matched_user_id": record.matched_user_id,
                }
            )

        for participant in existing_participants:
            if participant.google_user_id not in seen_participant_ids:
                await participants_repo.delete(session, participant)

        assignments = await google_classroom_service.fetch_assignments(token, classroom_course.id)
        existing_assignments = await assignments_repo.list_for_course(session, classroom_course.id)
        seen_assignment_ids: set[str] = set()

        for assignment in assignments:
            record = await assignments_repo.upsert(
                session,
                assignment_id=assignment.coursework_id,
                course_id=assignment.course_id,
                title=assignment.title,
                description=assignment.description,
                work_type=assignment.work_type,
                state=assignment.state,
                due_at=assignment.due_at,
                alternate_link=assignment.alternate_link,
                max_points=assignment.max_points,
                created_time=assignment.created_time,
                updated_time=assignment.updated_time,
                assignee_mode=assignment.assignee_mode,
                assignee_user_ids=assignment.assignee_user_ids,
            )
            seen_assignment_ids.add(record.id)
            course_assignments_out.append(
                CourseAssignmentRead(
                    id=record.id,
                    course_id=record.course_id,
                    title=record.title,
                    description=record.description,
                    work_type=record.work_type,
                    state=record.state,
                    due_at=record.due_at,
                    alternate_link=record.alternate_link,
                    max_points=record.max_points,
                    created_time=record.created_time,
                    updated_time=record.updated_time,
                    assignee_mode=record.assignee_mode,
                    assignee_user_ids=json.loads(record.assignee_user_ids)
                    if record.assignee_user_ids
                    else None,
                ).model_dump()
            )

        for assignment in existing_assignments:
            if assignment.id not in seen_assignment_ids:
                await assignments_repo.delete(session, assignment)

        submissions = await google_classroom_service.fetch_submissions(token, classroom_course.id)
        existing_submissions = await submissions_repo.list_for_course(session, classroom_course.id)
        seen_submission_ids: set[str] = set()

        for submission in submissions:
            matched_user_id = participant_match_index.get(submission.google_user_id)
            record = await submissions_repo.upsert(
                session,
                submission_id=submission.submission_id,
                course_id=submission.course_id,
                coursework_id=submission.coursework_id,
                google_user_id=submission.google_user_id,
                matched_user_id=matched_user_id,
                state=submission.state,
                late=submission.late,
                turned_in_at=submission.turned_in_at,
                assigned_grade=submission.assigned_grade,
                draft_grade=submission.draft_grade,
                attachments=submission.attachments,
                updated_time=submission.updated_time,
            )
            seen_submission_ids.add(record.id)
            course_submissions_out.append(
                CourseSubmissionRead(
                    id=record.id,
                    course_id=record.course_id,
                    coursework_id=record.coursework_id,
                    google_user_id=record.google_user_id,
                    matched_user_id=record.matched_user_id,
                    state=record.state,
                    late=record.late,
                    turned_in_at=record.turned_in_at,
                    assigned_grade=record.assigned_grade,
                    draft_grade=record.draft_grade,
                    attachments=json.loads(record.attachments)
                    if record.attachments
                    else None,
                    updated_time=record.updated_time,
                ).model_dump()
            )

        for submission in existing_submissions:
            if submission.id not in seen_submission_ids:
                await submissions_repo.delete(session, submission)

    for membership in existing_memberships:
        if membership.course_id not in desired_membership_course_ids:
            await memberships_repo.delete(session, membership)

    await session.commit()

    if current_user.role not in {UserRole.ADMIN, UserRole.COORDINATOR}:
        desired_role = UserRole.TEACHER if teaches_any else UserRole.STUDENT
        if current_user.role != desired_role:
            await users_repo.update(session, current_user, UserUpdate(role=desired_role))

    return {
        "items": [course.model_dump() for course in synced],
        "count": len(synced),
        "participants": participants_payload,
        "assignments": assignments_payload,
        "submissions": submissions_payload,
    }


@router.post("/sync/delta", response_model=dict)
async def trigger_delta_sync(
    token: str = Header(default="", alias="X-Goog-Access-Token"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    token = await _resolve_google_token(token, session, current_user)

    try:
        result = await sync_delta_courses(token)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("No se pudo ejecutar el delta sync")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo ejecutar el delta sync",
        ) from exc

    return {"status": "ok", "result": result}


@router.post("/sync/full", response_model=dict)
async def trigger_full_sync(
    token: str = Header(default="", alias="X-Goog-Access-Token"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    token = await _resolve_google_token(token, session, current_user)

    try:
        result = await sync_full_metadata(token)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("No se pudo ejecutar el full sync")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo ejecutar el full sync",
        ) from exc

    return {"status": "ok", "result": result}


@router.get("/{course_id}/participants", response_model=dict)
async def list_course_participants(
    course_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    course = await courses_repo.get(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    if current_user.role not in {UserRole.ADMIN, UserRole.COORDINATOR}:
        if current_user.role == UserRole.TEACHER:
            membership = await memberships_repo.get(session, course_id, current_user.id)
            if not membership or membership.role != ClassroomMemberRole.TEACHER:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    participants = await participants_repo.list_for_course(session, course_id)

    items = [
        CourseParticipantRead(
            google_user_id=participant.google_user_id,
            email=participant.email,
            full_name=participant.full_name,
            photo_url=participant.photo_url,
            role=ClassroomParticipantRole(participant.role.value),
            matched_user_id=participant.matched_user_id,
            last_seen_at=participant.last_seen_at,
        ).model_dump()
        for participant in participants
    ]

    return {"items": items, "count": len(items)}


@router.get("/{course_id}/assignments", response_model=dict)
async def list_course_assignments(
    course_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    course = await courses_repo.get(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    if current_user.role not in {UserRole.ADMIN, UserRole.COORDINATOR}:
        if current_user.role == UserRole.TEACHER:
            membership = await memberships_repo.get(session, course_id, current_user.id)
            if not membership or membership.role != ClassroomMemberRole.TEACHER:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    assignments = await assignments_repo.list_for_course(session, course_id)
    items = [CourseAssignmentRead.model_validate(a).model_dump() for a in assignments]

    return {"items": items, "count": len(items)}


@router.get("/{course_id}/submissions", response_model=dict)
async def list_course_submissions(
    course_id: str,
    coursework_id: str | None = Query(default=None),
    student_google_id: str | None = Query(default=None, alias="google_user_id"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    course = await courses_repo.get(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")

    if current_user.role not in {UserRole.ADMIN, UserRole.COORDINATOR}:
        if current_user.role == UserRole.TEACHER:
            membership = await memberships_repo.get(session, course_id, current_user.id)
            if not membership or membership.role != ClassroomMemberRole.TEACHER:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    submissions = await submissions_repo.list_for_course(session, course_id)
    filtered = []
    for submission in submissions:
        if coursework_id and submission.coursework_id != coursework_id:
            continue
        if student_google_id and submission.google_user_id != student_google_id:
            continue
        filtered.append(submission)

    items = [CourseSubmissionRead.model_validate(s).model_dump() for s in filtered]
    return {"items": items, "count": len(items)}


async def _resolve_google_token(
    header_token: str, session: AsyncSession, current_user: User
) -> str:
    if header_token:
        return header_token

    try:
        return await ensure_google_access_token(session, current_user.id)
    except GoogleOAuthError as exc:
        if settings.classroom_service_account_file is None:
            return "demo"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
