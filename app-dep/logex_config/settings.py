from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

load_dotenv()  # .env を読み込む

# カンマ区切りで分割
CHATWORK_API_TOKENS = [t.strip() for t in os.getenv('CHATWORK_API_TOKENS', '').split(',') if t.strip()]


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

CORS_ALLOW_CREDENTIALS = True

ALLOWED_HOSTS = ["autofba.net", "www.autofba.net"]

CORS_ALLOWED_ORIGINS = [
    "https://autofba.net",
    "https://www.autofba.net",
]

CSRF_TRUSTED_ORIGINS = [
    "https://autofba.net",
    "https://www.autofba.net",
]

HOSTENV_DIR = "/run/hostenv"
PRIVATE_IP_FILE = os.path.join(HOSTENV_DIR, "private_ip")

def _append_unique(lst, item):
    if item and item not in lst:
        lst.append(item)
        
try:
    if os.path.exists(PRIVATE_IP_FILE):
        with open(PRIVATE_IP_FILE, "r", encoding="utf-8") as f:
            private_ip = f.read().strip()
            if private_ip:
                # ALLOWED_HOSTS には IP をそのまま
                _append_unique(ALLOWED_HOSTS, private_ip)

                # Django 4 以降: CORS/CSRF はスキーム必須
                _append_unique(CORS_ALLOWED_ORIGINS, f"http://{private_ip}")
                _append_unique(CSRF_TRUSTED_ORIGINS, f"http://{private_ip}")

                # 必要なら https も（ALB/CloudFront 経由など）
                _append_unique(CORS_ALLOWED_ORIGINS, f"https://{private_ip}")
                _append_unique(CSRF_TRUSTED_ORIGINS, f"https://{private_ip}")
except Exception as e:
    # 失敗しても起動は続行（ログだけ）
    import logging
    logging.getLogger(__name__).warning("Failed to load /run/hostenv/private_ip: %s", e)

for h in ["localhost", "127.0.0.1"]:
    _append_unique(ALLOWED_HOSTS, h)
for origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
    _append_unique(CORS_ALLOWED_ORIGINS, origin)
    _append_unique(CSRF_TRUSTED_ORIGINS, origin)

CORS_ALLOW_HEADERS = [
    "content-type",
    "authorization",
    "x-csrftoken",
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'logex_web_app',
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "logex_web_app.auth.CookieJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'logex_config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'logex_config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv("DB_NAME", "mydb"),
        'USER': os.getenv("DB_USER", "myuser"),
        'PASSWORD': os.getenv("DB_PASSWORD", "mypassword"),
        'HOST': os.getenv("DB_HOST", "logex_db"),
        'PORT': int(os.getenv("DB_PORT", "5432"))
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'ja'

TIME_ZONE = 'Asia/Tokyo'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ===== JWT クッキー名・属性（集約） =====
JWT_COOKIE_ACCESS  = os.getenv("JWT_COOKIE_ACCESS",  "atk")
JWT_COOKIE_REFRESH = os.getenv("JWT_COOKIE_REFRESH", "rtk")

# devがHTTPの場合 SameSite=None は弾かれるため Lax を使うのが無難
JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "None")
JWT_COOKIE_SECURE   = os.getenv("JWT_COOKIE_SECURE",   "1") == "1"
JWT_COOKIE_DOMAIN   = os.getenv("JWT_COOKIE_DOMAIN")  # 例: ".autofba.net"（不要なら None）

JWT_ACCESS_MAX_AGE  = int(os.getenv("JWT_ACCESS_MAX_AGE", 60 * 60))          # 1時間
JWT_REFRESH_MAX_AGE = int(os.getenv("JWT_REFRESH_MAX_AGE", 14 * 24 * 3600))  # 14日

# Cookie をクロスサイトで使う（HTTPS必須）
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# 単一鍵:  SPAPI_ENCRYPTION_KEY=base64...
# 複数鍵:  SPAPI_ENCRYPTION_KEYS=new_key,old_key 
SPAPI_ENCRYPTION_KEYS = os.getenv("SPAPI_ENCRYPTION_KEYS")
SPAPI_ENCRYPTION_KEY  = os.getenv("SPAPI_ENCRYPTION_KEY")
if not (SPAPI_ENCRYPTION_KEYS or SPAPI_ENCRYPTION_KEY):
    raise ImproperlyConfigured("SPAPI_ENCRYPTION_KEY(S) is required for refresh token encryption.")

# ★（任意だが推奨）鍵の妥当性チェック：形式が不正なら起動時に落として気づく
try:
    from cryptography.fernet import Fernet
    first_key = (SPAPI_ENCRYPTION_KEYS or SPAPI_ENCRYPTION_KEY).split(",")[0].strip()
    Fernet(first_key)  # 例外が出なければOK
except Exception as e:
    raise ImproperlyConfigured(f"SPAPI_ENCRYPTION_KEY(S) is invalid: {e}")