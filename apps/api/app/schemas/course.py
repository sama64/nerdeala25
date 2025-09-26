from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CourseBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1024)
    teacher_id: Optional[str] = None


class CourseCreate(CourseBase):
    id: Optional[str] = None


class CourseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1024)
    teacher_id: Optional[str] = None


class CourseRead(CourseBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
