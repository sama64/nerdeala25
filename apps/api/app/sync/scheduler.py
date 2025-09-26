from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

try:  # pragma: no cover - optional dependency guard
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger
except ImportError:  # pragma: no cover - fallback when apscheduler is absent
    AsyncIOScheduler = None  # type: ignore[assignment]
    IntervalTrigger = None  # type: ignore[assignment]

from app.services.google_sync import sync_delta_courses, sync_full_metadata

logger = logging.getLogger("nerdeala.classroom.scheduler")

_scheduler: AsyncIOScheduler | None = None


TokenProvider = Callable[[], Awaitable[list[tuple[str, str]]]]


def start_scheduler(
    token_provider: TokenProvider,
) -> AsyncIOScheduler | None:
    global _scheduler
    if AsyncIOScheduler is None or IntervalTrigger is None:
        logger.warning("Apscheduler no está disponible; el scheduler se deshabilita")
        return None

    if _scheduler is not None:
        logger.debug("Scheduler ya inicializado")
        return _scheduler

    scheduler = AsyncIOScheduler(timezone="UTC")

    async def delta_job() -> None:
        tokens = await _safe_tokens(token_provider)
        if not tokens:
            logger.debug("Sin usuarios con token para delta sync")
            return
        for user_id, token in tokens:
            try:
                await sync_delta_courses(token)
            except Exception:  # pragma: no cover - defensive logging
                logger.exception("Error en delta sync para usuario %s", user_id)

    async def full_job() -> None:
        tokens = await _safe_tokens(token_provider)
        if not tokens:
            logger.debug("Sin usuarios con token para full sync")
            return
        for user_id, token in tokens:
            try:
                await sync_full_metadata(token)
            except Exception:  # pragma: no cover - defensive logging
                logger.exception("Error en full sync para usuario %s", user_id)

    scheduler.add_job(
        delta_job,
        IntervalTrigger(minutes=5),
        id="classroom-delta",
        max_instances=1,
        replace_existing=True,
        coalesce=True,
    )
    scheduler.add_job(
        full_job,
        IntervalTrigger(hours=6),
        id="classroom-full",
        max_instances=1,
        replace_existing=True,
        coalesce=True,
    )

    scheduler.start()
    _scheduler = scheduler
    logger.info("Scheduler de Classroom iniciado")
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.info("Apagando scheduler de Classroom")
        _scheduler.shutdown(wait=False)
    _scheduler = None


async def _safe_tokens(
    token_provider: TokenProvider,
) -> list[tuple[str, str]]:
    try:
        return await token_provider()
    except Exception:  # pragma: no cover - defensive logging
        logger.exception("No se pudieron obtener tokens para el scheduler")
        return []


__all__ = ["start_scheduler", "shutdown_scheduler"]
