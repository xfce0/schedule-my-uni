"""
Shared FastAPI dependencies for authentication
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.utils.validation import validate_telegram_init_data, extract_user_from_init_data


def get_init_data(request: Request) -> str:
    """Extract and validate X-Telegram-Init-Data header"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=401, detail="X-Telegram-Init-Data header is required")

    if not validate_telegram_init_data(init_data):
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    return init_data


async def get_current_user(
    init_data: str = Depends(get_init_data),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the authenticated user from Telegram initData.

    Validates the initData (hash + auth_date), extracts telegram_id,
    and returns the User from the database.

    Raises HTTPException 401 if validation fails or user not found.
    """
    telegram_user = extract_user_from_init_data(init_data)
    if not telegram_user:
        raise HTTPException(status_code=400, detail="Could not extract user data")

    telegram_id = telegram_user["id"]

    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
