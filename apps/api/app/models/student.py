from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    progress = Column(Float, default=0.0)
    attendance_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="student_profile")
    course = relationship("Course", back_populates="students")
    notifications = relationship("Notification", back_populates="student", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")

    if TYPE_CHECKING:
        from app.models.attendance import Attendance  # pragma: no cover
        from app.models.notification import Notification  # pragma: no cover
        from app.models.report import Report  # pragma: no cover
        from app.models.user import User  # pragma: no cover

        user: "User"
        notifications: list["Notification"]
        reports: list["Report"]
        attendance_records: list["Attendance"]
