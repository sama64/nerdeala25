from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReportBase(BaseModel):
    student_id: str
    data: str = Field(..., min_length=2)


class ReportCreate(ReportBase):
    id: Optional[str] = None


class ReportRead(ReportBase):
    id: str
    generated_at: datetime

    class Config:
        from_attributes = True
