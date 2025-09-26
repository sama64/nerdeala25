from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db.session import Base


class UserContact(Base):
    __tablename__ = "user_contacts"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    email = Column(String, nullable=True, unique=False)
    phone_e164 = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
