from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings


async_engine = create_async_engine(settings.database_url, future=True, echo=False)

AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

sync_engine = create_engine(settings.sync_database_url, future=True, echo=False)
SessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False, class_=Session)

Base = declarative_base()


async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


def get_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
