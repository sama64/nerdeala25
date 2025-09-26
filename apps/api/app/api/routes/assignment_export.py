from __future__ import annotations

import csv
import io
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_verified_user, get_db
from app.core.security import verify_token
from app.repositories import users
from app.models.course_assignment import CourseAssignment
from app.models.course_participant import CourseParticipant, ParticipantRole
from app.models.course_submission import CourseSubmission
from app.models.user import User

router = APIRouter(prefix="/assignment-export", tags=["assignment-export"])

logger = logging.getLogger("nerdeala.assignment_export")


async def get_user_from_token_query(
    token: str = Query(..., description="Auth token for CSV export"),
    session: AsyncSession = Depends(get_db)
) -> User:
    """Get user from token query parameter for CSV exports"""
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user = await users.get(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not user.verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta no verificada")

    return user


@router.get("/{assignment_id}/csv")
async def export_assignment_csv(
    assignment_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_user_from_token_query),
):
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
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    headers = [
        'Nombre del Estudiante',
        'Email',
        'Estado de Entrega',
        'Fecha de Entrega',
        'Es Tardía',
        'Calificación Asignada',
        'Calificación Borrador',
        'Estado Detallado',
        'Puntos Máximos',
        'Porcentaje'
    ]
    writer.writerow(headers)
    
    # Write student data
    for student in students:
        submission = submissions_by_user.get(student.google_user_id)
        
        # Determine submission status
        if submission:
            if submission.state in ['TURNED_IN', 'RETURNED']:
                estado = "Entregada"
            elif submission.state == 'CREATED':
                estado = "Borrador"
            else:
                estado = "Otro"
                
            fecha_entrega = submission.turned_in_at.strftime('%Y-%m-%d %H:%M:%S') if submission.turned_in_at else 'No entregada'
            es_tardia = 'Sí' if submission.late else 'No'
            calificacion = submission.assigned_grade if submission.assigned_grade is not None else ''
            borrador = submission.draft_grade if submission.draft_grade is not None else ''
            estado_detallado = submission.state
        else:
            estado = "Sin entregar"
            fecha_entrega = 'No entregada'
            es_tardia = 'No'
            calificacion = ''
            borrador = ''
            estado_detallado = 'NO_SUBMISSION'
        
        # Calculate percentage if we have grade and max points
        porcentaje = ''
        if calificacion and assignment.max_points:
            porcentaje = f"{(float(calificacion) / assignment.max_points * 100):.1f}%"
        
        row = [
            student.full_name or 'Sin nombre',
            student.email or 'Sin email',
            estado,
            fecha_entrega,
            es_tardia,
            calificacion,
            borrador,
            estado_detallado,
            assignment.max_points or '',
            porcentaje
        ]
        writer.writerow(row)
    
    # Prepare response
    csv_content = output.getvalue()
    output.close()
    
    # Generate filename
    safe_title = "".join(c for c in assignment.title if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
    filename = f"tarea_{safe_title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    logger.info(f"Exporting assignment {assignment_id} with {len(students)} students to CSV")
    
    # Return CSV file
    return Response(
        content=csv_content,
        media_type='text/csv; charset=utf-8',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition',
            'Cache-Control': 'no-cache',
        }
    )


@router.get("/{assignment_id}/summary")
async def export_assignment_summary(
    assignment_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
) -> dict:
    """Get export summary information"""
    
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

    # Get students count
    students_result = await session.execute(
        select(CourseParticipant).where(
            and_(
                CourseParticipant.course_id == assignment.course_id,
                CourseParticipant.role == ParticipantRole.STUDENT
            )
        )
    )
    students = students_result.scalars().all()
    
    # Get submissions count
    submissions_result = await session.execute(
        select(CourseSubmission).where(CourseSubmission.coursework_id == assignment_id)
    )
    submissions = submissions_result.scalars().all()
    
    return {
        "assignment": {
            "id": assignment.id,
            "title": assignment.title,
            "max_points": assignment.max_points,
            "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
        },
        "export_info": {
            "total_students": len(students),
            "total_submissions": len(submissions),
            "estimated_size": "Pequeño (< 1MB)" if len(students) < 100 else "Mediano (1-5MB)"
        }
    }
