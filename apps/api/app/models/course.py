from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    teacher = relationship("User", back_populates="courses", foreign_keys=[teacher_id])
    students = relationship("Student", back_populates="course", cascade="all, delete-orphan")

    if TYPE_CHECKING:
        from app.models.user import User  # pragma: no cover
        from app.models.student import Student  # pragma: no cover

        teacher: "User | None"
        students: list["Student"]
