from collections.abc import Sequence
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report
from app.schemas.report import ReportCreate
from app.utils.ids import generate_id


async def get(session: AsyncSession, report_id: str) -> Report | None:
    result = await session.execute(select(Report).where(Report.id == report_id))
    return result.scalar_one_or_none()


async def list_reports(
    session: AsyncSession,
    student_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[Report]:
    query = select(Report)
    if student_id:
        query = query.where(Report.student_id == student_id)
    result = await session.execute(
        query.order_by(Report.generated_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


async def create(session: AsyncSession, payload: ReportCreate) -> Report:
    report = Report(
        id=payload.id or generate_id(),
        student_id=payload.student_id,
        data=payload.data,
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return report


async def delete(session: AsyncSession, report: Report) -> None:
    await session.delete(report)
    await session.commit()
