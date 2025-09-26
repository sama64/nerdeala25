from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text

from app.db.session import Base


class CourseAssignment(Base):
    __tablename__ = "course_assignments"

    id = Column(String, primary_key=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    work_type = Column(String(50), nullable=True)
    state = Column(String(50), nullable=True)
    due_at = Column(DateTime, nullable=True)
    alternate_link = Column(String, nullable=True)
    max_points = Column(Float, nullable=True)
    created_time = Column(DateTime, nullable=True)
    updated_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
