from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.user import UserRole


class OnboardingState(BaseModel):
    completed: bool = False
    completed_at: Optional[datetime] = None
    selected_role: Optional[UserRole] = None
    whatsapp_opt_in: bool = False
    phone_e164: Optional[str] = None


class OnboardingUpdate(BaseModel):
    role: Optional[UserRole] = None
    whatsapp_opt_in: Optional[bool] = None
    phone_e164: Optional[str] = Field(default=None, pattern=r"^\+[1-9]\d{7,14}$")
    completed: Optional[bool] = None
