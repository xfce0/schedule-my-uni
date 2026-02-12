"""
Pydantic schemas for schedule
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


class ScheduleEvent(BaseModel):
    """Single schedule event"""

    course_name: str = Field(..., description="Course name")
    teacher: str = Field(default="", description="Teacher name")
    start_time: str = Field(..., description="Start time (HH:MM)")
    end_time: str = Field(..., description="End time (HH:MM)")
    event_type: str = Field(default="", description="Event type (Лекция, Практическое занятие, etc.)")
    room: str = Field(default="", description="Room number")
    address: str = Field(default="", description="Building address")
    group: str = Field(default="", description="Student group")
    meeting_link: str = Field(default="", description="Online meeting link (e.g., mts-link.ru)")
    day: int = Field(..., description="Day of month")
    month: int = Field(..., description="Month number (1-12)")
    year: int = Field(..., description="Year")
    start_date: str = Field(default="", description="Formatted date string")

    # Custom event fields
    is_custom: bool = Field(default=False, description="True if this is a custom event")
    custom_event_id: Optional[int] = Field(default=None, description="ID of custom event (if custom)")
    color: Optional[str] = Field(default=None, description="Color for custom events")

    model_config = ConfigDict(
        populate_by_name=True,
        # Serialize using field names, not aliases
        by_alias=False
    )


class DaySchedule(BaseModel):
    """Schedule for a specific day"""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    events: List[ScheduleEvent] = Field(default_factory=list, description="List of events")


class WeekSchedule(BaseModel):
    """Schedule for a week"""

    start_date: str = Field(..., description="Week start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Week end date (YYYY-MM-DD)")
    days: dict[str, DaySchedule] = Field(default_factory=dict, description="Schedule by date")


class ScheduleRequest(BaseModel):
    """Request for schedule"""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    force_refresh: bool = Field(default=False, description="Force refresh from EIOS")
