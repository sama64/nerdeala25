from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.course import Course
from app.models.course_participant import ParticipantRole
from app.repositories import course_assignments as assignments_repo
from app.repositories import course_participants as participants_repo
from app.repositories import course_submissions as submissions_repo
from app.repositories import courses as courses_repo
from app.repositories import etag_cache as etag_repo
from app.repositories import user_contacts as user_contacts_repo
from app.repositories import users as users_repo
from app.services.google_classroom import (
    _extract_email,
    _extract_full_name,
    _extract_photo_url,
    _extract_submission_attachments,
    _extract_turned_in_at,
    _parse_datetime,
    _parse_due_datetime,
)
from app.services.notifications.base import Notifier
from app.services.notifications.http_wa import get_notifier

logger = logging.getLogger("nerdeala.classroom.sync")

SEM = asyncio.Semaphore(12)
GOOGLE_TIMEOUT_SECONDS = 20.0
CLASSROOM_BASE_URL = "https://classroom.googleapis.com/v1"


class ClassroomSyncResult(dict):
    """Simple dict-based result for sync endpoints."""


def _headers(token: str, etag: str | None = None) -> dict[str, str]:
    headers = {
        "authorization": f"Bearer {token}",
        "accept": "application/json",
        "accept-encoding": "gzip",
    }
    if etag:
        headers["if-none-match"] = etag
    return headers


async def _get(
    client: httpx.AsyncClient,
    url: str,
    token: str,
    *,
    params: dict[str, Any] | None = None,
    etag: str | None = None,
) -> dict[str, Any | None]:
    async with SEM:
        response = await client.get(
            url,
            params=params,
            headers=_headers(token, etag),
            timeout=GOOGLE_TIMEOUT_SECONDS,
        )
    if response.status_code == httpx.codes.NOT_MODIFIED:
        return {"not_modified": True, "etag": etag, "data": None}
    if response.status_code >= 400:
        _log_http_error(url, response)
    response.raise_for_status()
    data: Any | None
    try:
        data = response.json()
    except ValueError:
        data = None
    return {
        "not_modified": False,
        "etag": response.headers.get("etag"),
        "data": data,
    }


def _log_http_error(url: str, response: httpx.Response) -> None:
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    logger.warning(
        "Classroom request failed %s %s -> %s",
        response.status_code,
        url,
        payload,
    )


async def list_active_courses(client: httpx.AsyncClient, token: str) -> list[dict[str, Any]]:
    teacher_courses = await _list_courses_by_role(client, token, {"teacherId": "me"})
    student_courses = await _list_courses_by_role(client, token, {"studentId": "me"})
    courses: dict[str, dict[str, Any]] = {}
    for course in teacher_courses + student_courses:
        course_id = course.get("id")
        if not isinstance(course_id, str):
            continue
        courses[course_id] = course
    return list(courses.values())


async def _list_courses_by_role(
    client: httpx.AsyncClient, token: str, extra: dict[str, Any]
) -> list[dict[str, Any]]:
    params = {"courseStates": "ACTIVE", "pageSize": 200, **extra}
    url = f"{CLASSROOM_BASE_URL}/courses"
    items: list[dict[str, Any]] = []
    page_token: str | None = None
    while True:
        query = params.copy()
        if page_token:
            query["pageToken"] = page_token
        payload = await _get(client, url, token, params=query)
        data = payload.get("data")
        if isinstance(data, dict):
            courses = data.get("courses")
            if isinstance(courses, list):
                items.extend(item for item in courses if isinstance(item, dict))
            page_token = data.get("nextPageToken") if isinstance(data.get("nextPageToken"), str) else None
        else:
            page_token = None
        if not page_token:
            break
    return items


