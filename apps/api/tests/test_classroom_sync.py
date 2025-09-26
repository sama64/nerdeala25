import pytest
from sqlalchemy import select

from app.models.course import Course
from app.models.course_membership import ClassroomMemberRole, CourseMembership
from app.models.course_participant import CourseParticipant, ParticipantRole
from app.models.token import AuthToken, TokenType
from app.models.user import User, UserRole


async def register_and_verify(async_client, session_factory, email: str, role: UserRole):
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "name": "Profesor Demo",
            "email": email,
            "password": "DemoPass123",
            "role": role.value,
        },
    )
    async with session_factory() as session:
        result = await session.execute(
            select(AuthToken).where(AuthToken.token_type == TokenType.VERIFY).order_by(AuthToken.created_at.desc())
        )
        token = result.scalars().first()
    await async_client.post("/api/v1/auth/verify", json={"token": token.token})
    login = await async_client.post(
        "/api/v1/auth/login", json={"email": email, "password": "DemoPass123"}
    )
    return login.json()["access_token"]


@pytest.mark.asyncio
async def test_classroom_sync_creates_courses(async_client, session_factory):
    token = await register_and_verify(async_client, session_factory, "docente@example.com", UserRole.STUDENT)

    sync_response = await async_client.post(
        "/api/v1/classroom/sync",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Goog-Access-Token": "demo-token",
        },
    )
    assert sync_response.status_code == 200
    payload = sync_response.json()
    assert payload["count"] >= 1
    assert "participants" in payload
    assert "demo-course-1" in payload["participants"]
    assert any(
        participant["role"] == "teacher" for participant in payload["participants"]["demo-course-1"]
    )
    assert any(
        participant["email"] == "teacher@example.com"
        for participant in payload["participants"]["demo-course-1"]
    )
    assert "assignments" in payload
    assert "submissions" in payload

    courses_response = await async_client.get(
        "/api/v1/courses/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert courses_response.status_code == 200
    data = courses_response.json()
    assert data["pagination"]["total"] >= 1

    first_course_id = payload["items"][0]["id"]

    participants_response = await async_client.get(
        f"/api/v1/classroom/{first_course_id}/participants",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert participants_response.status_code == 200
    participants_payload = participants_response.json()
    assert participants_payload["count"] >= 1

    assignments_response = await async_client.get(
        f"/api/v1/classroom/{first_course_id}/assignments",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert assignments_response.status_code == 200
    assignments_payload = assignments_response.json()
    assert assignments_payload["count"] >= 1

    submissions_response = await async_client.get(
        f"/api/v1/classroom/{first_course_id}/submissions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submissions_response.status_code == 200
    submissions_payload = submissions_response.json()
    assert submissions_payload["count"] >= 1

    async with session_factory() as session:
        user_result = await session.execute(select(User).where(User.email == "docente@example.com"))
        user = user_result.scalar_one()

        courses_result = await session.execute(select(Course).order_by(Course.id))
        courses = courses_result.scalars().all()

        memberships_result = await session.execute(
            select(CourseMembership).where(CourseMembership.user_id == user.id)
        )
        memberships = memberships_result.scalars().all()

        participants_result = await session.execute(select(CourseParticipant))
        participants = participants_result.scalars().all()

    assert any(course.teacher_id == user.id for course in courses)
    assert any(course.teacher_id is None for course in courses)
    assert any(
        membership.course_id == "demo-course-1" and membership.role == ClassroomMemberRole.TEACHER
        for membership in memberships
    )
    assert any(
        membership.course_id == "demo-course-2" and membership.role == ClassroomMemberRole.STUDENT
        for membership in memberships
    )
    assert any(participant.role == ParticipantRole.TEACHER for participant in participants)
    assert any(participant.role == ParticipantRole.STUDENT for participant in participants)
