"""
Schedule API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.credentials import UserCredentials
from app.models.custom_event import CustomEvent
from app.schemas.schedule import ScheduleEvent, DaySchedule, WeekSchedule
from app.services.schedule_service import schedule_service
from app.utils.dependencies import get_current_user
from app.utils.crypto import crypto_service

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


def expand_custom_events_for_dates(
    custom_events: List[CustomEvent],
    date_strings: List[str]
) -> Dict[str, List[ScheduleEvent]]:
    """
    Expand custom recurring events into actual events for specific dates

    Args:
        custom_events: List of custom events with recurrence rules
        date_strings: List of date strings in YYYY-MM-DD format

    Returns:
        Dictionary mapping dates to list of ScheduleEvent objects
    """
    expanded = {}

    # For each date in the list
    for date_str in date_strings:
        current_date = datetime.strptime(date_str, "%Y-%m-%d")
        iso_weekday = current_date.isoweekday()  # 1=Monday, 7=Sunday

        # Check each custom event
        for event in custom_events:
            # Check if event occurs on this day of week
            day_key = str(iso_weekday)
            if day_key in event.recurrence_rule:
                # Get time slots for this day
                time_slots = event.recurrence_rule[day_key]

                # Create a ScheduleEvent for each time slot
                for slot in time_slots:
                    schedule_event = ScheduleEvent(
                        course_name=event.title,
                        teacher=event.teacher or "",
                        start_time=slot["start"],
                        end_time=slot["end"],
                        event_type=event.event_type.upper(),
                        room=event.room or "",
                        address=event.address or "",
                        group="",
                        meeting_link="",
                        day=current_date.day,
                        month=current_date.month,
                        year=current_date.year,
                        start_date=current_date.strftime("%d %B %Y"),
                        is_custom=True,  # Mark as custom event
                        custom_event_id=event.id,
                        color=event.color
                    )

                    if date_str not in expanded:
                        expanded[date_str] = []
                    expanded[date_str].append(schedule_event)

    return expanded


def expand_custom_events_for_week(
    custom_events: List[CustomEvent],
    start_date_str: str,
    num_days: int = 14
) -> Dict[str, List[ScheduleEvent]]:
    """
    Expand custom recurring events into actual events for the week
    DEPRECATED: Use expand_custom_events_for_dates instead

    Args:
        custom_events: List of custom events with recurrence rules
        start_date_str: Start date in YYYY-MM-DD format (from API request)
        num_days: Number of days to expand (default 14 for 2 weeks)

    Returns:
        Dictionary mapping dates to list of ScheduleEvent objects
    """
    # Generate list of dates
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    date_strings = [
        (start_date + __import__('datetime').timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(num_days)
    ]

    return expand_custom_events_for_dates(custom_events, date_strings)


async def get_user_credentials(
    user: User,
    db: AsyncSession
) -> tuple[str, str, str]:
    """
    Helper to get decrypted credentials for an authenticated user.

    Returns: (username, password, base_plan_id)
    """
    cred_result = await db.execute(
        select(UserCredentials).where(UserCredentials.user_id == user.id)
    )
    credentials = cred_result.scalar_one_or_none()

    if not credentials:
        raise HTTPException(
            status_code=404,
            detail="Credentials not found. Please save your EIOS credentials first."
        )

    # Decrypt password
    password = crypto_service.decrypt(credentials.eios_password_encrypted)

    if not credentials.base_plan_id:
        raise HTTPException(
            status_code=400,
            detail="Base plan ID not found. Please re-save your credentials in the Auth page."
        )

    return credentials.eios_username, password, credentials.base_plan_id


@router.get("/day", response_model=List[ScheduleEvent])
async def get_day_schedule(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    force_refresh: bool = Query(False, description="Force refresh from EIOS"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get schedule for a specific day

    Returns list of schedule events with teacher information
    """
    username, password, base_plan_id = await get_user_credentials(user, db)

    try:
        # Get schedule from service
        events = await schedule_service.get_schedule(
            username=username,
            password=password,
            base_plan_id=base_plan_id,
            target_date=date,
            force_refresh=force_refresh
        )

        return events

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch schedule: {str(e)}"
        )


