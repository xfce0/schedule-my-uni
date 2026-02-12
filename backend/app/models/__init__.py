"""
Models package - imports all models for Alembic discovery
"""
from app.models.user import User
from app.models.credentials import UserCredentials
from app.models.custom_event import CustomEvent
from app.models.homework import Homework
from app.models.feedback import Feedback

__all__ = [
    "User",
    "UserCredentials",
    "CustomEvent",
    "Homework",
    "Feedback",
]
