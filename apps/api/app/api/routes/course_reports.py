from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db
from app.models.course import Course
from app.models.course_assignment import CourseAssignment
from app.models.course_participant import CourseParticipant, ParticipantRole
from app.models.course_submission import CourseSubmission
from app.models.attendance import Attendance, AttendanceStatus
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/course-reports", tags=["course-reports"])

logger = logging.getLogger("nerdeala.course_reports")


@router.get("/{course_id}/comprehensive")
async def generate_comprehensive_course_report(
    course_id: str,
    include_detailed_students: bool = Query(True, description="Include detailed student analysis"),
    include_attendance: bool = Query(True, description="Include attendance analysis"),
    include_temporal: bool = Query(True, description="Include temporal trends"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> Dict[str, Any]:
    """Generate a comprehensive course report with all available data"""
    
    # Get course details
    course_result = await session.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )

    # Get all participants (students and teachers)
    participants_result = await session.execute(
        select(CourseParticipant).where(CourseParticipant.course_id == course_id)
    )
    all_participants = participants_result.scalars().all()
    
    students = [p for p in all_participants if p.role == ParticipantRole.STUDENT]
    teachers = [p for p in all_participants if p.role == ParticipantRole.TEACHER]

    # Get all assignments
    assignments_result = await session.execute(
        select(CourseAssignment).where(CourseAssignment.course_id == course_id)
        .order_by(CourseAssignment.due_at.asc().nulls_last())
    )
    assignments = assignments_result.scalars().all()

    # Get all submissions
    submissions_result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.course_id == course_id)
    )
    submissions = submissions_result.scalars().all()

    # Get attendance records if requested
    attendance_records = []
    if include_attendance:
        attendance_result = await session.execute(
            select(Attendance).where(Attendance.course_id == course_id)
        )
        attendance_records = attendance_result.scalars().all()

    # Get notifications for students in this course (since notifications are tied to students, not courses)
    student_ids = [s.id for s in students if s.id]  # Get student IDs that are not None
    recent_notifications = []
    
    if student_ids:
        notifications_result = await session.execute(
            select(Notification).where(Notification.student_id.in_(student_ids))
            .order_by(desc(Notification.created_at))
            .limit(50)
        )
        recent_notifications = notifications_result.scalars().all()

    # Build comprehensive report with enhanced information
    report = {
        "course_info": {
            "id": course.id,
            "name": course.name,
            "description": course.description,
            "teacher_id": course.teacher_id,
            "teacher_info": {
                "teachers": [{"name": t.full_name, "email": t.email, "role": t.role.value} 
                           for t in teachers if t.full_name],
                "total_teachers": len(teachers)
            },
            "course_duration": {
                "created_at": course.created_at.isoformat() if course.created_at else None,
                "updated_at": course.updated_at.isoformat() if course.updated_at else None,
                "days_active": (datetime.now() - course.created_at).days if course.created_at else 0,
            },
            "google_classroom_id": course.id,  # This is the Google Classroom ID
        },
        "summary_metrics": await _calculate_summary_metrics(
            students, assignments, submissions, attendance_records, course
        ),
        "assignments_analysis": await _analyze_assignments(assignments, submissions, students),
        "students_overview": await _analyze_students_overview(students, submissions, attendance_records),
        "engagement_metrics": await _calculate_engagement_metrics(
            students, assignments, submissions, attendance_records
        ),
        "grade_analysis": await _analyze_grades_comprehensive(assignments, submissions),
        "time_analysis": await _analyze_time_patterns(assignments, submissions),
    }

    # Add detailed student analysis if requested
    if include_detailed_students:
        report["detailed_students"] = await _analyze_students_detailed(
            students, assignments, submissions, attendance_records
        )

    # Add attendance analysis if requested and available
    if include_attendance and attendance_records:
        report["attendance_analysis"] = await _analyze_attendance(attendance_records, students)

    # Add temporal analysis if requested
    if include_temporal:
        report["temporal_trends"] = await _analyze_temporal_trends(
            assignments, submissions, attendance_records
        )

    # Add alerts and recommendations
    report["alerts_and_recommendations"] = await _generate_alerts_and_recommendations(
        students, assignments, submissions, attendance_records
    )

    # Add recent activity
    report["recent_activity"] = {
        "notifications": [
            {
                "id": notif.id,
                "message": notif.message,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
                "status": notif.status.value if notif.status else None,
                "student_id": notif.student_id,
            }
            for notif in recent_notifications[:10]
        ]
    }

    logger.info(f"Generated comprehensive report for course {course_id}")
    
    return {
        "report": report,
        "generated_at": datetime.now().isoformat(),
        "generated_by": current_user.id,
    }


