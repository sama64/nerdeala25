from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.attendance import AttendanceStatus


class AttendanceBase(BaseModel):
    student_id: str
    course_id: str
    date: date
    status: AttendanceStatus
    notes: Optional[str] = Field(default=None, max_length=512)


class AttendanceCreate(AttendanceBase):
    id: Optional[str] = None


class AttendanceRead(AttendanceBase):
    id: str
    recorded_at: datetime

    class Config:
        from_attributes = True
