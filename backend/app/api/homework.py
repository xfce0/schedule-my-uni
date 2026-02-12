"""
Homework API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.homework import Homework
from app.schemas.homework import (
    HomeworkCreate,
    HomeworkUpdate,
    HomeworkComplete,
    HomeworkResponse
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/homework", tags=["homework"], redirect_slashes=False)


@router.post("", response_model=HomeworkResponse, status_code=201)
async def create_homework(
    homework_data: HomeworkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new homework note for a specific class"""
    # Convert attachments to dict format for JSONB
    attachments_json = None
    if homework_data.attachments:
        attachments_json = [att.model_dump() for att in homework_data.attachments]

    homework = Homework(
        user_id=user.id,
        course_name=homework_data.course_name,
        class_date=homework_data.class_date,
        class_time=homework_data.class_time,
        title=homework_data.title,
        description=homework_data.description,
        due_date=homework_data.due_date,
        priority=homework_data.priority,
        attachments=attachments_json
    )

    db.add(homework)
    await db.commit()
    await db.refresh(homework)

    return homework


@router.get("", response_model=List[HomeworkResponse])
async def get_homework_list(
    is_completed: Optional[bool] = Query(None),
    course_name: Optional[str] = Query(None),
    class_date: Optional[str] = Query(None),
    class_time: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of homework with optional filters"""
    query = select(Homework).where(Homework.user_id == user.id)

    if is_completed is not None:
        query = query.where(Homework.is_completed == is_completed)

    if course_name:
        query = query.where(Homework.course_name.ilike(f"%{course_name}%"))

    if class_date:
        # Convert date to string for comparison (DATE column to VARCHAR)
        from sqlalchemy import func, cast, String
        query = query.where(func.to_char(Homework.class_date, 'YYYY-MM-DD') == class_date)

    if class_time:
        query = query.where(Homework.class_time == class_time)

    query = query.order_by(Homework.class_date.desc(), Homework.class_time.desc())

    result = await db.execute(query)
    homework_list = result.scalars().all()

    return homework_list


@router.get("/{homework_id}", response_model=HomeworkResponse)
async def get_homework(
    homework_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single homework by ID"""
    result = await db.execute(
        select(Homework).where(
            and_(
                Homework.id == homework_id,
                Homework.user_id == user.id
            )
        )
    )
    homework = result.scalar_one_or_none()

    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    return homework


@router.put("/{homework_id}", response_model=HomeworkResponse)
async def update_homework(
    homework_id: int,
    homework_data: HomeworkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update homework"""
    result = await db.execute(
        select(Homework).where(
            and_(
                Homework.id == homework_id,
                Homework.user_id == user.id
            )
        )
    )
    homework = result.scalar_one_or_none()

    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    # Update fields
    update_data = homework_data.model_dump(exclude_unset=True)

    # Handle attachments separately
    if "attachments" in update_data and update_data["attachments"] is not None:
        update_data["attachments"] = [att.model_dump() for att in homework_data.attachments]

    for field, value in update_data.items():
        setattr(homework, field, value)

    await db.commit()
    await db.refresh(homework)

    return homework


@router.patch("/{homework_id}/complete", response_model=HomeworkResponse)
async def toggle_homework_complete(
    homework_id: int,
    complete_data: HomeworkComplete,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark homework as complete or incomplete"""
    result = await db.execute(
        select(Homework).where(
            and_(
                Homework.id == homework_id,
                Homework.user_id == user.id
            )
        )
    )
    homework = result.scalar_one_or_none()

    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    homework.is_completed = complete_data.is_completed
    homework.completed_at = datetime.now() if complete_data.is_completed else None

    await db.commit()
    await db.refresh(homework)

    return homework


@router.delete("/{homework_id}")
async def delete_homework(
    homework_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete homework"""
    result = await db.execute(
        select(Homework).where(
            and_(
                Homework.id == homework_id,
                Homework.user_id == user.id
            )
        )
    )
    homework = result.scalar_one_or_none()

    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    await db.delete(homework)
    await db.commit()

    return {"success": True, "message": "Homework deleted successfully"}
