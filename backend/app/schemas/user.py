"""
User and authentication schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TelegramUser(BaseModel):
    """Telegram user data"""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = "ru"


class UserCreate(BaseModel):
    """Create user"""
    telegram_id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    language_code: str = "ru"


class UserResponse(BaseModel):
    """User response"""
    id: int
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    language_code: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CredentialsSave(BaseModel):
    """Save EIOS credentials"""
    eios_username: str = Field(..., min_length=3, description="EIOS username")
    eios_password: str = Field(..., min_length=3, description="EIOS password")
    base_plan_id: Optional[str] = Field(None, description="Base plan ID (auto-fetched if not provided)")


class CredentialsResponse(BaseModel):
    """Credentials response (password not included)"""
    eios_username: str
    base_plan_id: str
    is_valid: bool
    last_verified_at: Optional[datetime]

    class Config:
        from_attributes = True


class AuthInitRequest(BaseModel):
    """Authentication initialization request"""
    init_data: str = Field(..., description="Telegram WebApp initData")


class AuthInitResponse(BaseModel):
    """Authentication initialization response"""
    user_id: int
    is_new_user: bool
    needs_credentials: bool


class CredentialsCheckResponse(BaseModel):
    """Check if user has credentials"""
    has_credentials: bool