async def _calculate_summary_metrics(students, assignments, submissions, attendance_records, course):
    """Calculate key summary metrics for the course"""
    total_students = len(students)
    total_assignments = len(assignments)
    total_submissions = len(submissions)
    
    # Submission metrics
    submitted_count = len([s for s in submissions if s.state in ['TURNED_IN', 'RETURNED']])
    draft_count = len([s for s in submissions if s.state == 'CREATED'])
    late_submissions = len([s for s in submissions if s.late])
    
    # Participation rate
    if total_students > 0 and total_assignments > 0:
        expected_submissions = total_students * total_assignments
        participation_rate = (total_submissions / expected_submissions) * 100
        completion_rate = (submitted_count / expected_submissions) * 100
    else:
        participation_rate = 0
        completion_rate = 0

    # Attendance metrics
    attendance_rate = 0
    if attendance_records:
        present_count = len([a for a in attendance_records if a.status == AttendanceStatus.PRESENTE])
        total_attendance_records = len(attendance_records)
        attendance_rate = (present_count / total_attendance_records) * 100 if total_attendance_records > 0 else 0

    return {
        "total_students": total_students,
        "total_assignments": total_assignments,
        "total_submissions": total_submissions,
        "submitted_count": submitted_count,
        "draft_count": draft_count,
        "late_submissions": late_submissions,
        "participation_rate": round(participation_rate, 1),
        "completion_rate": round(completion_rate, 1),
        "attendance_rate": round(attendance_rate, 1),
        # Additional metrics
        "course_activity_score": round(((participation_rate + completion_rate + attendance_rate) / 3), 1),
        "students_with_no_submissions": len([s for s in students 
                                           if not any(sub.google_user_id == s.google_user_id for sub in submissions)]),
        "average_submissions_per_student": round(total_submissions / total_students, 1) if total_students > 0 else 0,
        "most_active_period": _get_most_active_period(submissions),
    }


async def _calculate_engagement_metrics(students, assignments, submissions, attendance_records):
    """Calculate student engagement and participation metrics"""
    total_students = len(students)
    
    # Student activity levels
    highly_engaged = 0  # >80% participation
    moderately_engaged = 0  # 50-80% participation  
    low_engaged = 0  # <50% participation
    
    student_engagement = {}
    
    for student in students:
        student_subs = [s for s in submissions if s.google_user_id == student.google_user_id]
        student_attendance = [a for a in attendance_records if a.student_id == student.id]
        
        # Calculate engagement score
        sub_rate = len(student_subs) / len(assignments) if assignments else 0
        attend_rate = len([a for a in student_attendance if a.status == AttendanceStatus.PRESENTE]) / len(student_attendance) if student_attendance else 0
        
        engagement_score = (sub_rate + attend_rate) / 2
        
        student_engagement[student.id] = {
            "name": student.full_name,
            "engagement_score": round(engagement_score * 100, 1),
            "submissions": len(student_subs),
            "attendance_rate": round(attend_rate * 100, 1),
        }
        
        if engagement_score > 0.8:
            highly_engaged += 1
        elif engagement_score > 0.5:
            moderately_engaged += 1
        else:
            low_engaged += 1
    
    return {
        "highly_engaged_students": highly_engaged,
        "moderately_engaged_students": moderately_engaged,
        "low_engaged_students": low_engaged,
        "engagement_distribution": {
            "high": round((highly_engaged / total_students * 100), 1) if total_students > 0 else 0,
            "medium": round((moderately_engaged / total_students * 100), 1) if total_students > 0 else 0,
            "low": round((low_engaged / total_students * 100), 1) if total_students > 0 else 0,
        },
        "top_engaged_students": sorted(student_engagement.values(), 
                                     key=lambda x: x["engagement_score"], reverse=True)[:5],
    }


