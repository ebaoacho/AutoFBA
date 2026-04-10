"""
SP-API Login with Amazon (LWA) helpers.
"""
import requests
from urllib.parse import urlencode
from django.core.cache import cache
from django.conf import settings


class LWAClient:
    """Login with Amazon (LWA) token helper"""

    LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"
    TOKEN_CACHE_PREFIX = "lwa_token_"
    AUTHORIZE_URL = getattr(
        settings,
        "SP_API_LWA_AUTHORIZE_URL",
        "https://sellercentral.amazon.co.jp/apps/authorize/consent",
    )

    def __init__(self, refresh_token: str):
        self.refresh_token = refresh_token
        self.client_id = settings.SP_API_LWA_CLIENT_ID
        self.client_secret = settings.SP_API_LWA_CLIENT_SECRET

    @classmethod
    def build_authorization_url(cls, state: str, redirect_uri: str) -> str:
        application_id = getattr(settings, "SP_API_APP_ID", None)
        if not application_id:
            raise Exception("SP_API_APP_ID is not configured")

        params = {
            "application_id": application_id,
            "state": state,
            "version": "beta",
        }
        return f"{cls.AUTHORIZE_URL}?{urlencode(params)}"

    @classmethod
    def exchange_authorization_code(cls, code: str, redirect_uri: str) -> dict:
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.SP_API_LWA_CLIENT_ID,
            "client_secret": settings.SP_API_LWA_CLIENT_SECRET,
        }
        response = requests.post(cls.LWA_TOKEN_URL, data=payload)
        if response.status_code != 200:
            raise Exception(
                f"LWA authorization_code exchange failed: {response.status_code} - {response.text}"
            )
        data = response.json()
        if "refresh_token" not in data:
            raise Exception("LWA response did not include refresh_token")
        return data

    def get_access_token(self) -> str:
        cache_key = f"{self.TOKEN_CACHE_PREFIX}{self.refresh_token[-8:]}"
        cached_token = cache.get(cache_key)
        if cached_token:
            return cached_token

        token = self._request_new_access_token()
        cache.set(cache_key, token, timeout=3300)  # reuse until near expiry (55m)
        return token

    def _request_new_access_token(self) -> str:
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
