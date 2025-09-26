from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.db.session import Base


class EtagCache(Base):
    __tablename__ = "etag_cache"

    course_id = Column(String, primary_key=True)
    cache_key = Column(String, primary_key=True)
    etag = Column(String, nullable=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
