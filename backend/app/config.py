"""
Application configuration
"""
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List, Union


class Settings(BaseSettings):
    """Application settings"""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/mydb"
    PGBOUNCER_URL: str = "postgresql+asyncpg://user:password@localhost:6432/mydb"

    # Telegram
    TELEGRAM_BOT_TOKEN: str
    ADMIN_TELEGRAM_ID: int

    # Security
    ENCRYPTION_KEY: str
    SECRET_KEY: str

    # CORS - can be comma-separated string or list
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    @model_validator(mode='after')
    def parse_cors_origins(self):
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.ALLOWED_ORIGINS, str):
            self.ALLOWED_ORIGINS = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',')]
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()