async def sync_delta_courses(token: str) -> ClassroomSyncResult:
    notifier = get_notifier()
    summary: ClassroomSyncResult = ClassroomSyncResult(processed=0, courses=[])

    async with httpx.AsyncClient(http2=True) as client:
        courses = await list_active_courses(client, token)
        async with AsyncSessionLocal() as session:
            for course in courses:
                course_id = course.get("id")
                if not isinstance(course_id, str):
                    continue
                await _ensure_course_record(session, course)
                try:
                    updates = await _sync_course_submissions(
                        session, client, token, course_id, notifier
                    )
                    if updates > 0:
                        summary["courses"].append({"course_id": course_id, "updates": updates})
                        summary["processed"] += updates
                    await session.commit()
                except Exception:  # pragma: no cover - defensive logging
                    logger.exception("Error processing delta sync for course %s", course_id)
                    await session.rollback()
    return summary


async def sync_full_metadata(token: str) -> ClassroomSyncResult:
    summary: ClassroomSyncResult = ClassroomSyncResult(courses=0, participants=0, assignments=0)

    async with httpx.AsyncClient(http2=True) as client:
        courses = await list_active_courses(client, token)
        async with AsyncSessionLocal() as session:
            for course in courses:
                course_id = course.get("id")
                if not isinstance(course_id, str):
                    continue
                await _ensure_course_record(session, course)
                try:
                    participants_processed = await _sync_course_participants(
                        session, client, token, course_id
                    )
                    assignments_processed = await _sync_course_assignments(
                        session, client, token, course_id
                    )
                    summary["courses"] += 1
                    summary["participants"] += participants_processed
                    summary["assignments"] += assignments_processed
                    await session.commit()
                except Exception:  # pragma: no cover - defensive logging
                    logger.exception("Error processing full sync for course %s", course_id)
                    await session.rollback()
    return summary


async def _ensure_course_record(session: AsyncSession, payload: dict[str, Any]) -> None:
    course_id = payload.get("id")
    if not isinstance(course_id, str):
        return
    name = payload.get("name")
    name_value = name if isinstance(name, str) else "Curso Classroom"
    existing = await courses_repo.get(session, course_id)
    if existing:
        existing.name = name_value
        existing.description = existing.description or "Curso sincronizado desde Google Classroom"
    else:
        course = Course(
            id=course_id,
            name=name_value,
            description="Curso sincronizado desde Google Classroom",
        )
        session.add(course)
    await session.flush()


async def _sync_course_participants(
    session: AsyncSession,
    client: httpx.AsyncClient,
    token: str,
    course_id: str,
) -> int:
    total_updated = 0
    seen_ids: set[str] = set()

    students = await _fetch_collection(
        session,
        client,
        token,
        course_id,
        "students",
        f"{CLASSROOM_BASE_URL}/courses/{course_id}/students",
        root_key="students",
        params={
            "pageSize": 200,
            "fields": "students(userId,profile(emailAddress,photoUrl,name(fullName,givenName,familyName))),nextPageToken",
        },
    )
    if students is not None:
        total_updated += await _process_participant_entries(
            session, students, course_id, ParticipantRole.STUDENT, seen_ids
        )

    teachers = await _fetch_collection(
        session,
        client,
        token,
        course_id,
        "teachers",
        f"{CLASSROOM_BASE_URL}/courses/{course_id}/teachers",
        root_key="teachers",
        params={
            "pageSize": 200,
            "fields": "teachers(userId,profile(emailAddress,photoUrl,name(fullName,givenName,familyName))),nextPageToken",
        },
    )
    if teachers is not None:
        total_updated += await _process_participant_entries(
            session, teachers, course_id, ParticipantRole.TEACHER, seen_ids
        )

    if students is not None or teachers is not None:
        existing_participants = await participants_repo.list_for_course(session, course_id)
        for participant in existing_participants:
            if participant.google_user_id not in seen_ids:
                await participants_repo.delete(session, participant)
    return total_updated


async def _process_participant_entries(
    session: AsyncSession,
    entries: Iterable[dict[str, Any]],
    course_id: str,
    role: ParticipantRole,
    seen_ids: set[str],
) -> int:
    processed = 0
    for entry in entries:
        google_user_id = entry.get("userId")
        if not isinstance(google_user_id, str):
            continue
        email = _extract_email(entry)
        full_name = _extract_full_name(entry)
        photo_url = _extract_photo_url(entry)

        matched_user_id = await _resolve_matched_user(session, email, full_name)
        record = await participants_repo.upsert(
            session,
            course_id=course_id,
            google_user_id=google_user_id,
            email=email,
            full_name=full_name,
            photo_url=photo_url,
            role=role,
            matched_user_id=matched_user_id,
        )
        if matched_user_id:
            await user_contacts_repo.upsert(
                session,
                user_id=matched_user_id,
                email=email,
            )
        seen_ids.add(record.google_user_id)
        processed += 1
    return processed


