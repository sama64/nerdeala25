from datetime import datetime, timedelta
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, Enum as SqlEnum, ForeignKey, String

from app.db.session import Base


class TokenType(str, Enum):
    VERIFY = "verify"
    RESET = "reset"


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    token_type = Column(SqlEnum(TokenType), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @classmethod
    def expiry(cls, minutes: int) -> datetime:
        return datetime.utcnow() + timedelta(minutes=minutes)
