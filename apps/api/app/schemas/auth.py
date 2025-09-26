from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    google_access_token: str | None = None
    google_refresh_token: str | None = None
    google_token_expires_at: datetime | None = None


class TokenPayload(BaseModel):
    sub: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterRequest(LoginRequest):
    name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(default="student")


class VerifyRequest(BaseModel):
    token: str = Field(..., min_length=10)


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8)


class GoogleExchangeRequest(BaseModel):
    code: str = Field(..., min_length=1)
    state: str = Field(..., min_length=10)
