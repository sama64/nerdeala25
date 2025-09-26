from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.etag_cache import EtagCache


async def get(session: AsyncSession, course_id: str, cache_key: str) -> str | None:
    result = await session.execute(
        select(EtagCache.etag).where(
            EtagCache.course_id == course_id,
            EtagCache.cache_key == cache_key,
        )
    )
    return result.scalar_one_or_none()


async def set(session: AsyncSession, course_id: str, cache_key: str, etag: str | None) -> None:
    instance = await session.get(EtagCache, {"course_id": course_id, "cache_key": cache_key})
    if instance is None:
        instance = EtagCache(course_id=course_id, cache_key=cache_key, etag=etag)
        session.add(instance)
    else:
        instance.etag = etag
    await session.flush()
