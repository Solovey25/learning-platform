from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationBase(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationBase]


class UnreadCountResponse(BaseModel):
    count: int

