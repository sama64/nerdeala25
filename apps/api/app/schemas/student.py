from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.attendance import AttendanceRead
from app.schemas.notification import NotificationRead
from app.schemas.report import ReportRead


class StudentBase(BaseModel):
    user_id: str
    course_id: Optional[str] = None
    progress: float = Field(default=0.0, ge=0.0, le=1.0)
    attendance_rate: float = Field(default=0.0, ge=0.0, le=1.0)


class StudentCreate(StudentBase):
    id: Optional[str] = None


class StudentUpdate(BaseModel):
    course_id: Optional[str] = None
    progress: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    attendance_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class StudentRead(StudentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentUser(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    verified: bool


class StudentOverview(StudentRead):
    user: StudentUser
    alerts: int = 0


class StudentDetail(StudentRead):
    user: StudentUser
    notifications: list[NotificationRead]
    reports: list[ReportRead]
    attendance_records: list[AttendanceRead]
    alerts: int = 0