@router.get("/week", response_model=dict)
async def get_week_schedule(
    start_date: str = Query(..., description="Week start date (YYYY-MM-DD)"),
    force_refresh: bool = Query(False, description="Force refresh from EIOS"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get schedule for a week (7 days starting from start_date)

    Returns dictionary mapping dates to events
    """
    username, password, base_plan_id = await get_user_credentials(user, db)

    try:
        # Get official schedule from EIOS
        eios_schedule = await schedule_service.get_week_schedule(
            username=username,
            password=password,
            base_plan_id=base_plan_id,
            start_date=start_date,
            force_refresh=force_refresh
        )

        # Create a new dictionary with copies of lists to avoid modifying cached data
        # Using dict comprehension instead of deepcopy for better compatibility with Pydantic models
        week_schedule = {
            date_str: list(events)  # Create a new list with the same event objects
            for date_str, events in eios_schedule.items()
        }

        # Get user's custom events
        custom_events_result = await db.execute(
            select(CustomEvent).where(CustomEvent.user_id == user.id)
        )
        custom_events = custom_events_result.scalars().all()

        # CRITICAL FIX: Expand custom events for EXACT dates from EIOS schedule
        # This ensures custom events appear on the correct days regardless of when the week starts
        eios_dates = list(eios_schedule.keys())
        custom_schedule = expand_custom_events_for_dates(custom_events, eios_dates)

        # Merge custom events with official schedule
        for date_str, custom_events_list in custom_schedule.items():
            if date_str in week_schedule:
                # Add all custom events for this date
                week_schedule[date_str].extend(custom_events_list)
            else:
                # Create new list for dates with only custom events
                week_schedule[date_str] = list(custom_events_list)

        # Sort events by start time for each day
        for date_str in week_schedule:
            week_schedule[date_str].sort(
                key=lambda e: datetime.strptime(e.start_time, "%H:%M").time()
            )

        return week_schedule

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch week schedule: {str(e)}"
        )


@router.get("/event-detail", response_model=ScheduleEvent)
async def get_event_detail(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    start_time: str = Query(..., description="Start time in HH:MM format"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific event

    Checks custom events first, then falls back to EIOS
    """
    username, password, base_plan_id = await get_user_credentials(user, db)

    try:
        # Parse date to get day of week
        event_date = datetime.strptime(date, "%Y-%m-%d")
        iso_weekday = event_date.isoweekday()  # 1=Monday, 7=Sunday
        day_key = str(iso_weekday)

        # Check custom events first
        custom_events_result = await db.execute(
            select(CustomEvent).where(CustomEvent.user_id == user.id)
        )
        custom_events = custom_events_result.scalars().all()

        # Look for matching custom event
        for custom_event in custom_events:
            if day_key in custom_event.recurrence_rule:
                time_slots = custom_event.recurrence_rule[day_key]
                for slot in time_slots:
                    if slot["start"] == start_time:
                        # Found matching custom event - return it
                        return ScheduleEvent(
                            course_name=custom_event.title,
                            teacher=custom_event.teacher or "",
                            start_time=slot["start"],
                            end_time=slot["end"],
                            event_type=custom_event.event_type.upper(),
                            room=custom_event.room or "",
                            address=custom_event.address or "",
                            group="",
                            meeting_link="",
                            day=event_date.day,
                            month=event_date.month,
                            year=event_date.year,
                            start_date=event_date.strftime("%d %B %Y"),
                            is_custom=True,
                            custom_event_id=custom_event.id,
                            color=custom_event.color
                        )

        # Not a custom event - get from EIOS
        event = await schedule_service.get_event_detail(
            username=username,
            password=password,
            base_plan_id=base_plan_id,
            target_date=date,
            start_time=start_time
        )

        return event

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch event detail: {str(e)}"
        )


@router.get("/day-detail", response_model=List[ScheduleEvent])
async def get_day_detail(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed schedule for a specific day (includes teacher information and custom events)

    Uses Day view which provides more details including teacher names
    """
    username, password, base_plan_id = await get_user_credentials(user, db)

    try:
        # Get detailed schedule from EIOS
        events = await schedule_service.get_day_detail(
            username=username,
            password=password,
            base_plan_id=base_plan_id,
            target_date=date
        )

        # Parse date to get day of week
        event_date = datetime.strptime(date, "%Y-%m-%d")
        iso_weekday = event_date.isoweekday()
        day_key = str(iso_weekday)

        # Get custom events for this day
        custom_events_result = await db.execute(
            select(CustomEvent).where(CustomEvent.user_id == user.id)
        )
        custom_events = custom_events_result.scalars().all()

        # Add custom events that occur on this day
        for custom_event in custom_events:
            if day_key in custom_event.recurrence_rule:
                time_slots = custom_event.recurrence_rule[day_key]
                for slot in time_slots:
                    events.append(ScheduleEvent(
                        course_name=custom_event.title,
                        teacher=custom_event.teacher or "",
                        start_time=slot["start"],
                        end_time=slot["end"],
                        event_type=custom_event.event_type.upper(),
                        room=custom_event.room or "",
                        address=custom_event.address or "",
                        group="",
                        meeting_link="",
                        day=event_date.day,
                        month=event_date.month,
                        year=event_date.year,
                        start_date=event_date.strftime("%d %B %Y"),
                        is_custom=True,
                        custom_event_id=custom_event.id,
                        color=custom_event.color
                    ))

        # Sort by start time
        events.sort(key=lambda e: datetime.strptime(e.start_time, "%H:%M").time())

        return events

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch detailed schedule: {str(e)}"
        )


@router.delete("/cache")
async def clear_schedule_cache(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear schedule cache for current user"""
    username, _, _ = await get_user_credentials(user, db)

    # Clear cache for this user
    schedule_service.clear_cache(username=username)

    return {"success": True, "message": "Cache cleared"}
