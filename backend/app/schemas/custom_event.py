"""
Custom event schemas
"""
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, field_serializer


class TimeSlot(BaseModel):
    """Single time slot for a custom event"""
    start: str = Field(..., pattern=r'^\d{1,2}:\d{2}$', description="Start time in HH:MM format")
    end: str = Field(..., pattern=r'^\d{1,2}:\d{2}$', description="End time in HH:MM format")


class CustomEventCreate(BaseModel):
    """Schema for creating a custom event"""
    title: str = Field(..., min_length=1, max_length=500, description="Course/event name")
    teacher: str | None = Field(None, max_length=255, description="Optional teacher name")
    room: str | None = Field(None, max_length=100, description="Optional room number")
    address: str | None = Field(None, max_length=255, description="Optional address")
    description: str | None = Field(None, description="Optional description")
    event_type: str = Field(default="custom", max_length=50)
    color: str = Field(default="#8b5cf6", pattern=r'^#[0-9A-Fa-f]{6}$')

    # Recurrence rule: {day_of_week: [time_slots]}
    # day_of_week: 1-7 (Monday-Sunday)
    # time_slots: max 5 per day
    recurrence_rule: Dict[str, List[TimeSlot]] = Field(
        ...,
        description="Weekly recurrence: {day: [time_slots]}, max 5 slots per day"
    )

    @field_validator('recurrence_rule')
    @classmethod
    def validate_recurrence_rule(cls, v):
        """Validate recurrence rule"""
        if not v:
            raise ValueError("At least one day must be specified")

        for day, time_slots in v.items():
            # Validate day of week (1-7)
            try:
                day_num = int(day)
                if not (1 <= day_num <= 7):
                    raise ValueError(f"Invalid day of week: {day}. Must be 1-7 (Monday-Sunday)")
            except ValueError:
                raise ValueError(f"Invalid day format: {day}. Must be a number 1-7")

            # Validate number of time slots
            if len(time_slots) > 5:
                raise ValueError(f"Maximum 5 time slots allowed per day, got {len(time_slots)}")

            if len(time_slots) == 0:
                raise ValueError(f"At least one time slot required for day {day}")

        return v


class CustomEventUpdate(BaseModel):
    """Schema for updating a custom event"""
    title: str | None = Field(None, min_length=1, max_length=500)
    teacher: str | None = Field(None, max_length=255)
    room: str | None = Field(None, max_length=100)
    address: str | None = Field(None, max_length=255)
    description: str | None = None
    event_type: str | None = Field(None, max_length=50)
    color: str | None = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    recurrence_rule: Dict[str, List[TimeSlot]] | None = None

    @field_validator('recurrence_rule')
    @classmethod
    def validate_recurrence_rule(cls, v):
        """Validate recurrence rule if provided"""
        if v is None:
            return v

        if not v:
            raise ValueError("At least one day must be specified")

        for day, time_slots in v.items():
            try:
                day_num = int(day)
                if not (1 <= day_num <= 7):
                    raise ValueError(f"Invalid day of week: {day}")
            except ValueError:
                raise ValueError(f"Invalid day format: {day}")

            if len(time_slots) > 5:
                raise ValueError(f"Maximum 5 time slots allowed per day")

            if len(time_slots) == 0:
                raise ValueError(f"At least one time slot required")

        return v


class CustomEventResponse(BaseModel):
    """Schema for custom event response"""
    id: int
    user_id: int
    title: str
    teacher: str | None
    room: str | None
    address: str | None
    description: str | None
    event_type: str
    color: str
    is_recurring: bool
    recurrence_rule: Dict[str, List[TimeSlot]]
    created_at: datetime
    updated_at: datetime

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime, _info) -> str:
        """Serialize datetime to ISO string"""
        return dt.isoformat()

    model_config = {"from_attributes": True}
