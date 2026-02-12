"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.credentials import UserCredentials
from app.schemas.user import (
    AuthInitRequest,
    AuthInitResponse,
    CredentialsSave,
    CredentialsCheckResponse
)
from app.utils.validation import validate_telegram_init_data, extract_user_from_init_data
from app.utils.dependencies import get_init_data, get_current_user
from app.utils.crypto import crypto_service
from app.services.schedule_parser import ScheduleParser

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/init", response_model=AuthInitResponse)
async def init_user(
    request: AuthInitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initialize user on first app launch.
    Validates Telegram initData and creates user if needed.
    This endpoint is special: it creates users, so it can't use get_current_user.
    """
    # Validate Telegram data
    if not validate_telegram_init_data(request.init_data):
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    # Extract user info
    telegram_user = extract_user_from_init_data(request.init_data)
    if not telegram_user:
        raise HTTPException(status_code=400, detail="Could not extract user data")

    telegram_id = telegram_user["id"]

    # Check if user exists
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()

    is_new_user = False

    if not user:
        # Create new user
        user = User(
            telegram_id=telegram_id,
            username=telegram_user.get("username"),
            first_name=telegram_user.get("first_name"),
            last_name=telegram_user.get("last_name"),
            language_code=telegram_user.get("language_code", "ru")
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        is_new_user = True

    # Check if user has credentials
    cred_result = await db.execute(
        select(UserCredentials).where(UserCredentials.user_id == user.id)
    )
    credentials = cred_result.scalar_one_or_none()

    return AuthInitResponse(
        user_id=user.id,
        is_new_user=is_new_user,
        needs_credentials=credentials is None
    )


@router.get("/check", response_model=CredentialsCheckResponse)
async def check_credentials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user has saved credentials"""
    cred_result = await db.execute(
        select(UserCredentials).where(UserCredentials.user_id == user.id)
    )
    credentials = cred_result.scalar_one_or_none()

    return CredentialsCheckResponse(has_credentials=credentials is not None)


@router.post("/credentials")
async def save_credentials(
    credentials: CredentialsSave,
    init_data: str = Depends(get_init_data),
    db: AsyncSession = Depends(get_db)
):
    """Save EIOS credentials"""
    telegram_user = extract_user_from_init_data(init_data)
    if not telegram_user:
        raise HTTPException(status_code=400, detail="Could not extract user data")

    # Get or create user
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_user["id"])
    )
    user = result.scalar_one_or_none()

    if not user:
        # Create user if doesn't exist
        user = User(
            telegram_id=telegram_user["id"],
            username=telegram_user.get("username"),
            first_name=telegram_user.get("first_name"),
            last_name=telegram_user.get("last_name"),
            language_code=telegram_user.get("language_code", "ru")
        )
        db.add(user)
        await db.flush()

    # Encrypt password
    encrypted_password = crypto_service.encrypt(credentials.eios_password)

    # Get base_plan_id automatically if not provided
    base_plan_id = credentials.base_plan_id
    if not base_plan_id:
        try:
            base_plan_id = await ScheduleParser.get_base_plan_id(
                credentials.eios_username,
                credentials.eios_password
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch base_plan_id from EIOS: {str(e)}"
            )

    # Check if credentials already exist
    cred_result = await db.execute(
        select(UserCredentials).where(UserCredentials.user_id == user.id)
    )
    existing_cred = cred_result.scalar_one_or_none()

    if existing_cred:
        # Update
        existing_cred.eios_username = credentials.eios_username
        existing_cred.eios_password_encrypted = encrypted_password
        existing_cred.base_plan_id = base_plan_id
        existing_cred.updated_at = datetime.now()
    else:
        # Create new
        new_cred = UserCredentials(
            user_id=user.id,
            eios_username=credentials.eios_username,
            eios_password_encrypted=encrypted_password,
            base_plan_id=base_plan_id
        )
        db.add(new_cred)

    await db.commit()

    return {"success": True, "message": "Credentials saved successfully"}
