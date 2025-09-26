import json
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, field_validator


class ClassroomParticipantRole(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"


class CourseParticipantRead(BaseModel):
    google_user_id: str
    email: str | None = None
    full_name: str | None = None
    photo_url: str | None = None
    role: ClassroomParticipantRole
    matched_user_id: str | None = None
    last_seen_at: datetime

    class Config:
        from_attributes = True


class CourseAssignmentRead(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    work_type: str | None = None
    state: str | None = None
    due_at: datetime | None = None
    alternate_link: str | None = None
    max_points: float | None = None
    created_time: datetime | None = None
    updated_time: datetime | None = None
    assignee_mode: str | None = None
    assignee_user_ids: list[str] | None = None

    class Config:
        from_attributes = True

    @field_validator("assignee_user_ids", mode="before")
    @classmethod
    def _ensure_list(cls, value: Any) -> list[str] | None:
        if value is None or isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return None
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        return None


class CourseSubmissionRead(BaseModel):
    id: str
    course_id: str
    coursework_id: str
    google_user_id: str
    matched_user_id: str | None = None
    state: str | None = None
    late: bool
    turned_in_at: datetime | None = None
    assigned_grade: float | None = None
    draft_grade: float | None = None
    attachments: list[dict[str, Any]] | None = None
    updated_time: datetime | None = None

    class Config:
        from_attributes = True
