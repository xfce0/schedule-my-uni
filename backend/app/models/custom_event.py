"""
Custom event model
"""
from sqlalchemy import Column, BigInteger, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class CustomEvent(Base):
    """Custom event model - user-created weekly recurring classes"""

    __tablename__ = "custom_events"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Event details
    title = Column(String(500), nullable=False)  # Course name
    teacher = Column(String(255), nullable=True)  # Optional teacher name
    room = Column(String(100), nullable=True)  # Optional room number
    address = Column(String(255), nullable=True)  # Optional address
    description = Column(Text, nullable=True)  # Optional description
    event_type = Column(String(50), default="custom")  # custom, tutoring, etc.
    color = Column(String(7), default="#8b5cf6")  # Purple color for custom events

    # Recurrence (always true for weekly classes)
    is_recurring = Column(Boolean, default=True)

    # Recurrence rule - JSON structure:
    # {
    #   "1": [{"start": "10:00", "end": "11:00"}, {"start": "14:00", "end": "15:00"}],
    #   "3": [{"start": "10:00", "end": "11:00"}],
    #   "5": [{"start": "14:00", "end": "15:00"}]
    # }
    # Keys: ISO day of week (1=Monday, 2=Tuesday, ..., 7=Sunday)
    # Values: Array of time slots (max 5 per day)
    # Each time slot: {"start": "HH:MM", "end": "HH:MM"}
    recurrence_rule = Column(JSON, nullable=False)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="custom_events")

    def __repr__(self):
        return f"<CustomEvent(id={self.id}, title={self.title}, user_id={self.user_id})>"
