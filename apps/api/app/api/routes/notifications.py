from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db, require_roles
from app.models.notification import Notification, NotificationStatus
from app.models.user import User, UserRole
from app.repositories import notifications as notifications_repo
from app.schemas.notification import (
    NotificationCreate,
    NotificationRead,
    NotificationTestRequest,
    NotificationUpdate,
)
from app.services.notifications import notification_hub
from app.services.notifications.http_wa import get_notifier

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
) -> Response:
    notification = await notifications_repo.get(session, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

    await notifications_repo.delete(session, notification)
    await notification_hub.broadcast(notification.student_id, {"event": "deleted", "id": notification_id})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/test", response_model=dict)
async def send_test_notification(
    payload: NotificationTestRequest,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
) -> dict:
    notifier = get_notifier()
    await notifier.send_message(payload.phone, payload.text)
    return {"status": "ok"}


@router.post("/test-assignment", response_model=dict)
async def send_test_assignment_notification(
    course_id: str,
    assignment_title: str = "Tarea de Prueba",
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TEACHER)),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Test endpoint for new assignment notifications"""
    from app.repositories import course_participants as participants_repo
    from app.repositories import user_contacts as user_contacts_repo
    from app.models.course_participant import ParticipantRole
    from app.services.notifications.http_wa import get_notifier
    
    notifier = get_notifier()
    
    # Get all participants in the course
    all_participants = await participants_repo.list_for_course(session, course_id)
    # Filter only students
    participants = [p for p in all_participants if p.role == ParticipantRole.STUDENT]
    
    if not participants:
        return {"status": "no_students", "message": "No students found in course"}
    
    # Get phone numbers for matched users
    matched_user_ids = [p.matched_user_id for p in participants if p.matched_user_id]
    if not matched_user_ids:
        return {"status": "no_phones", "message": "No students with phone numbers found"}
        
    phone_map = await user_contacts_repo.get_phone_map(session, matched_user_ids)
    
    # Create test message
    message = (
        f"📚 *Nueva tarea en Classroom* (PRUEBA)\n\n"
        f"📝 {assignment_title}\n"
        f"📅 Vencimiento: 30/12/2024 a las 23:59\n"
        f"🏆 Puntos: 100\n\n"
        f"👀 Revisá los detalles en tu panel de Scholaris o directamente en Google Classroom.\n\n"
        f"¡No te olvides de entregar a tiempo! 🚀\n\n"
        f"*Este es un mensaje de prueba.*"
    )
    
    # Send to all students with phone numbers
    notifications_sent = 0
    for participant in participants:
        if participant.matched_user_id and participant.matched_user_id in phone_map:
            phone = phone_map[participant.matched_user_id]
            try:
                await notifier.send_message(phone, message)
                notifications_sent += 1
            except Exception as e:
                logger.exception("Error sending test notification to %s", phone)
    
    return {
        "status": "sent", 
        "notifications_sent": notifications_sent,
        "total_students": len(participants),
        "students_with_phones": len([p for p in participants if p.matched_user_id in phone_map])
    }


@router.websocket("/stream/{channel}")
async def notifications_stream(channel: str, websocket: WebSocket) -> None:
    await notification_hub.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await notification_hub.disconnect(websocket, channel)
