from fastapi import APIRouter

from app.api.routes import (
    attendance,
    auth,
    classroom,
    courses,
    health,
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
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(attendance.router)
api_router.include_router(classroom.router)
