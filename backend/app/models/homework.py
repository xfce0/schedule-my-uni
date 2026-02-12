"""
Homework model
"""
from sqlalchemy import Column, BigInteger, String, Text, DateTime, Boolean, ForeignKey, Date, Time
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Homework(Base):
    """Homework model - homework notes linked to specific classes"""

    __tablename__ = "homework"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_name = Column(String(500), nullable=False)

    # Link to specific class
    class_date = Column(Date, nullable=False, index=True)  # Date of the class
    class_time = Column(String(20), nullable=True)  # Time of class (e.g., "13:00")

    # Homework note
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    # Optional fields (kept for backward compatibility)
    due_date = Column(DateTime(timezone=True), nullable=True, index=True)
    priority = Column(String(20), nullable=True)  # low, medium, high

    # Status
    is_completed = Column(Boolean, default=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    attachments = Column(JSONB, nullable=True)  # [{name: "file.pdf", url: "...", size: 1024}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="homework")

    def __repr__(self):
        return f"<Homework(id={self.id}, title={self.title}, user_id={self.user_id})>"
