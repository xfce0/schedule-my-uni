"""
User credentials model
"""
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class UserCredentials(Base):
    """User credentials model - stores encrypted EIOS credentials"""

    __tablename__ = "user_credentials"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    eios_username = Column(String(255), nullable=False)
    eios_password_encrypted = Column(Text, nullable=False)  # AES-256 encrypted
    base_plan_id = Column(String(50), nullable=True)
    is_valid = Column(Boolean, default=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="credentials")

    def __repr__(self):
        return f"<UserCredentials(id={self.id}, user_id={self.user_id}, username={self.eios_username})>"