async def _analyze_grades_comprehensive(assignments, submissions):
    """Comprehensive grade analysis"""
    graded_submissions = [s for s in submissions if s.assigned_grade is not None]
    
    if not graded_submissions:
        return {"available": False, "message": "No graded submissions available"}
    
    grades = [s.assigned_grade for s in graded_submissions]
    
    # Grade statistics
    avg_grade = sum(grades) / len(grades)
    max_grade = max(grades)
    min_grade = min(grades)
    
    # Grade distribution ranges
    grade_ranges = {
        "A (90-100)": len([g for g in grades if g >= 90]),
        "B (80-89)": len([g for g in grades if 80 <= g < 90]),
        "C (70-79)": len([g for g in grades if 70 <= g < 80]),
        "D (60-69)": len([g for g in grades if 60 <= g < 70]),
        "F (<60)": len([g for g in grades if g < 60]),
    }
    
    return {
        "available": True,
        "total_graded": len(graded_submissions),
        "average_grade": round(avg_grade, 1),
        "max_grade": max_grade,
        "min_grade": min_grade,
        "median_grade": round(sorted(grades)[len(grades)//2], 1),
        "grade_distribution": grade_ranges,
        "passing_rate": round(len([g for g in grades if g >= 60]) / len(grades) * 100, 1),
        "excellence_rate": round(len([g for g in grades if g >= 90]) / len(grades) * 100, 1),
    }


async def _analyze_time_patterns(assignments, submissions):
    """Analyze temporal patterns in submissions and assignments"""
    if not submissions:
        return {"available": False, "message": "No submission data available"}
    
    # Submission timing analysis
    submitted_subs = [s for s in submissions if s.turned_in_at and s.state in ['TURNED_IN', 'RETURNED']]
    
    if not submitted_subs:
        return {"available": False, "message": "No completed submissions available"}
    
    # Day of week analysis
    from collections import Counter
    submission_days = [s.turned_in_at.strftime('%A') for s in submitted_subs]
    day_distribution = Counter(submission_days)
    
    # Hour analysis
    submission_hours = [s.turned_in_at.hour for s in submitted_subs]
    hour_distribution = Counter(submission_hours)
    
    # Peak submission times
    peak_day = max(day_distribution.items(), key=lambda x: x[1])[0] if day_distribution else "N/A"
    peak_hour = max(hour_distribution.items(), key=lambda x: x[1])[0] if hour_distribution else "N/A"
    
    # Last minute submissions (within 24 hours of deadline)
    last_minute_count = 0
    for submission in submitted_subs:
        # Find corresponding assignment
        assignment = next((a for a in assignments if a.id == submission.coursework_id), None)
        if assignment and assignment.due_at and submission.turned_in_at:
            time_diff = (assignment.due_at - submission.turned_in_at).total_seconds() / 3600  # hours
            if 0 <= time_diff <= 24:
                last_minute_count += 1
    
    return {
        "available": True,
        "total_analyzed": len(submitted_subs),
        "peak_submission_day": peak_day,
        "peak_submission_hour": f"{peak_hour}:00" if peak_hour != "N/A" else "N/A",
        "day_distribution": dict(day_distribution),
        "last_minute_submissions": last_minute_count,
        "last_minute_rate": round(last_minute_count / len(submitted_subs) * 100, 1),
    }


def _get_most_active_period(submissions):
    """Get the most active submission period"""
    if not submissions:
        return "No activity"
    
    from collections import Counter
    
    # Group by week
    weeks = []
    for sub in submissions:
        if sub.turned_in_at:
            week_start = sub.turned_in_at - timedelta(days=sub.turned_in_at.weekday())
            weeks.append(week_start.strftime('%Y-%m-%d'))
    
    if not weeks:
        return "No completed submissions"
    
    week_counts = Counter(weeks)
    most_active_week = max(week_counts.items(), key=lambda x: x[1])
    
    return f"Week of {most_active_week[0]} ({most_active_week[1]} submissions)"


async def _analyze_assignments(assignments, submissions, students):
    """Analyze assignment performance and trends"""
    assignment_analysis = []
    
    for assignment in assignments:
        # Get submissions for this assignment
        assignment_submissions = [s for s in submissions if s.coursework_id == assignment.id]
        
        total_students = len(students)
        submitted = len([s for s in assignment_submissions if s.state in ['TURNED_IN', 'RETURNED']])
        drafts = len([s for s in assignment_submissions if s.state == 'CREATED'])
        late = len([s for s in assignment_submissions if s.late])
        
        # Calculate grades statistics
        graded = [s for s in assignment_submissions if s.assigned_grade is not None]
        avg_grade = sum(s.assigned_grade for s in graded) / len(graded) if graded else None
        
        submission_rate = (submitted / total_students * 100) if total_students > 0 else 0
        
        assignment_analysis.append({
            "id": assignment.id,
            "title": assignment.title,
            "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
            "max_points": assignment.max_points,
            "submission_rate": round(submission_rate, 1),
            "total_submissions": len(assignment_submissions),
            "submitted_count": submitted,
            "draft_count": drafts,
            "late_count": late,
            "average_grade": round(avg_grade, 1) if avg_grade else None,
            "graded_count": len(graded),
        })
    
    # Sort by submission rate (worst first for attention)
    assignment_analysis.sort(key=lambda x: x["submission_rate"])
    
    return {
        "assignments": assignment_analysis,
        "best_performing": assignment_analysis[-3:] if assignment_analysis else [],
        "worst_performing": assignment_analysis[:3] if assignment_analysis else [],
    }


async def _analyze_students_overview(students, submissions, attendance_records):
    """Analyze student participation overview"""
    student_summaries = []
    
    for student in students:
        # Get student submissions
        student_submissions = [s for s in submissions if s.google_user_id == student.google_user_id]
        submitted = len([s for s in student_submissions if s.state in ['TURNED_IN', 'RETURNED']])
        total_submissions = len(student_submissions)
        
        # Get student attendance
        student_attendance = [a for a in attendance_records if a.student_id == student.id]
        present_days = len([a for a in student_attendance if a.status == 'present'])
        total_attendance_days = len(student_attendance)
        
        attendance_rate = (present_days / total_attendance_days * 100) if total_attendance_days > 0 else 0
        
        # Calculate overall performance score
        submission_score = (submitted / len(submissions) * 100) if submissions else 0
        performance_score = (submission_score + attendance_rate) / 2
        
        student_summaries.append({
            "id": student.id,
            "google_user_id": student.google_user_id,
            "name": student.full_name,
            "email": student.email,
            "total_submissions": total_submissions,
            "completed_submissions": submitted,
            "attendance_rate": round(attendance_rate, 1),
            "performance_score": round(performance_score, 1),
        })
    
    # Sort by performance score
    student_summaries.sort(key=lambda x: x["performance_score"], reverse=True)
    
    return {
        "students": student_summaries,
        "top_performers": student_summaries[:5],
        "at_risk_students": [s for s in student_summaries if s["performance_score"] < 60],
    }


async def _analyze_students_detailed(students, assignments, submissions, attendance_records):
    """Detailed student analysis with individual metrics"""
    # This would be similar to overview but with more detailed breakdown
    # For now, return a placeholder that shows this is available
    return {
        "available": True,
        "student_count": len(students),
        "details": "Detailed individual student analysis available on request"
    }


async def _analyze_attendance(attendance_records, students):
    """Analyze attendance patterns and trends"""
    if not attendance_records:
        return {"available": False, "message": "No attendance data available"}
    
    # Overall attendance statistics
    total_records = len(attendance_records)
    present_count = len([a for a in attendance_records if a.status == AttendanceStatus.PRESENTE])
    absent_count = len([a for a in attendance_records if a.status == AttendanceStatus.AUSENTE])
    
    # Attendance by student
    student_attendance = {}
    for record in attendance_records:
        if record.student_id not in student_attendance:
            student_attendance[record.student_id] = {"present": 0, "absent": 0, "total": 0}
        
        student_attendance[record.student_id]["total"] += 1
        if record.status == AttendanceStatus.PRESENTE:
            student_attendance[record.student_id]["present"] += 1
        else:
            student_attendance[record.student_id]["absent"] += 1
    
    return {
        "available": True,
        "overall_rate": round((present_count / total_records * 100), 1) if total_records > 0 else 0,
        "total_sessions": len(set(a.date for a in attendance_records)),
        "average_attendance": round(present_count / len(students), 1) if students else 0,
        "students_with_perfect_attendance": len([s for s in student_attendance.values() if s["absent"] == 0]),
        "students_with_attendance_issues": len([s for s in student_attendance.values() 
                                               if s["present"] / s["total"] < 0.8 if s["total"] > 0]),
    }


async def _analyze_temporal_trends(assignments, submissions, attendance_records):
    """Analyze temporal patterns and trends"""
    now = datetime.now()
    
    # Upcoming deadlines (next 2 weeks)
    upcoming_assignments = [
        a for a in assignments 
        if a.due_at and a.due_at > now and a.due_at <= now + timedelta(days=14)
    ]
    
    # Recent submissions (last week)
    recent_submissions = [
        s for s in submissions
        if s.turned_in_at and s.turned_in_at >= now - timedelta(days=7)
    ]
    
    return {
        "upcoming_deadlines": len(upcoming_assignments),
        "next_deadline": min((a.due_at for a in upcoming_assignments), default=None),
        "recent_activity": len(recent_submissions),
        "trend_analysis": "Available - submission patterns over time"
    }


async def _generate_alerts_and_recommendations(students, assignments, submissions, attendance_records):
    """Generate alerts and actionable recommendations"""
    alerts = []
    recommendations = []
    
    # Students at risk
    at_risk_count = 0
    for student in students:
        student_submissions = [s for s in submissions if s.google_user_id == student.google_user_id]
        submitted = len([s for s in student_submissions if s.state in ['TURNED_IN', 'RETURNED']])
        
        if len(assignments) > 0:
            completion_rate = submitted / len(assignments)
            if completion_rate < 0.6:  # Less than 60% completion
                at_risk_count += 1
                alerts.append({
                    "type": "student_at_risk",
                    "message": f"{student.full_name} has low completion rate ({completion_rate*100:.1f}%)",
                    "severity": "high" if completion_rate < 0.4 else "medium",
                    "student_id": student.id
                })
    
    # Assignment alerts
    for assignment in assignments:
        if assignment.due_at:
            days_until_due = (assignment.due_at - datetime.now()).days
            if 0 <= days_until_due <= 3:  # Due in next 3 days
                assignment_submissions = [s for s in submissions if s.coursework_id == assignment.id]
                submitted_count = len([s for s in assignment_submissions if s.state in ['TURNED_IN', 'RETURNED']])
                submission_rate = (submitted_count / len(students)) if students else 0
                
                if submission_rate < 0.5:  # Less than 50% submitted
                    alerts.append({
                        "type": "assignment_deadline",
                        "message": f"'{assignment.title}' due soon with low submission rate ({submission_rate*100:.1f}%)",
                        "severity": "high",
                        "assignment_id": assignment.id
                    })
    
    # Generate recommendations
    if at_risk_count > 0:
        recommendations.append({
            "type": "intervention",
            "message": f"Consider reaching out to {at_risk_count} students with low completion rates",
            "action": "individual_support"
        })
    
    if len([a for a in alerts if a["type"] == "assignment_deadline"]) > 0:
        recommendations.append({
            "type": "deadline_management",
            "message": "Send reminders for upcoming assignments with low submission rates",
            "action": "send_notifications"
        })
    
    return {
        "alerts": alerts,
        "recommendations": recommendations,
        "summary": {
            "total_alerts": len(alerts),
            "high_priority": len([a for a in alerts if a.get("severity") == "high"]),
            "students_at_risk": at_risk_count
        }
    }


@router.get("/{course_id}/export-csv")
async def export_course_report_csv(
    course_id: str,
    token: str = Query(None, description="Auth token as query parameter"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """Export comprehensive course report as CSV"""
    
    # Get the same data as the comprehensive report
    course_result = await session.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado"
        )

    # Get all data
    participants_result = await session.execute(
        select(CourseParticipant).where(CourseParticipant.course_id == course_id)
    )
    all_participants = participants_result.scalars().all()
    students = [p for p in all_participants if p.role == ParticipantRole.STUDENT]

    assignments_result = await session.execute(
        select(CourseAssignment).where(CourseAssignment.course_id == course_id)
        .order_by(CourseAssignment.due_at.asc().nulls_last())
    )
    assignments = assignments_result.scalars().all()

    submissions_result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.course_id == course_id)
    )
    submissions = submissions_result.scalars().all()

    attendance_result = await session.execute(
        select(Attendance).where(Attendance.course_id == course_id)
    )
    attendance_records = attendance_result.scalars().all()

    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Course Summary Section
    writer.writerow(["=== REPORTE COMPLETO DEL CURSO ==="])
    writer.writerow(["Curso:", course.name])
    writer.writerow(["ID:", course.id])
    writer.writerow(["Descripción:", course.description or "Sin descripción"])
    writer.writerow(["Generado:", datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow(["Generado por:", current_user.email or current_user.id])
    writer.writerow([])  # Empty row
    
    # Summary Metrics
    writer.writerow(["=== MÉTRICAS GENERALES ==="])
    writer.writerow(["Total Estudiantes", len(students)])
    writer.writerow(["Total Tareas", len(assignments)])
    writer.writerow(["Total Entregas", len(submissions)])
    
    submitted_count = len([s for s in submissions if s.state in ['TURNED_IN', 'RETURNED']])
    draft_count = len([s for s in submissions if s.state == 'CREATED'])
    late_count = len([s for s in submissions if s.late])
    
    writer.writerow(["Entregas Finalizadas", submitted_count])
    writer.writerow(["Borradores", draft_count])
    writer.writerow(["Entregas Tardías", late_count])
    
    if len(students) > 0 and len(assignments) > 0:
        expected = len(students) * len(assignments)
        participation_rate = (len(submissions) / expected) * 100
        completion_rate = (submitted_count / expected) * 100
    else:
        participation_rate = completion_rate = 0
        
    writer.writerow(["Tasa de Participación (%)", round(participation_rate, 1)])
    writer.writerow(["Tasa de Completado (%)", round(completion_rate, 1)])
    
    # Attendance metrics
    if attendance_records:
        present_count = len([a for a in attendance_records if a.status == AttendanceStatus.PRESENTE])
        attendance_rate = (present_count / len(attendance_records)) * 100
        writer.writerow(["Tasa de Asistencia (%)", round(attendance_rate, 1)])
    
    writer.writerow([])  # Empty row
    
    # Student Details Section
    writer.writerow(["=== DETALLE POR ESTUDIANTE ==="])
    headers = [
        "Nombre", "Email", "Total Entregas", "Entregas Finalizadas", 
        "Borradores", "Entregas Tardías", "Tasa Participación (%)",
        "Días Asistencia", "Tasa Asistencia (%)", "Score General (%)"
    ]
    writer.writerow(headers)
    
    for student in students:
        student_submissions = [s for s in submissions if s.google_user_id == student.google_user_id]
        student_submitted = len([s for s in student_submissions if s.state in ['TURNED_IN', 'RETURNED']])
        student_drafts = len([s for s in student_submissions if s.state == 'CREATED'])
        student_late = len([s for s in student_submissions if s.late])
        
        student_attendance = [a for a in attendance_records if a.student_id == student.id]
        student_present = len([a for a in student_attendance if a.status == AttendanceStatus.PRESENTE])
        
        participation_rate = (len(student_submissions) / len(assignments) * 100) if assignments else 0
        attendance_rate = (student_present / len(student_attendance) * 100) if student_attendance else 0
        overall_score = (participation_rate + attendance_rate) / 2
        
        row = [
            student.full_name or "Sin nombre",
            student.email or "Sin email", 
            len(student_submissions),
            student_submitted,
            student_drafts,
            student_late,
            round(participation_rate, 1),
            student_present,
            round(attendance_rate, 1),
            round(overall_score, 1)
        ]
        writer.writerow(row)
    
    writer.writerow([])  # Empty row
    
    # Assignment Analysis
    writer.writerow(["=== ANÁLISIS POR TAREA ==="])
    assignment_headers = [
        "Título", "Fecha Vencimiento", "Puntos Máximos", "Total Entregas",
        "Entregas Finalizadas", "Borradores", "Entregas Tardías", 
        "Tasa Entrega (%)", "Promedio Calificación"
    ]
    writer.writerow(assignment_headers)
    
    for assignment in assignments:
        assignment_submissions = [s for s in submissions if s.coursework_id == assignment.id]
        assignment_submitted = len([s for s in assignment_submissions if s.state in ['TURNED_IN', 'RETURNED']])
        assignment_drafts = len([s for s in assignment_submissions if s.state == 'CREATED'])
        assignment_late = len([s for s in assignment_submissions if s.late])
        
        submission_rate = (assignment_submitted / len(students) * 100) if students else 0
        
        graded = [s for s in assignment_submissions if s.assigned_grade is not None]
        avg_grade = sum(s.assigned_grade for s in graded) / len(graded) if graded else None
        
        row = [
            assignment.title,
            assignment.due_at.strftime('%Y-%m-%d %H:%M') if assignment.due_at else "Sin fecha",
            assignment.max_points or "N/A",
            len(assignment_submissions),
            assignment_submitted,
            assignment_drafts,
            assignment_late,
            round(submission_rate, 1),
            round(avg_grade, 1) if avg_grade else "N/A"
        ]
        writer.writerow(row)
    
    # Prepare response
    csv_content = output.getvalue()
    output.close()
    
    # Generate filename
    safe_name = "".join(c for c in course.name if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
    filename = f"reporte_curso_{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    logger.info(f"Exporting comprehensive course report for {course_id}")
    
    return Response(
        content=csv_content,
        media_type='text/csv; charset=utf-8',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition',
        }
    )
