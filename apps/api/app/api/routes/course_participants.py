from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db
from app.models.course_participant import CourseParticipant, ParticipantRole
from app.models.user import User

router = APIRouter(prefix="/course-participants", tags=["course-participants"])

logger = logging.getLogger("nerdeala.course_participants")


@router.get("/", response_model=dict)
async def list_course_participants_endpoint(
    course_id: str = Query(..., description="ID del curso"),
    role: ParticipantRole | None = Query(default=None, description="Filtrar por rol"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    skip = (page - 1) * size
    
    # Build query
    query = select(CourseParticipant).where(CourseParticipant.course_id == course_id)
    
    if role:
        query = query.where(CourseParticipant.role == role)
    
    # Get participants
    result = await session.execute(
        query.order_by(CourseParticipant.full_name.asc()).offset(skip).limit(size)
    )
    participants = result.scalars().all()
    
    logger.info(f"Found {len(participants)} participants for course_id={course_id}, role={role}")
    
    # Count total
    count_query = select(func.count()).select_from(CourseParticipant).where(CourseParticipant.course_id == course_id)
    if role:
        count_query = count_query.where(CourseParticipant.role == role)
    
    total = await session.scalar(count_query) or 0
    
    # Format response
    items = []
    for participant in participants:
        items.append({
            "id": participant.id,
            "google_user_id": participant.google_user_id,
            "email": participant.email,
            "full_name": participant.full_name,
            "photo_url": participant.photo_url,
            "role": participant.role.value,
            "matched_user_id": participant.matched_user_id,
            "last_seen_at": participant.last_seen_at.isoformat() if participant.last_seen_at else None,
            "created_at": participant.created_at.isoformat() if participant.created_at else None,
            "updated_at": participant.updated_at.isoformat() if participant.updated_at else None,
        })
    
    return {
        "items": items,
        "pagination": {"total": total, "page": page, "size": size},
        "course_id": course_id,
        "filtered_role": role.value if role else None,
    }
