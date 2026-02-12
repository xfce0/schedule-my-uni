"""
User profile API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.credentials import UserCredentials
from app.schemas.user import UserResponse, CredentialsResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    user: User = Depends(get_current_user),
):
    """Get user profile"""
    return user


@router.get("/credentials", response_model=CredentialsResponse)
async def get_credentials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user credentials (password not included)"""
    cred_result = await db.execute(
        select(UserCredentials).where(UserCredentials.user_id == user.id)
    )
    credentials = cred_result.scalar_one_or_none()

    if not credentials:
        raise HTTPException(status_code=404, detail="Credentials not found")

    return credentials


@router.delete("/credentials")
async def delete_credentials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete user credentials"""
    cred_result = await db.execute(
        select(UserCredentials).where(UserCredentials.user_id == user.id)
    )
    credentials = cred_result.scalar_one_or_none()

    if credentials:
        await db.delete(credentials)
        await db.commit()

    return {"success": True, "message": "Credentials deleted successfully"}
