from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    notification_type: str
    message: str
    expires_at: Optional[datetime] = None


class Notification(NotificationBase):
    id: int
    asset_id: Optional[int] = None
    asset_name: Optional[str] = None
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

