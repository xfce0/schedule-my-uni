"""
Simple Telegram bot for MSLU Schedule Mini App
Responds to /start command and provides link to the mini app
"""
import asyncio
import logging
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get bot token from environment
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is not set")

# Initialize bot and dispatcher
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """
    Handle /start command
    Send welcome message with inline keyboard to open mini app
    """
    welcome_text = (
        "👋 Привет! Я бот для управления расписанием МГЛУ.\n\n"
        "📚 <b>Что я умею:</b>\n"
        "• Показываю расписание занятий с информацией о преподавателях\n"
        "• Помогаю управлять домашними заданиями\n\n"
        "🔓 <b>Opensource проект</b>\n"
        "Вы всегда можете проверить код приложения на "
        '<a href="https://github.com/xfce0/schedule-my-uni">GitHub</a>\n\n'
        "Нажмите кнопку ниже, чтобы открыть приложение:"
    )

    # Create inline keyboard with mini app button
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Открыть приложение",
                    web_app=WebAppInfo(url="https://example.com")
                )
            ],
            [
                InlineKeyboardButton(
                    text="💻 Исходный код",
                    url="https://github.com/xfce0/schedule-my-uni"
                )
            ]
        ]
    )

    await message.answer(
        welcome_text,
        reply_markup=keyboard,
        parse_mode="HTML",
        disable_web_page_preview=True
    )

    logger.info(f"User {message.from_user.id} ({message.from_user.username}) started the bot")


async def main():
    """
    Main function to start the bot
    """
    logger.info("Starting MSLU Schedule Bot...")

    # Delete webhook to use polling
    await bot.delete_webhook(drop_pending_updates=True)

    # Start polling
    logger.info("Bot is running. Press Ctrl+C to stop.")
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Error running bot: {e}")
        raise
