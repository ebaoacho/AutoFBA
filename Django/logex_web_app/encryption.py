import os
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

def _get_fernet() -> Fernet:
    # settings.SPAPI_ENCRYPTION_KEY に 32byte のURL-safe base64キーを設定しておく
    key = settings.SPAPI_ENCRYPTION_KEY
    if not key:
        raise RuntimeError("SPAPI_ENCRYPTION_KEY is not set.")
    return Fernet(key)

def encrypt_str(plaintext: str) -> str:
    if plaintext is None:
        return None
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")

def decrypt_str(ciphertext: str) -> str | None:
    if not ciphertext:
        return None
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # キーが変わった/壊れた場合
        return None
