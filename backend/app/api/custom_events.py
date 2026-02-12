"""
Custom events API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.custom_event import CustomEvent
from app.schemas.custom_event import CustomEventCreate, CustomEventUpdate, CustomEventResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/custom-events", tags=["custom-events"])


@router.post("", response_model=CustomEventResponse, status_code=201)
async def create_custom_event(
    event: CustomEventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new custom event"""
    # Convert recurrence_rule to dict format for JSON storage
    recurrence_dict = {
        day: [slot.model_dump() for slot in slots]
        for day, slots in event.recurrence_rule.items()
    }

    custom_event = CustomEvent(
        user_id=user.id,
        title=event.title,
        teacher=event.teacher,
        room=event.room,
        address=event.address,
        description=event.description,
        event_type=event.event_type,
        color=event.color,
        is_recurring=True,
        recurrence_rule=recurrence_dict
    )

    db.add(custom_event)
    await db.commit()
    await db.refresh(custom_event)

    return custom_event


@router.get("", response_model=List[CustomEventResponse])
async def get_custom_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all custom events for current user"""
    result = await db.execute(
        select(CustomEvent).where(CustomEvent.user_id == user.id)
    )
    events = result.scalars().all()

    return events


@router.get("/{event_id}", response_model=CustomEventResponse)
async def get_custom_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific custom event"""
    result = await db.execute(
        select(CustomEvent).where(
            CustomEvent.id == event_id,
            CustomEvent.user_id == user.id
        )
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Custom event not found")

    return event


@router.put("/{event_id}", response_model=CustomEventResponse)
async def update_custom_event(
    event_id: int,
    event_update: CustomEventUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a custom event"""
    result = await db.execute(
        select(CustomEvent).where(
            CustomEvent.id == event_id,
            CustomEvent.user_id == user.id
        )
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Custom event not found")

    # Update fields
    if event_update.title is not None:
        event.title = event_update.title
    if event_update.teacher is not None:
        event.teacher = event_update.teacher
    if event_update.room is not None:
        event.room = event_update.room
    if event_update.address is not None:
        event.address = event_update.address
    if event_update.description is not None:
        event.description = event_update.description
    if event_update.event_type is not None:
        event.event_type = event_update.event_type
    if event_update.color is not None:
        event.color = event_update.color
    if event_update.recurrence_rule is not None:
        recurrence_dict = {
            day: [slot.model_dump() for slot in slots]
            for day, slots in event_update.recurrence_rule.items()
        }
        event.recurrence_rule = recurrence_dict

    await db.commit()
    await db.refresh(event)

    return event


@router.delete("/{event_id}")
async def delete_custom_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom event"""
    result = await db.execute(
        delete(CustomEvent).where(
            CustomEvent.id == event_id,
            CustomEvent.user_id == user.id
        )
    )

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Custom event not found")

    await db.commit()
    return {"success": True}
