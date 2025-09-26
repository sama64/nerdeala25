from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db
from app.models.course_assignment import CourseAssignment
from app.models.user import User

router = APIRouter(prefix="/course-assignments", tags=["course-assignments"])

logger = logging.getLogger("nerdeala.course_assignments")


@router.get("/", response_model=dict)
async def list_course_assignments_endpoint(
    course_id: str = Query(..., description="ID del curso"),
    state: str | None = Query(default=None, description="Filtrar por estado"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size
    
    # Build query
    query = select(CourseAssignment).where(CourseAssignment.course_id == course_id)
    
    if state:
        query = query.where(CourseAssignment.state == state)
    
    # Get assignments ordered by due date (nearest first, then creation date)
    result = await session.execute(
        query.order_by(
            CourseAssignment.due_at.asc().nulls_last(),
            CourseAssignment.created_time.desc()
        ).offset(skip).limit(size)
    )
    assignments = result.scalars().all()
    
    logger.info(f"Found {len(assignments)} assignments for course_id={course_id}, state={state}")
    
    # Count total
    count_query = select(func.count()).select_from(CourseAssignment).where(CourseAssignment.course_id == course_id)
    if state:
        count_query = count_query.where(CourseAssignment.state == state)
    
    total = await session.scalar(count_query) or 0
    
    # Format response
    items = []
    for assignment in assignments:
        items.append({
            "id": assignment.id,
            "course_id": assignment.course_id,
            "title": assignment.title,
            "description": assignment.description,
            "work_type": assignment.work_type,
            "state": assignment.state,
            "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
            "alternate_link": assignment.alternate_link,
            "max_points": assignment.max_points,
            "created_time": assignment.created_time.isoformat() if assignment.created_time else None,
            "updated_time": assignment.updated_time.isoformat() if assignment.updated_time else None,
            "assignee_mode": assignment.assignee_mode,
            "assignee_user_ids": assignment.assignee_user_ids,
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
            "updated_at": assignment.updated_at.isoformat() if assignment.updated_at else None,
        })
    
    return {
        "items": items,
        "pagination": {"total": total, "page": page, "size": size},
        "course_id": course_id,
        "filtered_state": state,
    }
