from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import RetryError, retry, stop_after_attempt, wait_exponential

from app.core.config import settings


@dataclass(slots=True)
class ClassroomCourse:
    id: str
    name: str
    section: str | None = None
    room: str | None = None
    alternate_link: str | None = None
    is_teacher: bool = False
    is_student: bool = False


@dataclass(slots=True)
class ClassroomParticipant:
    course_id: str
    google_user_id: str
    email: str | None
    full_name: str | None
    photo_url: str | None
    role: str


@dataclass(slots=True)
class ClassroomAssignment:
    course_id: str
    coursework_id: str
    title: str
    description: str | None = None
    work_type: str | None = None
    state: str | None = None
    due_at: datetime | None = None
    alternate_link: str | None = None
    max_points: float | None = None
    created_time: datetime | None = None
    updated_time: datetime | None = None
    assignee_mode: str | None = None
    assignee_user_ids: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ClassroomSubmission:
    submission_id: str
    course_id: str
    coursework_id: str
    google_user_id: str
    state: str | None = None
    late: bool = False
    turned_in_at: datetime | None = None
    assigned_grade: float | None = None
    draft_grade: float | None = None
    attachments: list[dict[str, Any]] = field(default_factory=list)
    updated_time: datetime | None = None


class ClassroomIntegrationError(RuntimeError):
    pass


