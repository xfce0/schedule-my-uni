"""
Custom exceptions for the application
"""


class InvalidTelegramDataError(Exception):
    """Raised when Telegram initData is invalid"""
    pass


class CredentialsNotFoundError(Exception):
    """Raised when user credentials are not found"""
    pass


class InvalidCredentialsError(Exception):
    """Raised when EIOS credentials are invalid"""
    pass


class ScheduleParsingError(Exception):
    """Raised when schedule parsing fails"""
    pass
