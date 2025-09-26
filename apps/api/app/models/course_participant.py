from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SqlEnum, ForeignKey, String, UniqueConstraint

from app.db.session import Base


class ParticipantRole(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"


class CourseParticipant(Base):
    __tablename__ = "course_participants"
    __table_args__ = (
        UniqueConstraint("course_id", "google_user_id", name="uq_course_participant_google"),
    )

    id = Column(String, primary_key=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    google_user_id = Column(String, nullable=False)
    email = Column(String, nullable=True, index=True)
    full_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    role = Column(SqlEnum(ParticipantRole), nullable=False)
    matched_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
