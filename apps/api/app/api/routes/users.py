from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_roles
from app.models.user import User, UserRole
from app.repositories import users
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=dict)
async def list_users_endpoint(
    role: UserRole | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict:
    skip = (page - 1) * size
    items = await users.list_users(session, role=role, skip=skip, limit=size)

    total_query = select(func.count()).select_from(User)
    if role:
        total_query = total_query.where(User.role == role)
    total = await session.scalar(total_query) or 0

    return {
        "items": [UserRead.model_validate(item).model_dump() for item in items],
        "pagination": {"total": total, "page": page, "size": size},
    }


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(
    payload: UserCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserRead:
    if await users.get_by_email(session, payload.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya existe")

    user = await users.create(session, payload)
    return UserRead.model_validate(user)


@router.get("/{user_id}", response_model=UserRead)
async def retrieve_user(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserRead:
    user = await users.get(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user_endpoint(
    user_id: str,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserRead:
    user = await users.get(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    user = await users.update(session, user, payload)
    return UserRead.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_endpoint(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Response:
    user = await users.get(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    await users.delete(session, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
