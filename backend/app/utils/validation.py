"""
Telegram WebApp data validation

Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
import hmac
import hashlib
import time
from urllib.parse import parse_qs
from typing import Optional, Dict
from app.config import settings

# Maximum age of initData in seconds (5 minutes)
MAX_AUTH_DATE_AGE = 900


def validate_telegram_init_data(init_data: str) -> bool:
    """
    Validate Telegram WebApp initData.

    Checks:
    1. HMAC-SHA256 hash signature (using bot token)
    2. auth_date is present and not older than MAX_AUTH_DATE_AGE seconds

    Args:
        init_data: The initData string from Telegram WebApp

    Returns:
        True if valid, False otherwise
    """
    try:
        if not init_data:
            print("❌ Validation failed: empty initData")
            return False

        # Development mode bypass
        if settings.ENVIRONMENT == "development" and init_data == "dev":
            print("✅ Dev mode bypass")
            return True

        # Log first 100 chars of initData for debugging
        print(f"🔍 Validating initData (first 100 chars): {init_data[:100]}...")

        # Parse query string
        parsed_data = parse_qs(init_data)

        # Extract hash
        hash_received = parsed_data.get("hash", [""])[0]
        if not hash_received:
            print("❌ Validation failed: no hash in initData")
            return False

        print(f"📝 Hash received: {hash_received[:16]}...")

        # Check auth_date exists and is not expired
        auth_date_str = parsed_data.get("auth_date", [""])[0]
        if not auth_date_str:
            print("❌ Validation failed: no auth_date in initData")
            return False

        try:
            auth_date = int(auth_date_str)
        except ValueError:
            print("❌ Validation failed: auth_date is not a valid integer")
            return False

        current_time = int(time.time())
        age = current_time - auth_date
        if age > MAX_AUTH_DATE_AGE:
            print(f"❌ Validation failed: initData expired (age={age}s, max={MAX_AUTH_DATE_AGE}s)")
            return False

        # Create data_check_string (all parameters except hash, sorted)
        data_check_arr = []
        for key, values in sorted(parsed_data.items()):
            if key != "hash":
                data_check_arr.append(f"{key}={values[0]}")

        data_check_string = "\n".join(data_check_arr)
        print(f"📋 Data check string length: {len(data_check_string)}")

        # Create secret key
        secret_key = hmac.new(
            "WebAppData".encode(),
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()

        # Calculate hash
        hash_calculated = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        print(f"🔐 Hash calculated: {hash_calculated[:16]}...")

        is_valid = hash_calculated == hash_received
        if is_valid:
            print("✅ Validation successful!")
        else:
            print("❌ Validation failed: hash mismatch")

        return is_valid

    except Exception as e:
        print(f"❌ Validation error: {e}")
        import traceback
        traceback.print_exc()
        return False


def extract_user_from_init_data(init_data: str) -> Optional[Dict]:
    """
    Extract user data from Telegram initData

    Args:
        init_data: The initData string from Telegram WebApp

    Returns:
        Dictionary with user data or None
    """
    try:
        # Development mode bypass - return test user
        if settings.ENVIRONMENT == "development" and init_data == "dev":
            return {
                "id": settings.ADMIN_TELEGRAM_ID,
                "first_name": "Dev",
                "last_name": "User",
                "username": "devuser"
            }

        parsed_data = parse_qs(init_data)
        user_data = parsed_data.get("user", [""])[0]

        if not user_data:
            return None

        import json
        user = json.loads(user_data)
        return user

    except Exception:
        return None
