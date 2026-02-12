"""
Homework schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional, List


class AttachmentBase(BaseModel):
    """Attachment data"""
    type: str  # "file", "link", "image"
    name: str
    url: str
    size: Optional[int] = None


class HomeworkCreate(BaseModel):
    """Schema for creating homework note linked to a class"""
    course_name: str = Field(..., min_length=1, max_length=200)
    class_date: date  # Date of the class
    class_time: Optional[str] = None  # Time of class (e.g., "13:00")
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    # Optional fields (for backward compatibility)
    due_date: Optional[datetime] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    attachments: Optional[List[AttachmentBase]] = None


class HomeworkUpdate(BaseModel):
    """Schema for updating homework"""
    course_name: Optional[str] = Field(None, min_length=1, max_length=200)
    class_date: Optional[date] = None
    class_time: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    attachments: Optional[List[AttachmentBase]] = None


class HomeworkComplete(BaseModel):
    """Schema for marking homework as complete/incomplete"""
    is_completed: bool


class HomeworkResponse(BaseModel):
    """Schema for homework response"""
    id: int
    user_id: int
    course_name: str
    class_date: date
    class_time: Optional[str]
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    is_completed: bool
    completed_at: Optional[datetime]
    priority: Optional[str]
    attachments: Optional[List[AttachmentBase]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
