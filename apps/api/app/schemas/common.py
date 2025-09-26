from datetime import datetime
from pydantic import BaseModel, Field


class ORMModel(BaseModel):
    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }


class TimestampedModel(ORMModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IdentifiedModel(TimestampedModel):
    id: str