async def _resolve_matched_user(
    session: AsyncSession, email: str | None, full_name: str | None
) -> str | None:
    if email:
        user = await users_repo.get_by_email(session, email.lower())
        if user:
            return user.id
    if full_name:
        user = await users_repo.get_by_name(session, full_name)
        if user:
            return user.id
    return None


async def _sync_course_assignments(
    session: AsyncSession,
    client: httpx.AsyncClient,
    token: str,
    course_id: str,
) -> int:
    courseworks = await _fetch_collection(
        session,
        client,
        token,
        course_id,
        "coursework",
        f"{CLASSROOM_BASE_URL}/courses/{course_id}/courseWork",
        root_key="courseWork",
        params={
            "pageSize": 200,
            "fields": "courseWork(id,title,description,workType,state,dueDate,dueTime,alternateLink,maxPoints,creationTime,updateTime,assigneeMode,individualStudentsOptions/studentIds),nextPageToken",
        },
    )
    if courseworks is None:
        return 0

    existing_assignments = await assignments_repo.list_for_course(session, course_id)
    seen_ids: set[str] = set()
    processed = 0

    for coursework in courseworks:
        parsed = _parse_coursework(coursework, course_id)
        if parsed is None:
            continue
        
        # Check if this is a new assignment
        existing_assignment = await assignments_repo.get(session, parsed["assignment_id"])
        is_new_assignment = existing_assignment is None
        
        record = await assignments_repo.upsert(session, **parsed)
        seen_ids.add(record.id)
        processed += 1
        
        # Send notification for new assignment
        if is_new_assignment:
            await _notify_new_assignment(session, record)
            logger.info(
                "new_assignment.detected course=%s assignment=%s title=%s",
                course_id,
                record.id,
                record.title,
            )

    for assignment in existing_assignments:
        if assignment.id not in seen_ids:
            await assignments_repo.delete(session, assignment)

    return processed


def _parse_coursework(payload: dict[str, Any], course_id: str) -> dict[str, Any] | None:
    coursework_id = payload.get("id")
    title = payload.get("title")
    if not isinstance(coursework_id, str) or not isinstance(title, str):
        return None

    description = payload.get("description") if isinstance(payload.get("description"), str) else None
    work_type = payload.get("workType") if isinstance(payload.get("workType"), str) else None
    state = payload.get("state") if isinstance(payload.get("state"), str) else None
    due_at = _parse_due_datetime(payload.get("dueDate"), payload.get("dueTime"))
    alternate_link = payload.get("alternateLink") if isinstance(payload.get("alternateLink"), str) else None
    max_points = _safe_float(payload.get("maxPoints"))
    created_time = _parse_datetime(payload.get("creationTime"))
    updated_time = _parse_datetime(payload.get("updateTime"))
    assignee_mode = payload.get("assigneeMode") if isinstance(payload.get("assigneeMode"), str) else None

    assignee_user_ids: list[str] | None = None
    options = payload.get("individualStudentsOptions")
    if isinstance(options, dict):
        ids = options.get("studentIds")
        if isinstance(ids, list):
            assignee_user_ids = [str(item) for item in ids if isinstance(item, (str, int))]
    if assignee_mode == "ALL_STUDENTS":
        assignee_user_ids = []

    return {
        "assignment_id": coursework_id,
        "course_id": course_id,
        "title": title,
        "description": description,
        "work_type": work_type,
        "state": state,
        "due_at": due_at,
        "alternate_link": alternate_link,
        "max_points": max_points,
        "created_time": created_time,
        "updated_time": updated_time,
        "assignee_mode": assignee_mode,
        "assignee_user_ids": assignee_user_ids,
    }


