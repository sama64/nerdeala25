from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_verified_user, get_db
from app.models.course_assignment import CourseAssignment
from app.models.course_participant import CourseParticipant, ParticipantRole
from app.models.course_submission import CourseSubmission
from app.models.user import User

router = APIRouter(prefix="/assignment-stats", tags=["assignment-stats"])

logger = logging.getLogger("nerdeala.assignment_stats")


@router.get("/{assignment_id}", response_model=dict)
async def get_assignment_statistics(
    assignment_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    # Get assignment details
    assignment_result = await session.execute(
        select(CourseAssignment).where(CourseAssignment.id == assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tarea no encontrada"
        )

    # Get all students in the course
    students_result = await session.execute(
        select(CourseParticipant).where(
            and_(
                CourseParticipant.course_id == assignment.course_id,
                CourseParticipant.role == ParticipantRole.STUDENT
            )
        )
    )
    students = students_result.scalars().all()
    
    # Get all submissions for this assignment
    submissions_result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.coursework_id == assignment_id)
    )
    submissions = submissions_result.scalars().all()
    
    # Create submission lookup by google_user_id
    submissions_by_user = {sub.google_user_id: sub for sub in submissions}
    
    # Build statistics
    total_students = len(students)
    submitted_count = len([s for s in submissions if s.state in ['TURNED_IN', 'RETURNED']])
    draft_count = len([s for s in submissions if s.state == 'CREATED'])
    
    # Count students who have any submission (draft or final)
    students_with_submissions = set(s.google_user_id for s in submissions)
    not_submitted_count = total_students - len(students_with_submissions)
    
    late_count = len([s for s in submissions if s.late])
    
    logger.info(f"Stats for assignment {assignment_id}: {total_students} students, {len(submissions)} submissions, {submitted_count} final, {draft_count} drafts")
    
    # Build student details
    student_details = []
    for student in students:
        submission = submissions_by_user.get(student.google_user_id)
        
        student_detail = {
            "student_id": student.id,
            "google_user_id": student.google_user_id,
            "full_name": student.full_name,
            "email": student.email,
            "submission_status": "not_submitted",
            "turned_in_at": None,
            "is_late": False,
            "assigned_grade": None,
            "draft_grade": None,
            "state": None,
        }
        
        if submission:
            # Determine submission status more clearly
            if submission.state in ['TURNED_IN', 'RETURNED']:
                status = "submitted"
            elif submission.state == 'CREATED':
                status = "draft" 
            else:
                status = "other"
                
            student_detail.update({
                "submission_status": status,
                "turned_in_at": submission.turned_in_at.isoformat() if submission.turned_in_at else None,
                "is_late": submission.late,
                "assigned_grade": submission.assigned_grade,
                "draft_grade": submission.draft_grade,
                "state": submission.state,
            })
        
        student_details.append(student_detail)
    
    # Calculate grade statistics
    graded_submissions = [s for s in submissions if s.assigned_grade is not None]
    avg_grade = sum(s.assigned_grade for s in graded_submissions) / len(graded_submissions) if graded_submissions else None
    max_grade = max((s.assigned_grade for s in graded_submissions), default=None)
    min_grade = min((s.assigned_grade for s in graded_submissions), default=None)
    
    # Calculate advanced metrics
    approval_threshold = assignment.max_points * 0.6 if assignment.max_points else 6.0  # 60% or 6.0
    approved_count = len([s for s in graded_submissions if s.assigned_grade >= approval_threshold])
    approval_rate = (approved_count / len(graded_submissions) * 100) if graded_submissions else 0
    
    # Students at risk (< 60% or no submission at all)
    risk_threshold = assignment.max_points * 0.6 if assignment.max_points else 6.0
    at_risk_count = 0
    for student in students:
        submission = submissions_by_user.get(student.google_user_id)
        if not submission:
            # No submission at all
            at_risk_count += 1
        elif submission.assigned_grade is not None and submission.assigned_grade < risk_threshold:
            # Has grade but below threshold
            at_risk_count += 1
    
    # Grade distribution for histogram (even if empty, we send structure)
    grade_ranges = []
    if assignment.max_points:  # Always create structure if we have max_points
        ranges = [(0, 0.3), (0.3, 0.5), (0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.0)]
        for i, (start, end) in enumerate(ranges):
            range_min = start * assignment.max_points
            range_max = end * assignment.max_points
            count = len([s for s in graded_submissions 
                        if range_min <= s.assigned_grade < range_max or 
                        (i == len(ranges) - 1 and s.assigned_grade == assignment.max_points)])
            
            grade_ranges.append({
                "range": f"{range_min:.1f}-{range_max:.1f}",
                "count": count,
                "percentage": (count / len(graded_submissions) * 100) if graded_submissions else 0
            })
    
    # Time analysis
    submitted_with_time = [s for s in submissions if s.turned_in_at and assignment.due_at]
    avg_days_before_due = None
    if submitted_with_time and assignment.due_at:
        days_differences = []
        for sub in submitted_with_time:
            diff = (assignment.due_at - sub.turned_in_at).total_seconds() / (24 * 3600)  # days
            days_differences.append(diff)
        avg_days_before_due = sum(days_differences) / len(days_differences)
    
    # Performance percentiles
    percentiles = {}
    if graded_submissions:
        sorted_grades = sorted([s.assigned_grade for s in graded_submissions])
        length = len(sorted_grades)
        percentiles = {
            "p25": sorted_grades[int(0.25 * length)] if length > 0 else None,
            "p50": sorted_grades[int(0.50 * length)] if length > 0 else None,
            "p75": sorted_grades[int(0.75 * length)] if length > 0 else None,
            "p90": sorted_grades[int(0.90 * length)] if length > 0 else None,
        }
    
    logger.info(f"Assignment {assignment_id} stats: {total_students} students, {submitted_count} submitted, {late_count} late")
    
    return {
        "assignment": {
            "id": assignment.id,
            "title": assignment.title,
            "description": assignment.description,
            "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
            "max_points": assignment.max_points,
            "state": assignment.state,
            "course_id": assignment.course_id,
            "alternate_link": assignment.alternate_link,
        },
        "statistics": {
            "total_students": total_students,
            "submitted_count": submitted_count,
            "draft_count": draft_count,
            "not_submitted_count": not_submitted_count,
            "late_count": late_count,
            "graded_count": len(graded_submissions),
            "submission_rate": (submitted_count / total_students * 100) if total_students > 0 else 0,
            "on_time_rate": ((submitted_count - late_count) / submitted_count * 100) if submitted_count > 0 else 0,
            "average_grade": avg_grade,
            "max_grade": max_grade,
            "min_grade": min_grade,
            # New advanced metrics
            "approval_rate": approval_rate,
            "approved_count": approved_count,
            "at_risk_count": at_risk_count,
            "avg_days_before_due": avg_days_before_due,
            "percentiles": percentiles,
            "grade_distribution": grade_ranges,
        },
        "students": student_details,
    }
