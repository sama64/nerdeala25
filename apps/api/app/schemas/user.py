from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    role: Optional[UserRole] = None
    verified: Optional[bool] = None


class UserRead(UserBase):
    id: str
    verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