class GoogleClassroomService:
    def __init__(self, base_url: str | None = None) -> None:
        self._base_url = base_url or settings.classroom_api_base_url

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(3))
    async def _request(
        self, method: str, endpoint: str, token: str, **kwargs: Any
    ) -> Any:
        if token in {"demo", "demo-token"}:
            # Demo mode: return fixture data without making network calls.
            return self._demo_response(endpoint, **kwargs)

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self._base_url}{endpoint}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
                **kwargs,
            )
        response.raise_for_status()
        return response.json()

    async def fetch_courses(self, token: str) -> list[ClassroomCourse]:
        try:
            all_courses = await self._list_courses(token)
            teacher_courses = await self._list_courses(token, params={"teacherId": "me"})
            student_courses = await self._list_courses(token, params={"studentId": "me"})
        except RetryError as exc:  # pragma: no cover - network path
            raise ClassroomIntegrationError(
                "No se pudo sincronizar cursos de Classroom"
            ) from exc

        teacher_ids = {course.get("id") for course in teacher_courses if course.get("id")}
        student_ids = {course.get("id") for course in student_courses if course.get("id")}

        courses: dict[str, ClassroomCourse] = {}
        for course in all_courses:
            course_id = course.get("id")
            name = course.get("name")
            if not course_id or not name:
                continue
            courses[course_id] = ClassroomCourse(
                id=course_id,
                name=name,
                section=course.get("section"),
                room=course.get("room"),
                alternate_link=course.get("alternateLink"),
                is_teacher=course_id in teacher_ids,
                is_student=course_id in student_ids,
            )

        for course in teacher_courses + [c for c in student_courses if c.get("id") not in courses]:
            course_id = course.get("id")
            name = course.get("name")
            if not course_id or not name:
                continue
            existing = courses.get(course_id)
            if existing:
                existing.is_teacher = existing.is_teacher or (course_id in teacher_ids)
                existing.is_student = existing.is_student or (course_id in student_ids)
                continue
            courses[course_id] = ClassroomCourse(
                id=course_id,
                name=name,
                section=course.get("section"),
                room=course.get("room"),
                alternate_link=course.get("alternateLink"),
                is_teacher=course_id in teacher_ids,
                is_student=course_id in student_ids,
            )

        return list(courses.values())

    async def fetch_participants(self, token: str, course_id: str) -> list[ClassroomParticipant]:
        try:
            teachers = await self._list_course_people(token, course_id, role="teachers")
            students = await self._list_course_people(token, course_id, role="students")
        except RetryError as exc:  # pragma: no cover - network path
            raise ClassroomIntegrationError(
                "No se pudo obtener la lista de participantes de Classroom"
            ) from exc

        participants: list[ClassroomParticipant] = []

        for teacher in teachers:
            participants.append(
                ClassroomParticipant(
                    course_id=course_id,
                    google_user_id=teacher.get("userId", ""),
                    email=_extract_email(teacher),
                    full_name=_extract_full_name(teacher),
                    photo_url=_extract_photo_url(teacher),
                    role="teacher",
                )
            )

        for student in students:
            participants.append(
                ClassroomParticipant(
                    course_id=course_id,
                    google_user_id=student.get("userId", ""),
                    email=_extract_email(student),
                    full_name=_extract_full_name(student),
                    photo_url=_extract_photo_url(student),
                    role="student",
                )
            )

        return [item for item in participants if item.google_user_id]

    async def fetch_assignments(self, token: str, course_id: str) -> list[ClassroomAssignment]:
        try:
            courseworks = await self._list_coursework(token, course_id)
        except RetryError as exc:  # pragma: no cover - network path
            raise ClassroomIntegrationError(
                "No se pudo obtener las tareas de Classroom"
            ) from exc

        assignments: list[ClassroomAssignment] = []
        for coursework in courseworks:
            coursework_id = coursework.get("id")
            title = coursework.get("title")
            if not coursework_id or not title:
                continue

            description = coursework.get("description")
            work_type = coursework.get("workType")
            state = coursework.get("state")
            alternate_link = coursework.get("alternateLink")
            max_points = coursework.get("maxPoints")
            created_time = _parse_datetime(coursework.get("creationTime"))
            updated_time = _parse_datetime(coursework.get("updateTime"))
            due_at = _parse_due_datetime(coursework.get("dueDate"), coursework.get("dueTime"))
            assignee_mode_raw = coursework.get("assigneeMode")
            assignee_mode = assignee_mode_raw if isinstance(assignee_mode_raw, str) else "ALL_STUDENTS"
            individual = coursework.get("individualStudentsOptions")
            assignee_user_ids: list[str] = []
            if isinstance(individual, dict):
                ids = individual.get("studentIds")
                if isinstance(ids, list):
                    assignee_user_ids = [str(item) for item in ids if isinstance(item, (str, int))]
            if assignee_mode == "ALL_STUDENTS":
                assignee_user_ids = []

            assignments.append(
                ClassroomAssignment(
                    course_id=course_id,
                    coursework_id=coursework_id,
                    title=title,
                    description=description if isinstance(description, str) else None,
                    work_type=work_type if isinstance(work_type, str) else None,
                    state=state if isinstance(state, str) else None,
                    due_at=due_at,
                    alternate_link=alternate_link if isinstance(alternate_link, str) else None,
                    max_points=float(max_points) if isinstance(max_points, (int, float)) else None,
                    created_time=created_time,
                    updated_time=updated_time,
                    assignee_mode=assignee_mode,
                    assignee_user_ids=assignee_user_ids,
                )
            )

        return assignments

    async def fetch_submissions(self, token: str, course_id: str) -> list[ClassroomSubmission]:
        try:
            submissions = await self._list_course_submissions(token, course_id)
        except RetryError as exc:  # pragma: no cover - network path
            raise ClassroomIntegrationError(
                "No se pudo obtener las entregas de Classroom"
            ) from exc

        parsed: list[ClassroomSubmission] = []
        for submission in submissions:
            submission_id = submission.get("id")
            coursework_id = submission.get("courseWorkId")
            user_id = submission.get("userId")
            if not submission_id or not coursework_id or not user_id:
                continue

            state = submission.get("state")
            late = bool(submission.get("late", False))
            assigned_grade = submission.get("assignedGrade")
            draft_grade = submission.get("draftGrade")
            updated_time = _parse_datetime(submission.get("updateTime"))
            turned_in_at = _extract_turned_in_at(submission)
            attachments = _extract_submission_attachments(submission)

            parsed.append(
                ClassroomSubmission(
                    submission_id=submission_id,
                    course_id=course_id,
                    coursework_id=coursework_id,
                    google_user_id=user_id,
                    state=state if isinstance(state, str) else None,
                    late=late,
                    turned_in_at=turned_in_at,
                    assigned_grade=float(assigned_grade)
                    if isinstance(assigned_grade, (int, float))
                    else None,
                    draft_grade=float(draft_grade)
                    if isinstance(draft_grade, (int, float))
                    else None,
                    attachments=attachments,
                    updated_time=updated_time,
                )
            )

        return parsed

    async def _list_courses(self, token: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        params = params.copy() if params else {}
        params.setdefault("courseStates", "ACTIVE")
        items: list[dict[str, Any]] = []
        page_token: str | None = None

        while True:
            if page_token:
                params["pageToken"] = page_token
            payload = await self._request("GET", "/courses", token, params=params)
            courses_data = payload.get("courses") if isinstance(payload, dict) else None
            if isinstance(courses_data, list):
                items.extend(courses_data)
            page_token = payload.get("nextPageToken") if isinstance(payload, dict) else None
            if not page_token:
                break

        return items

    async def _list_course_people(
        self, token: str, course_id: str, *, role: str
    ) -> list[dict[str, Any]]:
        endpoint = f"/courses/{course_id}/{role}"
        params: dict[str, Any] = {}
        if role == "teachers":
            params.setdefault(
                "fields",
                "teachers(userId,profile(emailAddress,photoUrl,name(fullName,givenName,familyName))),nextPageToken",
            )
        else:
            params.setdefault(
                "fields",
                "students(userId,profile(emailAddress,photoUrl,name(fullName,givenName,familyName))),nextPageToken",
            )
        items: list[dict[str, Any]] = []
        page_token: str | None = None

        while True:
            if page_token:
                params["pageToken"] = page_token
            payload = await self._request("GET", endpoint, token, params=params)
            key = role if role == "teachers" else "students"
            raw_items = payload.get(key) if isinstance(payload, dict) else None
            if isinstance(raw_items, list):
                items.extend(raw_items)
            page_token = payload.get("nextPageToken") if isinstance(payload, dict) else None
            if not page_token:
                break

        return items

    async def _list_coursework(self, token: str, course_id: str) -> list[dict[str, Any]]:
        endpoint = f"/courses/{course_id}/courseWork"
        params: dict[str, Any] | None = {
            "fields": "courseWork(id,title,description,workType,state,dueDate,dueTime,alternateLink,maxPoints,creationTime,updateTime,assigneeMode,individualStudentsOptions/studentIds),nextPageToken"
        }
        items: list[dict[str, Any]] = []
        page_token: str | None = None

        while True:
            query_params = (params.copy() if params else {})
            if page_token:
                query_params["pageToken"] = page_token
            try:
                payload = await self._request("GET", endpoint, token, params=query_params or None)
            except RetryError as exc:
                last = exc.last_attempt.exception()
                if isinstance(last, httpx.HTTPStatusError):
                    status = last.response.status_code
                    if status == 403:
                        return []
                    if status == 400 and params is not None:
                        # Retry without the custom fields projection.
                        params = None
                        page_token = None
                        items = []
                        continue
                raise
            courseworks = payload.get("courseWork") if isinstance(payload, dict) else None
            if isinstance(courseworks, list):
                items.extend(courseworks)
            page_token = payload.get("nextPageToken") if isinstance(payload, dict) else None
            if not page_token:
                break

        return items

    async def _list_course_submissions(
        self, token: str, course_id: str
    ) -> list[dict[str, Any]]:
        endpoint = f"/courses/{course_id}/courseWork/-/studentSubmissions"
        params: dict[str, Any] | None = {
            "fields": "studentSubmissions(id,courseWorkId,userId,state,late,updateTime,assignedGrade,draftGrade,submissionHistory,assignmentSubmission(attachments)),nextPageToken"
        }
        items: list[dict[str, Any]] = []
        page_token: str | None = None

        while True:
            query_params = (params.copy() if params else {})
            if page_token:
                query_params["pageToken"] = page_token
            try:
                payload = await self._request("GET", endpoint, token, params=query_params or None)
            except RetryError as exc:
                last = exc.last_attempt.exception()
                if isinstance(last, httpx.HTTPStatusError):
                    status = last.response.status_code
                    if status == 403:
                        return []
                    if status == 400 and params is not None:
                        params = None
                        page_token = None
                        items = []
                        continue
                raise
            submissions = payload.get("studentSubmissions") if isinstance(payload, dict) else None
            if isinstance(submissions, list):
                items.extend(submissions)
            page_token = payload.get("nextPageToken") if isinstance(payload, dict) else None
            if not page_token:
                break

        return items

    def _demo_response(self, endpoint: str, **kwargs: Any) -> dict[str, Any]:
        if endpoint == "/courses":
            params = kwargs.get("params") or {}
            teacher_id = params.get("teacherId")
            student_id = params.get("studentId")

            # Demo mode: pretend the user is docente en el primer curso y estudiante en el segundo
            courses = [
                {
                    "id": "demo-course-1",
                    "name": "Matemáticas Avanzadas",
                    "section": "A",
                    "room": "Lab 2",
                    "alternateLink": "https://classroom.google.com/demo-course-1",
                },
                {
                    "id": "demo-course-2",
                    "name": "Historia Universal",
                    "section": "B",
                    "room": "Sala 3",
                    "alternateLink": "https://classroom.google.com/demo-course-2",
                },
            ]

            if teacher_id == "me":
                return {"courses": [courses[0]]}
            if student_id == "me":
                return {"courses": [courses[1]]}
            return {
                "courses": courses
            }
        if endpoint.endswith("/teachers"):
            course_id = endpoint.split("/")[-2]
            return {
                "teachers": [
                    {
                        "userId": f"teacher-{course_id}",
                        "profile": {
                            "emailAddress": "teacher@example.com",
                            "name": {
                                "fullName": "Docente Demo",
                                "givenName": "Docente",
                                "familyName": "Demo",
                            },
                        },
                    }
                ]
            }
        if endpoint.endswith("/students"):
            course_id = endpoint.split("/")[-2]
            return {
                "students": [
                    {
                        "userId": f"student-{course_id}",
                        "profile": {
                            "emailAddress": "student@example.com",
                            "name": {
                                "fullName": "Estudiante Demo",
                                "givenName": "Estudiante",
                                "familyName": "Demo",
                            },
                        },
                    }
                ]
            }
        if endpoint.endswith("/courseWork"):
            course_id = endpoint.split("/")[-2]
            return {
                "courseWork": [
                    {
                        "id": f"cw-{course_id}-1",
                        "title": "Proyecto Final",
                        "description": "Entrega el proyecto final en PDF",
                        "workType": "ASSIGNMENT",
                        "state": "PUBLISHED",
                        "dueDate": {"year": 2025, "month": 10, "day": 1},
                        "dueTime": {"hours": 23, "minutes": 59},
                        "alternateLink": "https://classroom.google.com/demo-course-work",
                        "maxPoints": 100,
                        "creationTime": "2025-09-20T12:00:00Z",
                        "updateTime": "2025-09-21T12:00:00Z",
                    }
                ]
            }
        if endpoint.endswith("/studentSubmissions"):
            return {
                "studentSubmissions": [
                    {
                        "id": "ss-1",
                        "courseWorkId": "cw-{}-1".format(endpoint.split("/")[-3]),
                        "userId": "teacher-{}".format(endpoint.split("/")[-3]),
                        "state": "TURNED_IN",
                        "late": False,
                        "updateTime": "2025-09-22T15:30:00Z",
                        "assignedGrade": 95,
                        "draftGrade": None,
                        "submissionHistory": [
                            {
                                "stateHistory": {
                                    "state": "TURNED_IN",
                                    "stateTimestamp": "2025-09-22T15:00:00Z",
                                }
                            }
                        ],
                    }
                ]
            }
        return {}


google_classroom_service = GoogleClassroomService()


def _extract_email(person: dict[str, Any]) -> str | None:
    profile = person.get("profile") if isinstance(person, dict) else None
    if isinstance(profile, dict):
        email = profile.get("emailAddress")
        if isinstance(email, str):
            return email
    return None


def _extract_full_name(person: dict[str, Any]) -> str | None:
    profile = person.get("profile") if isinstance(person, dict) else None
    if isinstance(profile, dict):
        name = profile.get("name")
        if isinstance(name, dict):
            full_name = name.get("fullName")
            if isinstance(full_name, str) and full_name.strip():
                return full_name.strip()
            given = name.get("givenName")
            family = name.get("familyName")
            combined = " ".join(part for part in [given, family] if isinstance(part, str) and part.strip())
            return combined.strip() or None
    return None


def _extract_photo_url(person: dict[str, Any]) -> str | None:
    profile = person.get("profile") if isinstance(person, dict) else None
    if isinstance(profile, dict):
        photo_url = profile.get("photoUrl")
        if isinstance(photo_url, str) and photo_url.strip():
            return photo_url
    return None


def _parse_datetime(raw: Any) -> datetime | None:
    if isinstance(raw, str):
        try:
            if raw.endswith("Z"):
                return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
            return datetime.fromisoformat(raw)
        except ValueError:
            return None
    return None


def _parse_due_datetime(due_date: Any, due_time: Any) -> datetime | None:
    if not isinstance(due_date, dict):
        return None

    year = due_date.get("year")
    month = due_date.get("month")
    day = due_date.get("day")
    if not all(isinstance(value, int) for value in (year, month, day)):
        return None

    hours = minutes = seconds = 0
    if isinstance(due_time, dict):
        hours = due_time.get("hours") or 0
        minutes = due_time.get("minutes") or 0
        seconds = due_time.get("seconds") or 0

    try:
        return datetime(year, month, day, hours, minutes, seconds, tzinfo=timezone.utc)
    except ValueError:
        return None


def _extract_turned_in_at(submission: dict[str, Any]) -> datetime | None:
    history = submission.get("submissionHistory")
    if not isinstance(history, list):
        return None
    for entry in history:
        if not isinstance(entry, dict):
            continue
        state_history = entry.get("stateHistory")
        if isinstance(state_history, dict):
            if state_history.get("state") == "TURNED_IN":
                timestamp = state_history.get("stateTimestamp")
                parsed = _parse_datetime(timestamp)
                if parsed:
                    return parsed
    return None


def _extract_submission_attachments(submission: dict[str, Any]) -> list[dict[str, Any]]:
    assignment_submission = submission.get("assignmentSubmission")
    attachments: list[dict[str, Any]] = []
    if isinstance(assignment_submission, dict):
        raw_attachments = assignment_submission.get("attachments")
        if isinstance(raw_attachments, list):
            for attachment in raw_attachments:
                if isinstance(attachment, dict):
                    attachments.append(attachment)
    return attachments
