"""
Feedback schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class FeedbackCreate(BaseModel):
    """Schema for creating feedback"""
    message: str = Field(..., min_length=1, max_length=5000)


class FeedbackResponse(BaseModel):
    """Schema for feedback response"""
    id: int
    user_id: Optional[int]
    telegram_id: int
    message: str
    status: str
    admin_reply: Optional[str]
    created_at: datetime
    replied_at: Optional[datetime]

    class Config:
        from_attributes = True
