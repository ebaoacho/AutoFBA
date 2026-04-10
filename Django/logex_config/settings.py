from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

load_dotenv()  # .env を読み込む

# カンマ区刁E��で刁E��
CHATWORK_API_TOKENS = os.getenv('CHATWORK_API_TOKENS', '').split(',')


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR / 'logex_config' / '.env')

SECRET_KEY = os.getenv("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

CORS_ALLOW_CREDENTIALS = True

# ALLOWED_HOSTS = ['autofba.net', 'localhost']
ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "autofba.net,www.autofba.net,localhost,127.0.0.1").split(",")
    if h.strip()
]

# CORS_ALLOWED_ORIGINS = [
#     "https://autofba.net",
#     "http://localhost.8000",
# ]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# CORS_ALLOW_HEADERS = [
#     "content-type",
# ]

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

# Cookie をクロスサイトで使ぁE��ETTPS忁E��！ESESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# 単一鍵:  SPAPI_ENCRYPTION_KEY=base64...
# 褁E��鍵:  SPAPI_ENCRYPTION_KEYS=new_key,old_key 
SPAPI_ENCRYPTION_KEYS = os.getenv("SPAPI_ENCRYPTION_KEYS")
SPAPI_ENCRYPTION_KEY  = os.getenv("SPAPI_ENCRYPTION_KEY")
if not (SPAPI_ENCRYPTION_KEYS or SPAPI_ENCRYPTION_KEY):
    raise ImproperlyConfigured("SPAPI_ENCRYPTION_KEY(S) is required for refresh token encryption.")

# ☁E��任意だが推奨�E�鍵の妥当性チェチE���E�形式が不正なら起動時に落として気づぁEtry:
    from cryptography.fernet import Fernet
    first_key = (SPAPI_ENCRYPTION_KEYS or SPAPI_ENCRYPTION_KEY).split(",")[0].strip()
    Fernet(first_key)  # 例外が出なければOK
except Exception as e:
    raise ImproperlyConfigured(f"SPAPI_ENCRYPTION_KEY(S) is invalid: {e}")


# ==================== SP-API Settings ====================
# Amazon Selling Partner API Configuration

# LWA (Login with Amazon) Credentials
SP_API_LWA_CLIENT_ID = os.getenv("SP_API_LWA_CLIENT_ID")
SP_API_LWA_CLIENT_SECRET = os.getenv("SP_API_LWA_CLIENT_SECRET")

# AWS IAM Credentials for SP-API Signature
SP_API_AWS_ACCESS_KEY = os.getenv("SP_API_AWS_ACCESS_KEY")
SP_API_AWS_SECRET_KEY = os.getenv("SP_API_AWS_SECRET_KEY")
SP_API_ROLE_ARN = os.getenv("SP_API_ROLE_ARN")

# SP-API Endpoint Configuration (Japan Marketplace)
SP_API_ENDPOINT = os.getenv("SP_API_ENDPOINT", "https://sellingpartnerapi-fe.amazon.com")
SP_API_REGION = os.getenv("SP_API_REGION", "us-west-2")
SP_API_MARKETPLACE_ID = os.getenv("SP_API_MARKETPLACE_ID", "A1VC38T7YXB528")

# Sandbox Refresh Token (for testing - production tokens stored in database)
SP_API_REFRESH_TOKEN_SANDBOX = os.getenv("SP_API_REFRESH_TOKEN_SANDBOX")

# Validate required SP-API settings
if not all([SP_API_LWA_CLIENT_ID, SP_API_LWA_CLIENT_SECRET, SP_API_AWS_ACCESS_KEY, SP_API_AWS_SECRET_KEY, SP_API_ROLE_ARN]):
    raise ImproperlyConfigured("SP-API credentials are not fully configured. Check .env file.")

