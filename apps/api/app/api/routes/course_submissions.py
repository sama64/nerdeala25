from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db
from app.models.course_submission import CourseSubmission
from app.models.user import User

router = APIRouter(prefix="/classroom", tags=["classroom-submissions"])

logger = logging.getLogger("nerdeala.course_submissions")


@router.get("/{course_id}/submissions", response_model=dict)
async def list_course_submissions_endpoint(
    course_id: str,
    coursework_id: str | None = Query(default=None, description="ID de la tarea específica"),
    google_user_id: str | None = Query(default=None, description="ID del usuario de Google"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size
    
    # Build query
    query = select(CourseSubmission).where(CourseSubmission.course_id == course_id)
    
    if coursework_id:
        query = query.where(CourseSubmission.coursework_id == coursework_id)
    
    if google_user_id:
        query = query.where(CourseSubmission.google_user_id == google_user_id)
    
    # Get submissions ordered by turned_in_at (most recent first)
    result = await session.execute(
        query.order_by(CourseSubmission.turned_in_at.desc().nulls_last())
        .offset(skip)
        .limit(size)
    )
    submissions = result.scalars().all()
    
    logger.info(f"Found {len(submissions)} submissions for course_id={course_id}")
    
    # Format response
    items = []
    for submission in submissions:
        items.append({
            "id": submission.id,
            "course_id": submission.course_id,
            "coursework_id": submission.coursework_id,
            "google_user_id": submission.google_user_id,
            "matched_user_id": submission.matched_user_id,
            "state": submission.state,
            "late": submission.late,
            "turned_in_at": submission.turned_in_at.isoformat() if submission.turned_in_at else None,
            "assigned_grade": submission.assigned_grade,
            "draft_grade": submission.draft_grade,
            "attachments": submission.attachments,
            "updated_time": submission.updated_time.isoformat() if submission.updated_time else None,
            "created_at": submission.created_at.isoformat() if submission.created_at else None,
            "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
        })
    
    return {
        "items": items,
        "count": len(items),
        "course_id": course_id,
        "coursework_id": coursework_id,
        "google_user_id": google_user_id,
    }
