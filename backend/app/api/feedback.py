"""
Feedback API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.utils.dependencies import get_init_data
from app.utils.validation import extract_user_from_init_data
from app.services.telegram_service import telegram_service

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    feedback_data: FeedbackCreate,
    init_data: str = Depends(get_init_data),
    db: AsyncSession = Depends(get_db)
):
    """Create new feedback message"""
    telegram_user = extract_user_from_init_data(init_data)
    if not telegram_user:
        raise HTTPException(status_code=400, detail="Could not extract user data")

    # Try to find user (feedback allowed even if user not in DB yet)
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_user["id"])
    )
    user = result.scalar_one_or_none()

    # Create feedback
    feedback = Feedback(
        user_id=user.id if user else None,
        telegram_id=telegram_user["id"],
        message=feedback_data.message,
        status="new"
    )

    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    # Send notification to admin
    await telegram_service.send_feedback_notification(
        telegram_id=telegram_user["id"],
        username=telegram_user.get("username"),
        message=feedback_data.message
    )

    return feedback
