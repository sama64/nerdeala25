from fastapi import APIRouter

from app.api.routes import (
    assignment_export,
    assignment_stats,
    attendance,
    auth,
    classroom,
    course_assignments,
    course_participants,
    course_reports,
    course_submissions,
    courses,
    health,
    onboarding,
    notifications,
    reports,
    students,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(courses.router)
api_router.include_router(students.router)
api_router.include_router(course_participants.router)
api_router.include_router(course_assignments.router)
api_router.include_router(course_submissions.router)
api_router.include_router(course_reports.router)
api_router.include_router(assignment_stats.router)
api_router.include_router(assignment_export.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(attendance.router)
api_router.include_router(classroom.router)
api_router.include_router(onboarding.router)