async def _sync_course_submissions(
    session: AsyncSession,
    client: httpx.AsyncClient,
    token: str,
    course_id: str,
    notifier: Notifier,
) -> int:
    submissions_payload = await _fetch_collection(
        session,
        client,
        token,
        course_id,
        "subs",
        f"{CLASSROOM_BASE_URL}/courses/{course_id}/courseWork/-/studentSubmissions",
        root_key="studentSubmissions",
        params={
            "pageSize": 200,
            "fields": "studentSubmissions(id,courseWorkId,userId,state,late,updateTime,assignedGrade,draftGrade,submissionHistory,assignmentSubmission(attachments)),nextPageToken",
        },
    )
    if submissions_payload is None:
        return 0

    participants = await participants_repo.list_for_course(session, course_id)
    match_map = {p.google_user_id: p.matched_user_id for p in participants}
    email_map = {p.google_user_id: p.email for p in participants}
    matched_user_ids = [mid for mid in match_map.values() if mid]
    phone_map = await user_contacts_repo.get_phone_map(session, matched_user_ids)

    updates = 0
    for entry in submissions_payload:
        parsed = _parse_submission(entry, course_id)
        if parsed is None:
            continue
        submission_id = parsed.pop("submission_id")
        google_user_id = parsed.get("google_user_id")
        matched_user_id = match_map.get(google_user_id)
        prev = await submissions_repo.get(session, submission_id)
        record = await submissions_repo.upsert(
            session,
            submission_id=submission_id,
            matched_user_id=matched_user_id,
            **parsed,
        )
        if matched_user_id and matched_user_id not in phone_map:
            await user_contacts_repo.upsert(
                session,
                user_id=matched_user_id,
                email=email_map.get(google_user_id),
            )
            phone_map = await user_contacts_repo.get_phone_map(session, matched_user_ids)
        if prev and _submission_changed(prev, record):
            updates += 1
            await _handle_submission_notification(
                notifier,
                record,
                prev,
                phone_map,
                email_map,
            )
            logger.info(
                "submission.status_changed course=%s submission=%s state=%s late=%s",
                course_id,
                record.id,
                record.state,
                record.late,
            )
    return updates


def _parse_submission(payload: dict[str, Any], course_id: str) -> dict[str, Any] | None:
    submission_id = payload.get("id")
    coursework_id = payload.get("courseWorkId")
    user_id = payload.get("userId")
    if not all(isinstance(value, str) for value in (submission_id, coursework_id, user_id)):
        return None

    state = payload.get("state") if isinstance(payload.get("state"), str) else None
    late = bool(payload.get("late")) if payload.get("late") is not None else False
    assigned_grade = _safe_float(payload.get("assignedGrade"))
    draft_grade = _safe_float(payload.get("draftGrade"))
    updated_time = _parse_datetime(payload.get("updateTime"))
    turned_in_at = _extract_turned_in_at(payload)
    attachments = _extract_submission_attachments(payload)

    return {
        "submission_id": submission_id,
        "course_id": course_id,
        "coursework_id": coursework_id,
        "google_user_id": user_id,
        "state": state,
        "late": late,
        "turned_in_at": turned_in_at,
        "assigned_grade": assigned_grade,
        "draft_grade": draft_grade,
        "attachments": attachments,
        "updated_time": updated_time,
    }


def _submission_changed(prev, current) -> bool:
    return bool((prev.state or "") != (current.state or "") or bool(prev.late) != bool(current.late))


async def _handle_submission_notification(
    notifier: Notifier,
    record,
    previous,
    phone_map: dict[str, str],
    email_map: dict[str, str | None],
) -> None:
    matched_user_id = record.matched_user_id
    phone = phone_map.get(matched_user_id) if matched_user_id else None
    email = email_map.get(record.google_user_id)

    if record.late and not previous.late:
        message = (
            "Tenés una entrega atrasada en Classroom. Revisá la tarea "
            f"{record.coursework_id} y regularizala desde el panel."
        )
        await _deliver_notification(notifier, phone, email, message)
    elif (previous.state or "").upper() != "RETURNED" and (record.state or "").upper() == "RETURNED":
        message = (
            f"Tu tarea fue devuelta con feedback en Classroom ({record.coursework_id})."
        )
        await _deliver_notification(notifier, phone, email, message)


