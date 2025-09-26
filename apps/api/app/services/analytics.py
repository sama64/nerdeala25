from __future__ import annotations

from collections.abc import Sequence

from app.models.student import Student
from app.models.attendance import Attendance
from app.models.notification import Notification


def summarize_students(students: Sequence[Student]) -> dict[str, float]:
    if not students:
        return {"average_progress": 0.0, "average_attendance": 0.0}

    progress_total = sum(student.progress for student in students)
    attendance_total = sum(student.attendance_rate for student in students)
    count = len(students)
    return {
        "average_progress": round(progress_total / count, 2),
        "average_attendance": round(attendance_total / count, 2),
    }


def summarize_notifications(notifications: Sequence[Notification]) -> dict[str, int]:
    totals = {"pending": 0, "sent": 0, "read": 0}
    for notification in notifications:
        totals[notification.status.value] = totals.get(notification.status.value, 0) + 1
    return totals


def summarize_attendance(records: Sequence[Attendance]) -> dict[str, int]:
    summary: dict[str, int] = {"present": 0, "absent": 0, "late": 0}
    for record in records:
        summary[record.status.value] = summary.get(record.status.value, 0) + 1
    return summary
