from collections.abc import Sequence
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate
from app.utils.ids import generate_id


async def get(session: AsyncSession, notification_id: str) -> Notification | None:
    result = await session.execute(select(Notification).where(Notification.id == notification_id))
    return result.scalar_one_or_none()


async def list_notifications(
    session: AsyncSession,
    student_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Notification]:
    query = select(Notification)
    if student_id:
        query = query.where(Notification.student_id == student_id)
    result = await session.execute(
        query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def create(session: AsyncSession, payload: NotificationCreate) -> Notification:
    notification = Notification(
        id=payload.id or generate_id(),
        student_id=payload.student_id,
        message=payload.message,
        status=payload.status,
    )
    session.add(notification)
    await session.commit()
    await session.refresh(notification)
    return notification


async def update(
    session: AsyncSession, notification: Notification, payload: NotificationUpdate
) -> Notification:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return notification

    await session.execute(
        update(Notification).where(Notification.id == notification.id).values(**data)
    )
    await session.commit()
    await session.refresh(notification)
    return notification


async def delete(session: AsyncSession, notification: Notification) -> None:
    await session.delete(notification)
    await session.commit()