async def _notify_new_assignment(session: AsyncSession, assignment) -> None:
    """Send WhatsApp notification to all students when a new assignment is created"""
    notifier = get_notifier()
    
    # Get all participants in the course
    all_participants = await participants_repo.list_for_course(session, assignment.course_id)
    # Filter only students
    participants = [p for p in all_participants if p.role == ParticipantRole.STUDENT]
    
    # Get phone numbers for matched users
    matched_user_ids = [p.matched_user_id for p in participants if p.matched_user_id]
    if not matched_user_ids:
        logger.info("No matched students found for assignment notification")
        return
        
    phone_map = await user_contacts_repo.get_phone_map(session, matched_user_ids)
    
    # Create message
    due_text = ""
    if assignment.due_at:
        due_date = assignment.due_at.strftime('%d/%m/%Y a las %H:%M')
        due_text = f"\n📅 Vencimiento: {due_date}"
    
    points_text = ""
    if assignment.max_points:
        points_text = f"\n🏆 Puntos: {assignment.max_points}"
    
    message = (
        f"📚 *Nueva tarea en Classroom*\n\n"
        f"📝 {assignment.title}"
        f"{due_text}"
        f"{points_text}\n\n"
        f"👀 Revisá los detalles en tu panel de Scholaris o directamente en Google Classroom.\n\n"
        f"¡No te olvides de entregar a tiempo! 🚀"
    )
    
    # Send to all students with phone numbers
    notifications_sent = 0
    for participant in participants:
        if participant.matched_user_id and participant.matched_user_id in phone_map:
            phone = phone_map[participant.matched_user_id]
            try:
                await notifier.send_message(phone, message)
                notifications_sent += 1
                logger.info("New assignment notification sent to %s", participant.email or "unknown")
            except Exception:
                logger.exception("Error sending new assignment notification to %s", phone)
        elif participant.email:
            logger.info("[email-fallback] new assignment notification -> %s", participant.email)
    
    logger.info("New assignment notifications sent: %d/%d students", notifications_sent, len(participants))


async def _deliver_notification(
    notifier: Notifier,
    phone: str | None,
    email: str | None,
    message: str,
) -> None:
    if phone:
        try:
            await notifier.send_message(phone, message)
            return
        except Exception:  # pragma: no cover - network path
            logger.exception("Error enviando notificación por WhatsApp a %s", phone)
    if email:
        logger.info("[email-fallback] %s -> %s", email, message)
    else:
        logger.info("[email-fallback] sin correo -> %s", message)


async def _fetch_collection(
    session: AsyncSession,
    client: httpx.AsyncClient,
    token: str,
    course_id: str,
    cache_key: str,
    url: str,
    *,
    root_key: str,
    params: dict[str, Any],
) -> list[dict[str, Any]] | None:
    params = params.copy()
    etag = await etag_repo.get(session, course_id, cache_key)
    payload = await _get(client, url, token, params=params, etag=etag)
    if payload["not_modified"]:
        return None

    data = payload.get("data")
    items: list[dict[str, Any]] = []
    if isinstance(data, dict):
        chunk = data.get(root_key)
        if isinstance(chunk, list):
            items.extend(item for item in chunk if isinstance(item, dict))
        next_page = data.get("nextPageToken") if isinstance(data.get("nextPageToken"), str) else None
    else:
        next_page = None

    while next_page:
        params["pageToken"] = next_page
        page_payload = await _get(client, url, token, params=params)
        page_data = page_payload.get("data")
        if isinstance(page_data, dict):
            chunk = page_data.get(root_key)
            if isinstance(chunk, list):
                items.extend(item for item in chunk if isinstance(item, dict))
            next_page = page_data.get("nextPageToken") if isinstance(page_data.get("nextPageToken"), str) else None
        else:
            next_page = None
        params.pop("pageToken", None)

    await etag_repo.set(session, course_id, cache_key, payload.get("etag"))
    return items


def _safe_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None
