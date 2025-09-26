from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.notification import NotificationStatus


class NotificationBase(BaseModel):
    student_id: str
    message: str = Field(..., min_length=2, max_length=1024)
    status: NotificationStatus = NotificationStatus.PENDING


class NotificationCreate(NotificationBase):
    id: Optional[str] = None


class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatus] = None


class NotificationRead(NotificationBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationTestRequest(BaseModel):
    phone: str = Field(..., min_length=5, max_length=32)
    text: str = Field(..., min_length=1, max_length=1024)
