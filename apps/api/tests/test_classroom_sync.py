import pytest
from sqlalchemy import select

from app.models.token import AuthToken, TokenType
from app.models.user import UserRole


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
    token = await register_and_verify(async_client, session_factory, "docente@example.com", UserRole.TEACHER)

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

    courses_response = await async_client.get(
        "/api/v1/courses/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert courses_response.status_code == 200
    data = courses_response.json()
    assert data["pagination"]["total"] == payload["count"]
