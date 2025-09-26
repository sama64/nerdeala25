from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, String, Text

from app.db.session import Base


class CourseSubmission(Base):
    __tablename__ = "course_submissions"

    id = Column(String, primary_key=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    coursework_id = Column(String, ForeignKey("course_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    google_user_id = Column(String, nullable=False, index=True)
    matched_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    state = Column(String(50), nullable=True)
    late = Column(Boolean, default=False, nullable=False)
    turned_in_at = Column(DateTime, nullable=True)
    assigned_grade = Column(Float, nullable=True)
    draft_grade = Column(Float, nullable=True)
    attachments = Column(Text, nullable=True)
    updated_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
