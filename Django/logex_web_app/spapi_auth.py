"""
SP-API LWA (Login with Amazon) 認証クライアント
アクセストークンの取得とリフレッシュを管理
"""
import requests
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings


class LWAClient:
    """Login with Amazon (LWA) 認証クライアント"""

    LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"
    TOKEN_CACHE_PREFIX = "lwa_token_"

    def __init__(self, refresh_token: str):
        """
        Args:
            refresh_token: SP-APIリフレッシュトークン
        """
        self.refresh_token = refresh_token
        self.client_id = settings.SP_API_LWA_CLIENT_ID
        self.client_secret = settings.SP_API_LWA_CLIENT_SECRET

    def get_access_token(self) -> str:
        """
        アクセストークンを取得（キャッシュから取得、または新規取得）

        Returns:
            str: アクセストークン
        """
        # キャッシュキー（リフレッシュトークンの最後8文字をハッシュとして使用）
        cache_key = f"{self.TOKEN_CACHE_PREFIX}{self.refresh_token[-8:]}"

        # キャッシュからトークンを取得
        cached_token = cache.get(cache_key)
        if cached_token:
            return cached_token

        # 新しいトークンを取得
        token = self._request_new_access_token()

        # キャッシュに保存（有効期限の90%で期限切れ設定、安全マージン）
        cache.set(cache_key, token, timeout=3300)  # 55分（トークンは通常1時間有効）

        return token

    def _request_new_access_token(self) -> str:
        """
        LWA APIから新しいアクセストークンをリクエスト

        Returns:
            str: アクセストークン

        Raises:
            Exception: トークン取得失敗時
        """
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        response = requests.post(self.LWA_TOKEN_URL, data=payload)

        if response.status_code != 200:
            raise Exception(
                f"LWA token request failed: {response.status_code} - {response.text}"
            )

        data = response.json()
        return data["access_token"]
