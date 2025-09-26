from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.models.notification import Notification, NotificationStatus
from app.models.user import User, UserRole
from app.repositories import notifications as notifications_repo
from app.schemas.notification import NotificationCreate, NotificationRead, NotificationUpdate
from app.services.notifications import notification_hub

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=dict)
async def list_notifications_endpoint(
    student_id: str | None = Query(default=None),
    status_filter: NotificationStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size

    if current_user.role == UserRole.STUDENT and student_id:
        student_profile = getattr(current_user, "student_profile", None)
        if not student_profile or student_id != student_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    items = await notifications_repo.list_notifications(
        session, student_id=student_id, skip=skip, limit=size
    )

    if status_filter:
        items = [item for item in items if item.status == status_filter]

    return {
        "items": [NotificationRead.model_validate(item).model_dump() for item in items],
        "page": page,
        "size": size,
    }


@router.post("/", response_model=NotificationRead, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> NotificationRead:
    notification = await notifications_repo.create(session, payload)
    read_model = NotificationRead.model_validate(notification)
    await notification_hub.broadcast(notification.student_id, {"event": "created", "notification": read_model.model_dump()})
    return read_model


@router.patch("/{notification_id}", response_model=NotificationRead)
async def update_notification(
    notification_id: str,
    payload: NotificationUpdate,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> NotificationRead:
    notification = await notifications_repo.get(session, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

    notification = await notifications_repo.update(session, notification, payload)
    read_model = NotificationRead.model_validate(notification)
    await notification_hub.broadcast(
        notification.student_id, {"event": "updated", "notification": read_model.model_dump()}
    )
    return read_model


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR)),
) -> None:
    notification = await notifications_repo.get(session, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

    await notifications_repo.delete(session, notification)
    await notification_hub.broadcast(notification.student_id, {"event": "deleted", "id": notification_id})


@router.websocket("/stream/{channel}")
async def notifications_stream(channel: str, websocket: WebSocket) -> None:
    await notification_hub.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await notification_hub.disconnect(websocket, channel)
