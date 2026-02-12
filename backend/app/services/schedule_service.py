"""
Schedule service with caching
"""
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from app.services.schedule_parser import ScheduleParser
from app.schemas.schedule import ScheduleEvent


class ScheduleService:
    """Service for managing schedule requests with caching"""

    def __init__(self):
        """Initialize service with in-memory cache"""
        self._cache: Dict[str, tuple[datetime, List[ScheduleEvent]]] = {}
        self._cache_ttl = timedelta(hours=24)  # Cache for 24 hours

    async def get_schedule(
        self,
        username: str,
        password: str,
        base_plan_id: str,
        target_date: str,
        force_refresh: bool = False
    ) -> List[ScheduleEvent]:
        """
        Get schedule for a date with caching

        Args:
            username: EIOS username
            password: EIOS password
            base_plan_id: Base plan ID
            target_date: Date in YYYY-MM-DD format
            force_refresh: Force refresh from EIOS

        Returns:
            List of schedule events
        """
        # Create cache key
        cache_key = f"{username}:{target_date}"

        # Check cache if not forcing refresh
        if not force_refresh and cache_key in self._cache:
            cached_time, cached_events = self._cache[cache_key]

            # Check if cache is still valid
            if datetime.now() - cached_time < self._cache_ttl:
                return cached_events

        # Parse from EIOS
        parser = ScheduleParser(username, password, base_plan_id)
        events = await parser.get_schedule(target_date)

        # Store in cache
        self._cache[cache_key] = (datetime.now(), events)

        return events

    async def get_day_detail(
        self,
        username: str,
        password: str,
        base_plan_id: str,
        target_date: str
    ) -> List[ScheduleEvent]:
        """
        Get detailed schedule for a date (includes teacher information)

        Uses Day view which provides more details

        Args:
            username: EIOS username
            password: EIOS password
            base_plan_id: Base plan ID
            target_date: Date in YYYY-MM-DD format

        Returns:
            List of schedule events with teacher information
        """
        # Create cache key for detailed view
        cache_key = f"{username}:detail:{target_date}"

        # Check cache
        if cache_key in self._cache:
            cached_time, cached_events = self._cache[cache_key]

            # Check if cache is still valid
            if datetime.now() - cached_time < self._cache_ttl:
                return cached_events

        # Parse from EIOS using Day view
        parser = ScheduleParser(username, password, base_plan_id)
        events = await parser.get_day_detail(target_date)

        # Store in cache
        self._cache[cache_key] = (datetime.now(), events)

        return events

    async def get_event_detail(
        self,
        username: str,
        password: str,
        base_plan_id: str,
        target_date: str,
        start_time: str
    ) -> ScheduleEvent:
        """
        Get detailed information about a specific event

        Args:
            username: EIOS username
            password: EIOS password
            base_plan_id: Base plan ID
            target_date: Date in YYYY-MM-DD format
            start_time: Event start time in HH:MM format

        Returns:
            Schedule event with full details

        Raises:
            ValueError: If event not found
        """
        # Get all events for the day with details
        events = await self.get_day_detail(
            username=username,
            password=password,
            base_plan_id=base_plan_id,
            target_date=target_date
        )

        print(f"[DEBUG] get_event_detail: Looking for event at {start_time}")
        print(f"[DEBUG] get_event_detail: Found {len(events)} events for {target_date}")

        # Debug: print all available start times
        if events:
            print(f"[DEBUG] Available start times:")
            for event in events:
                print(f"  - {event.start_time}: {event.course_name}")

        # Find event by start time
        for event in events:
            if event.start_time == start_time:
                print(f"[DEBUG] Found matching event: {event.course_name}")
                return event

        # Event not found
        print(f"[DEBUG] No event found with start_time='{start_time}'")
        raise ValueError(f"Event not found for {target_date} at {start_time}")

    async def get_week_schedule(
        self,
        username: str,
        password: str,
        base_plan_id: str,
        start_date: str,
        force_refresh: bool = False
    ) -> Dict[str, List[ScheduleEvent]]:
        """
        Get schedule for a week using optimized Week view (one request)

        Args:
            username: EIOS username
            password: EIOS password
            base_plan_id: Base plan ID
            start_date: Week start date (YYYY-MM-DD) - navigates to week containing this date
            force_refresh: Force refresh from EIOS

        Returns:
            Dictionary mapping dates to events
        """
        # Create cache key for week
        cache_key = f"{username}:week:{start_date}"

        # Check cache if not forcing refresh
        if not force_refresh and cache_key in self._cache:
            cached_time, cached_week = self._cache[cache_key]

            # Check if cache is still valid
            if datetime.now() - cached_time < self._cache_ttl:
                print(f"✅ Using cached week schedule for {start_date}")
                return cached_week

        # Parse from EIOS using optimized Week view with date navigation
        parser = ScheduleParser(username, password, base_plan_id)
        events = await parser.get_week_schedule(target_date=start_date)

        # Group events by date
        week_schedule = {}
        for event in events:
            # Create date string in YYYY-MM-DD format
            date_str = f"{event.year}-{event.month:02d}-{event.day:02d}"

            if date_str not in week_schedule:
                week_schedule[date_str] = []

            week_schedule[date_str].append(event)

        # Store in cache
        self._cache[cache_key] = (datetime.now(), week_schedule)

        return week_schedule

    def clear_cache(self, username: Optional[str] = None):
        """
        Clear cache

        Args:
            username: If provided, clear only for this user. Otherwise, clear all.
        """
        if username:
            # Clear cache for specific user
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"{username}:")]
            for key in keys_to_remove:
                del self._cache[key]
        else:
            # Clear all cache
            self._cache.clear()


# Global service instance
schedule_service = ScheduleService()
