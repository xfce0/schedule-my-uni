"""
Async schedule parser for EIOS MГЛУ
Adapted from schedule_final.py for async/await with httpx
"""
import httpx
import re
import base64
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from app.schemas.schedule import ScheduleEvent


class ScheduleParser:
    """Async parser for EIOS MГЛУ schedule"""

    MONTH_NAMES = {
        1: "января", 2: "февраля", 3: "марта", 4: "апреля",
        5: "мая", 6: "июня", 7: "июля", 8: "августа",
        9: "сентября", 10: "октября", 11: "ноября", 12: "декабря"
    }

    @staticmethod
    async def get_base_plan_id(username: str, password: str) -> str:
        """
        Automatically fetch base_plan_id from EIOS student profile

        Args:
            username: EIOS username
            password: EIOS password

        Returns:
            base_plan_id as string

        Raises:
            ValueError: If base_plan_id cannot be found
        """
        profile_url = "https://eios.linguanet.ru/_layouts/sinc/ia/v1.0/pages/MyStudentProfile.aspx"

        # Create auth header
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers = {
            "Authorization": f"Basic {credentials}",
            "User-Agent": "Mozilla/5.0"
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Get profile page
            response = await client.get(profile_url, headers=headers)

            if response.status_code != 200:
                raise ValueError(f"Failed to fetch profile page: HTTP {response.status_code}")

            # Parse HTML with BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find schedule link (Расписание занятий)
            schedule_link = soup.find('a', string=re.compile(r'Расписание', re.IGNORECASE))

            if not schedule_link:
                raise ValueError("Schedule link not found in profile page")

            href = schedule_link.get('href')
            if not href:
                raise ValueError("Schedule link has no href attribute")

            # Extract base_plan_id from URL
            match = re.search(r'base_plan_ids=(\d+)', href)
            if not match:
                raise ValueError("base_plan_id not found in schedule link")

            return match.group(1)

    def __init__(self, username: str, password: str, base_plan_id: str):
        """Initialize parser with credentials"""
        self.username = username
        self.password = password
        self.base_plan_id = base_plan_id
        self.schedule_url = f"https://eios.linguanet.ru/_layouts/sinc/ia/v1.0/pages/MySchedule.aspx?base_plan_ids={base_plan_id}"

        # Create auth header
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {credentials}",
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
        }

    async def get_schedule(self, target_date: str) -> List[ScheduleEvent]:
        """
        Get schedule for a specific date using Timeline view

        Timeline view shows ALL events including remote/distance classes.
        Note: Teacher information is not available in Timeline view.

        Args:
            target_date: Date in "YYYY-MM-DD" format

        Returns:
            List of ScheduleEvent objects
        """
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Step 1: Get ViewState and cookies
            response1 = await client.get(self.schedule_url, headers=self.headers)

            # Set important cookies
            cookies = {
                'WSS_FullScreenMode': 'false',
                'PHPSESSID': '1qm42fdkq88k0eqkqnmq7vomrj'
            }
            for name, value in cookies.items():
                client.cookies.set(name, value, domain='eios.linguanet.ru')

            # Extract hidden form fields
            form_data = self._extract_form_data(response1.text)

            if not form_data.get("__VIEWSTATE"):
                raise ValueError("Failed to extract ViewState")

            headers_with_referer = {**self.headers, "Referer": self.schedule_url}

            # Step 2: Switch to Timeline view
            # Timeline view shows ALL events including remote classes
            form_data["__CALLBACKID"] = "ctl00$PlaceHolderMain$_scheduler_ASPxScheduler"
            form_data["__CALLBACKPARAM"] = "c0:SAVT|Timeline"

            response2 = await client.post(
                self.schedule_url,
                data=form_data,
                headers=headers_with_referer
            )

            print(f"✅ Timeline view loaded, parsing events...")

            # Parse Timeline view events
            all_events = self._parse_response(response2.text)

            # Filter by target date if specified
            if target_date:
                dt = datetime.strptime(target_date, "%Y-%m-%d")
                events = [
                    e for e in all_events
                    if e.day == dt.day and e.month == dt.month and e.year == dt.year
                ]
                print(f"✅ Filtered {len(events)} events for {target_date}")
                return events

            return all_events

    def _extract_form_data(self, html: str) -> Dict[str, str]:
        """Extract hidden form fields from HTML"""
        form_data = {}

        # Extract all hidden inputs
        hidden_pattern = r'<input[^>]+type=["\']hidden["\'][^>]*>'
        hidden_inputs = re.findall(hidden_pattern, html, re.IGNORECASE)

        for input_tag in hidden_inputs:
            name_match = re.search(r'name=["\']([^"\']+)["\']', input_tag)
            value_match = re.search(r'value=["\']([^"\']*)["\']', input_tag)

            if name_match:
                name = name_match.group(1)
                value = value_match.group(1) if value_match else ""
                form_data[name] = value

        return form_data

    def _extract_result_from_aspx_callback(self, response_text: str) -> str:
        """
        Extract 'result' field from DevExpress ASPxScheduler callback response.
        Format: <meta1>,<meta2>,<contentLength>,<flags>|<controlId><blockId><htmlContent>

        The result field contains the actual schedule data with CreateAppointmentsViewInfos calls.
        """
        # Check if this looks like a callback response with 'result' field
        if "'result'" in response_text or '"result"' in response_text:
            # Look for the 'result' field in the callback response
            # Format example: 'result':'46,70,51,0|...'
            result_match = re.search(r"['\"]result['\"]\s*:\s*['\"]([^'\"]+(?:\\['\"][^'\"]*)*)['\"]", response_text, re.DOTALL)
            if result_match:
                # Unescape the result content
                result_content = result_match.group(1)
                # Unescape JavaScript string escapes
                result_content = result_content.replace("\\'", "'").replace('\\"', '"')
                print(f"   DEBUG: Extracted result field ({len(result_content)} chars)")
                # The result contains blocks separated by |
                # We need to extract the script blocks that contain CreateAppointmentsViewInfos
                return result_content
            else:
                print("   DEBUG: Found 'result' keyword but could not extract it")

        # Fallback: if no result field found, return original text
        print(f"   DEBUG: No result field found, using original response ({len(response_text)} chars)")
        return response_text

    def _parse_response(self, text: str) -> List[ScheduleEvent]:
        """Parse schedule from response - supports both Timeline (type=1) and Day (type=2) views"""
        events = []

        # Timeline view format (type=1): ['ID',1,['Course','start','end',...],[Date...]]
        # Day view format (type=2): ['ID',2,['Course\r\nDetails\r\n(пр: Teacher)\r\nGroup','start','end'],[Date...]]

        # NOTE: For now, we skip ASPX callback extraction because the 'result' field
        # doesn't contain CreateAppointmentsViewInfos - it's in the main response body
        # text = self._extract_result_from_aspx_callback(text)

        # Extract the CreateAppointmentsViewInfos array content directly from response
        array_match = re.search(r'CreateAppointmentsViewInfos\(\[(.*)\]\)', text, re.DOTALL)
        if not array_match:
            print("   _parse_response: No CreateAppointmentsViewInfos found")
            return events

        array_content = array_match.group(1)

        # New approach: find event start markers and split there
        # Each event starts with [\'EVENT_ID\',
        # Find all event start positions
        event_pattern = r"\[\\'(\d+_\d+)\\'"
        event_markers = [(m.start(), m.group(1)) for m in re.finditer(event_pattern, array_content)]

        if len(event_markers) == 0:
            matches = []
        else:
            # Split content by event markers
            event_chunks = []
            for i, (pos, event_id) in enumerate(event_markers):
                next_pos = event_markers[i+1][0] if i+1 < len(event_markers) else len(array_content)
                chunk = array_content[pos:next_pos]
                # Remove trailing separator if present
                if chunk.endswith("],[\\'"):
                    chunk = chunk[:-4] + ']'
                event_chunks.append(chunk)

            # Now parse each chunk with simple regex (won't cross event boundaries)
            # IMPORTANT: Use \d{1,2} for hours to match both single-digit (8:00) and double-digit (10:50) times
            simple_pattern = r"\[\\'(\d+)_\d+\\',([12]),\[\\'(.+?)\\',\\'(\d{1,2}:\d{2})\\',\\'(\d{1,2}:\d{2})\\'.*?\],\[new Date\((\d{4}),(\d+),(\d+)"

            matches = []
            for i, chunk in enumerate(event_chunks):
                m = re.search(simple_pattern, chunk, re.DOTALL)
                if m:
                    matches.append(m)

        for match in matches:
            try:
                event_type = int(match.group(2))  # 1=Timeline, 2=Day
                full_string = match.group(3)
                start_time = match.group(4)
                end_time = match.group(5)

                # Extract date from Date object
                year = int(match.group(6))
                month = int(match.group(7)) + 1  # JavaScript months are 0-indexed
                day = int(match.group(8))

                # Parse based on event type
                if event_type == 2:
                    # Day view format - has \\r\\n separators
                    parts = full_string.split('\\\\r\\\\n')
                    course_name = parts[0]
                    details = parts[1].lstrip('-').strip() if len(parts) > 1 else ""

                    # Extract teacher
                    teacher = ""
                    if len(parts) > 2:
                        teacher_match = re.search(r'\(пр:\s*([^)]+)\)', parts[2])
                        if teacher_match:
                            teacher = teacher_match.group(1).strip()

                    # Extract group and meeting link from parts[3]
                    group = ""
                    meeting_link = ""
                    if len(parts) > 3:
                        groups_and_link = parts[3]

                        # Extract meeting link (both domains: linguanet and my)
                        link_match = re.search(r'https://(?:linguanet|my)\.mts-link\.ru/j/[^\s\\]+', groups_and_link)
                        if link_match:
                            meeting_link = link_match.group(0)
                            # Remove link from group string
                            groups_and_link = groups_and_link.replace(meeting_link, '').strip()

                        # Clean up group string
                        group = re.sub(r'\s+', ' ', groups_and_link).strip(', ')
                else:
                    # Timeline view format - simpler, just course name
                    course_name = full_string
                    details = ""
                    teacher = ""
                    group = ""
                    meeting_link = ""

                # Create event object
                event_data = {
                    "course_name": course_name,
                    "teacher": teacher,
                    "start_time": start_time,
                    "end_time": end_time,
                    "group": group,
                    "meeting_link": meeting_link,
                    "event_type": "",
                    "room": "",
                    "address": "",
                    "day": day,
                    "month": month,
                    "year": year,
                    "start_date": f"{day} {self.MONTH_NAMES.get(month, '')} {year}" if month else ""
                }

                # Parse details (type, room, address) if available
                if details:
                    self._parse_details(details, event_data)

                # Create Pydantic model
                event = ScheduleEvent(**event_data)
                events.append(event)

            except Exception as e:
                # Log error but continue parsing
                print(f"Warning: Failed to parse event: {e}")
                continue

        return events

    def _parse_details(self, details: str, event: Dict):
        """Parse details string to extract type, room, and address"""
        # Format: "Практическое занятие ауд.626 (Комсомольский пр-кт, д.6)"

        # Event type
        if "Лекция" in details:
            event["event_type"] = "Лекция"
        elif "Практическое занятие" in details:
            event["event_type"] = "Практическое занятие"
        elif "Семинар" in details:
            event["event_type"] = "Семинар"

        # Room number
        room_match = re.search(r'ауд\.?\s*(\d+)', details)
        if room_match:
            event["room"] = room_match.group(1)

        # Address
        addr_match = re.search(r'\(([^)]+)\)', details)
        if addr_match:
            event["address"] = addr_match.group(1)

    async def get_week_schedule(self, target_date: Optional[str] = None) -> List[ScheduleEvent]:
        """
        Get schedule for the whole week using Week view (one request)

        More efficient than calling get_schedule() 7 times.
        Week view returns all events for the current week or specified week.

        Args:
            target_date: Optional date in YYYY-MM-DD format to navigate to.
                        If None, returns current week.

        Returns:
            List of ScheduleEvent objects for the entire week
        """
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Step 1: Get ViewState and cookies
            response1 = await client.get(self.schedule_url, headers=self.headers)

            # Set important cookies
            cookies = {
                'WSS_FullScreenMode': 'false'
            }
            for name, value in cookies.items():
                client.cookies.set(name, value, domain='eios.linguanet.ru')

            # Extract hidden form fields
            form_data = self._extract_form_data(response1.text)

            if not form_data.get("__VIEWSTATE"):
                raise ValueError("Failed to extract ViewState")

            headers_with_referer = {**self.headers, "Referer": self.schedule_url}

            form_data["__CALLBACKID"] = "ctl00$PlaceHolderMain$_scheduler_ASPxScheduler"

            # If target_date is provided, use GOTODATEFORM to navigate to that week
            if target_date:
                # Parse target date
                target_dt = datetime.strptime(target_date, "%Y-%m-%d")

                # JavaScript months are 0-indexed (0=January, 1=February, etc.)
                js_month = target_dt.month - 1

                # Build GOTODATEFORM callback parameter
                # Format: c0:GOTODATEFORM|{"newDate":new Date(year,month-1,day),"newViewType":"Week"}
                callback_param = f'c0:GOTODATEFORM|{{"newDate":new Date({target_dt.year},{js_month},{target_dt.day}),"newViewType":"Week"}}'
                form_data["__CALLBACKPARAM"] = callback_param

                print(f"🔄 Navigating to week containing {target_date} using GOTODATEFORM...")
            else:
                # Just switch to Week view for current week
                form_data["__CALLBACKPARAM"] = "c0:SAVT|Week"
                print(f"🔄 Loading current week...")

            response2 = await client.post(
                self.schedule_url,
                data=form_data,
                headers=headers_with_referer
            )

            print(f"✅ Week view loaded ({len(response2.text)} chars), parsing events...")

            # Parse Week view events using existing parser
            events = self._parse_week_response(response2.text)

            print(f"✅ Found {len(events)} events for the week")
            return events

    def _parse_week_response(self, text: str) -> List[ScheduleEvent]:
        """Parse schedule from Week view response"""
        events = []

        # Week view format (type=0): [\'ID\',0,[\'Full text-Type ауд.Room (Address)\',\'start\',\'end\',...]]
        # IMPORTANT: Use \d{1,2} for hours to match both single-digit (8:00) and double-digit (10:50) times
        pattern = r"\[\\'(\d+)_\d+\\',0,\[\\'([^\\']+)\\',\\'(\d{1,2}:\d{2})\\',\\'(\d{1,2}:\d{2})\\'.*?\],\[new Date\((\d{4}),(\d+),(\d+)"

        matches = list(re.finditer(pattern, text))
        print(f"   Found {len(matches)} events in Week view")

        for match in matches:
            try:
                full_text = match.group(2)
                start_time = match.group(3)
                end_time = match.group(4)

                # Extract date from Date object
                year = int(match.group(5))
                month = int(match.group(6)) + 1  # JavaScript months are 0-indexed
                day = int(match.group(7))

                # Parse full text: "Course name-Type ауд.Room (Address)"
                # or: "Course name-Type Дистанционное занятие"
                parts = full_text.split('-', 1)

                if len(parts) < 2:
                    continue

                course_name = parts[0].strip()
                rest = parts[1].strip()

                # Initialize event data
                event_data = {
                    "course_name": course_name,
                    "teacher": "",
                    "start_time": start_time,
                    "end_time": end_time,
                    "group": "",
                    "event_type": "",
                    "room": "",
                    "address": "",
                    "day": day,
                    "month": month,
                    "year": year,
                    "start_date": f"{day} {self.MONTH_NAMES.get(month, '')} {year}"
                }

                # Parse type and location from rest
                self._parse_week_event_details(rest, event_data)

                # Create Pydantic model
                event = ScheduleEvent(**event_data)
                events.append(event)

            except Exception as e:
                print(f"Warning: Failed to parse week event: {e}")
                continue

        return events

    def _parse_week_event_details(self, details: str, event: Dict):
        """Parse event details from Week view format"""
        # Check for online/distance learning
        if "дистанционн" in details.lower():
            event["address"] = "Онлайн"
            # Extract type before "Дистанционное"
            type_match = re.match(r'([^\s]+(?:\s+[^\s]+)?)\s+[Дд]истанционн', details)
            if type_match:
                event_type = type_match.group(1).strip()
                event["event_type"] = self._normalize_event_type(event_type)
            return

        # Extract type (Лекция, Практическое занятие, etc.)
        type_keywords = [
            "Лекция",
            "Практическое занятие",
            "Семинар",
            "Лабораторная работа",
            "Консультация"
        ]

        for keyword in type_keywords:
            if keyword in details:
                event["event_type"] = self._normalize_event_type(keyword)
                # Remove type to get location
                details = details.replace(keyword, '').strip()
                break

        # Extract room from "ауд.206" or "Большой спорт.зал"
        room_match = re.search(r'ауд\.([^\s(]+)', details)
        if room_match:
            event["room"] = room_match.group(1).strip()
        else:
            # Try to find room before address in parentheses
            before_paren = re.match(r'([^(]+)\s*\(', details)
            if before_paren:
                potential_room = before_paren.group(1).strip()
                # Remove "ауд." prefix if exists
                potential_room = re.sub(r'^ауд\.', '', potential_room).strip()
                if potential_room:
                    event["room"] = potential_room

        # Extract address from parentheses
        addr_match = re.search(r'\(([^)]+)\)', details)
        if addr_match:
            event["address"] = addr_match.group(1).strip()

    def _normalize_event_type(self, event_type: str) -> str:
        """Normalize event type to short form in UPPERCASE"""
        type_lower = event_type.lower()

        if "лекц" in type_lower:
            return "ЛЕКЦИЯ"
        elif "практ" in type_lower:
            return "ПРАКТ. ЗАНЯТИЕ"
        elif "семинар" in type_lower:
            return "СЕМИНАР"
        elif "лаб" in type_lower:
            return "ЛАБ. РАБОТА"
        elif "консультац" in type_lower:
            return "КОНСУЛЬТАЦИЯ"
        else:
            return event_type.upper()

    async def get_day_detail(self, target_date: str) -> List[ScheduleEvent]:
        """
        Get detailed schedule for a specific date using Day view with smart navigation

        Day view provides more details including teacher information.
        Uses FORWARD for tomorrow, MOREBTN for other dates, with Week view fallback.

        Args:
            target_date: Date in "YYYY-MM-DD" format

        Returns:
            List of ScheduleEvent objects with teacher information when available
        """
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Step 1: Get ViewState and cookies
            response1 = await client.get(self.schedule_url, headers=self.headers)

            cookies = {
                'WSS_FullScreenMode': 'false',
                'PHPSESSID': '1qm42fdkq88k0eqkqnmq7vomrj'
            }
            for name, value in cookies.items():
                client.cookies.set(name, value, domain='eios.linguanet.ru')

            form_data = self._extract_form_data(response1.text)

            if not form_data.get("__VIEWSTATE"):
                raise ValueError("Failed to extract ViewState")

            headers_with_referer = {**self.headers, "Referer": self.schedule_url}

            # Step 2: Switch to Day view first
            form_data["__CALLBACKID"] = "ctl00$PlaceHolderMain$_scheduler_ASPxScheduler"
            form_data["__CALLBACKPARAM"] = "c0:SAVT|Day"

            response2 = await client.post(
                self.schedule_url,
                data=form_data,
                headers=headers_with_referer
            )

            print(f"✅ Day view set ({len(response2.text)} chars)")

            # Extract current date from Day view
            current_date_match = re.search(r"'visibleDays':'(\d+)/(\d+)/(\d+)'", response2.text)

            target_dt = datetime.strptime(target_date, "%Y-%m-%d")

            # Determine navigation strategy
            use_forward = False
            if current_date_match:
                current_day = int(current_date_match.group(1))
                current_month = int(current_date_match.group(2))
                current_year = int(current_date_match.group(3))
                current_dt = datetime(current_year, current_month, current_day)

                print(f"📅 Current date in calendar: {current_dt.strftime('%Y-%m-%d')}")

                # Check if target is tomorrow (FORWARD works best for this)
                if (target_dt - current_dt).days == 1:
                    use_forward = True
                    print(f"📅 Target is tomorrow, using FORWARD navigation")
                elif target_dt == current_dt:
                    print(f"📅 Already on target date!")
                    events = self._parse_response(response2.text)
                    print(f"✅ Found {len(events)} events for {target_date}")
                    return events

            # Update ViewState from response
            viewstate_match = re.search(r"'__VIEWSTATE'\s*:\s*'([^']+)'", response2.text)
            if viewstate_match:
                form_data["__VIEWSTATE"] = viewstate_match.group(1)

            # Step 3: Navigate using appropriate method
            if use_forward:
                # Use FORWARD callback (works reliably for tomorrow)
                form_data["__CALLBACKPARAM"] = "c0:FORWARD|"
                print(f"📅 Navigating to {target_date} using FORWARD")
            else:
                # Use MOREBTN callback with timestamp
                target_timestamp = int(target_dt.timestamp() * 1000)
                day_ms = 86400000
                callback_param = f'c0:MOREBTN|{target_timestamp + day_ms},{target_timestamp},{day_ms},null'
                form_data["__CALLBACKPARAM"] = callback_param
                print(f"📅 Navigating to {target_date} using MOREBTN")

            response3 = await client.post(
                self.schedule_url,
                data=form_data,
                headers=headers_with_referer
            )

            # Verify navigation
            visible_match = re.search(r"'visibleDays':'([^']+)'", response3.text)
            if visible_match:
                visible_date = visible_match.group(1)
                print(f"📅 Date in response: {visible_date}")

                expected_date = f"{target_dt.day}/{target_dt.month}/{target_dt.year}"
                if visible_date == expected_date:
                    print(f"✅ Successfully navigated to {target_date}")
                else:
                    print(f"⚠️  Expected {expected_date}, got {visible_date}")

            # Check for empty schedule markers
            is_empty = (
                "CreateAppointmentsViewInfos([])" in response3.text or
                "CreateAppointments([])" in response3.text
            )

            print(f"✅ Day view loaded for {target_date}, parsing detailed events...")

            # Parse Day view events (includes teacher info and meeting links)
            events = self._parse_response(response3.text)

            if len(events) == 0 and is_empty:
                print(f"⚠️  Navigation returned empty schedule, trying Week view fallback...")

                # Fallback: Get Week view and filter by date
                # Note: Week view doesn't include teacher information
                week_events = await self.get_week_schedule()

                # Filter events for target date
                events = [
                    e for e in week_events
                    if e.day == target_dt.day and e.month == target_dt.month and e.year == target_dt.year
                ]

                if events:
                    print(f"✅ Week view fallback found {len(events)} events (no teacher info)")
                else:
                    print(f"ℹ️  No events found in Week view either (likely a day off)")

            print(f"✅ Found {len(events)} detailed events for {target_date}")
            return events
