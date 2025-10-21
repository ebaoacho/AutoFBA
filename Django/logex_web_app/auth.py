# logex_web_app/auth.py
from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    """
    Authorizationヘッダが無い場合、Cookieのaccess_tokenを使用して認証する。
    """
    def authenticate(self, request):
        # まずは通常のヘッダ認証を試す
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        # ヘッダが無ければ Cookie から拾う
        raw_token = request.COOKIES.get('access_token')
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
