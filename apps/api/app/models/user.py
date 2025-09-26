from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, DateTime, Enum as SqlEnum, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    COORDINATOR = "coordinator"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    verified = Column(Boolean, default=False)
    role = Column(SqlEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    if TYPE_CHECKING:
        from app.models.course import Course  # pragma: no cover
        from app.models.student import Student  # pragma: no cover

        student_profile: "Student"
        courses: list["Course"]

    student_profile = relationship("Student", back_populates="user", uselist=False)
    courses = relationship("Course", back_populates="teacher")
