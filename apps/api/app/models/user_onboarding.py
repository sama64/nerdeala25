from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.types import Enum as SqlEnum

from app.db.session import Base
from app.models.user import UserRole


class UserOnboardingState(Base):
    __tablename__ = "user_onboarding_state"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    selected_role = Column(SqlEnum(UserRole), nullable=True)
    whatsapp_opt_in = Column(Boolean, default=False, nullable=False)
    phone_e164 = Column(String(32), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
