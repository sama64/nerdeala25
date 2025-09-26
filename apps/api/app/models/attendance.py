from datetime import date, datetime
from enum import Enum

from sqlalchemy import Column, Date, DateTime, Enum as SqlEnum, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class AttendanceStatus(str, Enum):
    PRESENTE = "present"
    AUSENTE = "absent"
    TARDE = "late"


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, default=date.today, nullable=False)
    status = Column(SqlEnum(AttendanceStatus), nullable=False)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="attendance_records")
    course = relationship("Course")
