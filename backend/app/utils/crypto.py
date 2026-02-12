"""
Encryption utilities for sensitive data
"""
from cryptography.fernet import Fernet
from app.config import settings


class CryptoService:
    """Service for encrypting and decrypting sensitive data"""

    def __init__(self):
        """Initialize with encryption key from settings"""
        # Ensure key is in bytes
        key = settings.ENCRYPTION_KEY
        if isinstance(key, str):
            key = key.encode()
        self.cipher = Fernet(key)

    def encrypt(self, text: str) -> str:
        """
        Encrypt text

        Args:
            text: Plain text to encrypt

        Returns:
            Encrypted text as string
        """
        return self.cipher.encrypt(text.encode()).decode()

    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt text

        Args:
            encrypted_text: Encrypted text

        Returns:
            Decrypted plain text
        """
        return self.cipher.decrypt(encrypted_text.encode()).decode()


# Global crypto service instance
crypto_service = CryptoService()
