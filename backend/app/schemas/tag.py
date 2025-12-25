from pydantic import BaseModel
from datetime import datetime


class TagBase(BaseModel):
    key: str
    value: str


class TagCreate(TagBase):
    pass


class TagUpdate(TagBase):
    pass


class Tag(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

