import pytest
from sqlalchemy import select

from app.models.token import AuthToken, TokenType
from app.models.user import UserRole


async def bootstrap_admin(async_client, session_factory):
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "name": "Admin",
            "email": "admin@example.com",
            "password": "AdminPass123",
            "role": UserRole.ADMIN.value,
        },
    )
    async with session_factory() as session:
        result = await session.execute(
            select(AuthToken).where(AuthToken.token_type == TokenType.VERIFY).order_by(AuthToken.created_at.desc())
        )
        token = result.scalars().first()
    await async_client.post("/api/v1/auth/verify", json={"token": token.token})
    login = await async_client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "AdminPass123"}
    )
    return login.json()["access_token"]


@pytest.mark.asyncio
async def test_student_lifecycle(async_client, session_factory):
    token = await bootstrap_admin(async_client, session_factory)
    headers = {"Authorization": f"Bearer {token}"}

    course_response = await async_client.post(
        "/api/v1/courses/",
        json={"name": "Matemáticas", "description": "Curso base"},
        headers=headers,
    )
    assert course_response.status_code == 201
    course_id = course_response.json()["id"]

    user_response = await async_client.post(
        "/api/v1/users/",
        json={
            "name": "Alumno Demo",
            "email": "alumno@example.com",
            "password": "AlumnoPass123",
            "role": UserRole.STUDENT.value,
        },
        headers=headers,
    )
    assert user_response.status_code == 201
    user_id = user_response.json()["id"]

    student_response = await async_client.post(
        "/api/v1/students/",
        json={
            "user_id": user_id,
            "course_id": course_id,
            "progress": 0.75,
            "attendance_rate": 0.9,
        },
        headers=headers,
    )
    assert student_response.status_code == 201
    student_id = student_response.json()["id"]

    overview_response = await async_client.get(
        "/api/v1/students/",
        headers=headers,
    )
    assert overview_response.status_code == 200
    overview = overview_response.json()
    assert overview["pagination"]["total"] == 1

    detail_response = await async_client.get(f"/api/v1/students/{student_id}", headers=headers)
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["student"]["progress"] == 0.75
    assert detail["attendance_summary"]["present"] + detail["attendance_summary"]["absent"] + detail["attendance_summary"]["late"] >= 0
