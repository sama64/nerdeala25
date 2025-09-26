import pytest
from sqlalchemy import select

from app.models.token import AuthToken, TokenType
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_register_verify_and_login(async_client, session_factory):
    register_payload = {
        "name": "Ana Admin",
        "email": "ana@example.com",
        "password": "StrongPass123",
        "role": UserRole.ADMIN.value,
    }
    response = await async_client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201

    async with session_factory() as session:
        result = await session.execute(
            select(AuthToken).where(AuthToken.token_type == TokenType.VERIFY).order_by(AuthToken.created_at.desc())
        )
        token = result.scalars().first()
        assert token is not None

    verify_response = await async_client.post("/api/v1/auth/verify", json={"token": token.token})
    assert verify_response.status_code == 200

    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert login_response.status_code == 200
    payload = login_response.json()
    assert "access_token" in payload
    assert payload["token_type"] == "bearer"
