"""
Telegram service for sending notifications
"""
import httpx
from typing import Optional
from app.config import settings


class TelegramService:
    """Service for sending Telegram bot notifications"""

    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.admin_id = settings.ADMIN_TELEGRAM_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"

    async def send_message(
        self,
        chat_id: int,
        text: str,
        parse_mode: Optional[str] = "HTML"
    ) -> bool:
        """
        Send message via Telegram bot

        Args:
            chat_id: Telegram chat ID
            text: Message text
            parse_mode: Parse mode (HTML, Markdown, MarkdownV2)

        Returns:
            True if sent successfully, False otherwise
        """
        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return True
        except httpx.HTTPError as e:
            print(f"Failed to send Telegram message: {e}")
            return False

    async def notify_admin(self, text: str) -> bool:
        """
        Send notification to admin

        Args:
            text: Message text

        Returns:
            True if sent successfully, False otherwise
        """
        return await self.send_message(self.admin_id, text)

    async def send_feedback_notification(
        self,
        telegram_id: int,
        username: Optional[str],
        message: str
    ) -> bool:
        """
        Send feedback notification to admin

        Args:
            telegram_id: User's Telegram ID
            username: User's username (optional)
            message: Feedback message

        Returns:
            True if sent successfully, False otherwise
        """
        user_info = f"@{username}" if username else f"User ID: {telegram_id}"

        notification_text = f"""
🆕 <b>New Feedback</b>

<b>From:</b> {user_info}
<b>Telegram ID:</b> <code>{telegram_id}</code>

<b>Message:</b>
{message}
""".strip()

        return await self.notify_admin(notification_text)


# Global service instance
telegram_service = TelegramService()
