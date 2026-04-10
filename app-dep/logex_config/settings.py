from pathlib import Path
import logging
import os
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv()
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR / 'logex_config' / '.env')

CHATWORK_API_TOKENS = [t.strip() for t in os.getenv('CHATWORK_API_TOKENS', '').split(',') if t.strip()]

SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DJANGO_DEBUG', '1') == '1'
CORS_ALLOW_CREDENTIALS = True

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv('DJANGO_ALLOWED_HOSTS', 'autofba.net,www.autofba.net,localhost,127.0.0.1').split(',')
    if h.strip()
]

CORS_ALLOWED_ORIGINS = [
    'https://autofba.net',
    'https://www.autofba.net',
]

CSRF_TRUSTED_ORIGINS = [
    'https://autofba.net',
    'https://www.autofba.net',
]

HOSTENV_DIR = '/run/hostenv'
PRIVATE_IP_FILE = os.path.join(HOSTENV_DIR, 'private_ip')


def _append_unique(values, item):
    if item and item not in values:
        values.append(item)


try:
    if os.path.exists(PRIVATE_IP_FILE):
        with open(PRIVATE_IP_FILE, 'r', encoding='utf-8') as f:
            private_ip = f.read().strip()
        if private_ip:
            _append_unique(ALLOWED_HOSTS, private_ip)
            _append_unique(CORS_ALLOWED_ORIGINS, f'http://{private_ip}')
            _append_unique(CSRF_TRUSTED_ORIGINS, f'http://{private_ip}')
            _append_unique(CORS_ALLOWED_ORIGINS, f'https://{private_ip}')
            _append_unique(CSRF_TRUSTED_ORIGINS, f'https://{private_ip}')
except Exception as e:
    logging.getLogger(__name__).warning('Failed to load /run/hostenv/private_ip: %s', e)

for host in ['localhost', '127.0.0.1']:
    _append_unique(ALLOWED_HOSTS, host)
for origin in ['http://localhost:3000', 'http://127.0.0.1:3000']:
    _append_unique(CORS_ALLOWED_ORIGINS, origin)
    _append_unique(CSRF_TRUSTED_ORIGINS, origin)

CORS_ALLOW_HEADERS = [
    'content-type',
    'authorization',
    'x-csrftoken',
    'x-requested-with',
    'accept',
    'origin',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_PREFLIGHT_MAX_AGE = 86400

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
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'logex_web_app.auth.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
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

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'mydb'),
        'USER': os.getenv('DB_USER', 'myuser'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'mypassword'),
        'HOST': os.getenv('DB_HOST', 'logex_db'),
        'PORT': int(os.getenv('DB_PORT', '5432')),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'ja'
TIME_ZONE = 'Asia/Tokyo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

JWT_COOKIE_ACCESS = os.getenv('JWT_COOKIE_ACCESS', 'atk')
JWT_COOKIE_REFRESH = os.getenv('JWT_COOKIE_REFRESH', 'rtk')
JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'None')
JWT_COOKIE_SECURE = os.getenv('JWT_COOKIE_SECURE', '1') == '1'
JWT_COOKIE_DOMAIN = os.getenv('JWT_COOKIE_DOMAIN')
JWT_ACCESS_MAX_AGE = int(os.getenv('JWT_ACCESS_MAX_AGE', str(60 * 60)))
JWT_REFRESH_MAX_AGE = int(os.getenv('JWT_REFRESH_MAX_AGE', str(14 * 24 * 3600)))

SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SPAPI_ENCRYPTION_KEYS = os.getenv('SPAPI_ENCRYPTION_KEYS')
SPAPI_ENCRYPTION_KEY = os.getenv('SPAPI_ENCRYPTION_KEY')

if SPAPI_ENCRYPTION_KEYS or SPAPI_ENCRYPTION_KEY:
    try:
        from cryptography.fernet import Fernet

        first_key = (SPAPI_ENCRYPTION_KEYS or SPAPI_ENCRYPTION_KEY).split(',')[0].strip()
        Fernet(first_key)
    except Exception as e:
        logging.getLogger(__name__).warning('SPAPI_ENCRYPTION_KEY(S) is invalid: %s', e)
else:
    logging.getLogger(__name__).warning(
        'SPAPI_ENCRYPTION_KEY(S) is not configured. Refresh token encryption will not work.'
    )

SP_API_LWA_CLIENT_ID = os.getenv('SP_API_LWA_CLIENT_ID')
SP_API_LWA_CLIENT_SECRET = os.getenv('SP_API_LWA_CLIENT_SECRET')
SP_API_APP_ID = os.getenv('SP_API_APP_ID')
SP_API_AWS_ACCESS_KEY = os.getenv('SP_API_AWS_ACCESS_KEY')
SP_API_AWS_SECRET_KEY = os.getenv('SP_API_AWS_SECRET_KEY')
SP_API_ROLE_ARN = os.getenv('SP_API_ROLE_ARN')
SP_API_ENDPOINT = os.getenv('SP_API_ENDPOINT', 'https://sellingpartnerapi-fe.amazon.com')
SP_API_REGION = os.getenv('SP_API_REGION', 'us-west-2')
SP_API_MARKETPLACE_ID = os.getenv('SP_API_MARKETPLACE_ID', 'A1VC38T7YXB528')
SP_API_REFRESH_TOKEN_SANDBOX = os.getenv('SP_API_REFRESH_TOKEN_SANDBOX')

if not all([
    SP_API_LWA_CLIENT_ID,
    SP_API_LWA_CLIENT_SECRET,
    SP_API_AWS_ACCESS_KEY,
    SP_API_AWS_SECRET_KEY,
    SP_API_ROLE_ARN,
]):
    logging.getLogger(__name__).warning(
        'SP-API credentials are not fully configured. SP-API features will not work.'
    )

SP_API_LWA_REDIRECT_URI = os.getenv('SP_API_LWA_REDIRECT_URI')
SP_API_LWA_LOGIN_URI = os.getenv('SP_API_LWA_LOGIN_URI')
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'https://autofba.net').rstrip('/')
SP_API_LWA_AUTHORIZE_URL = os.getenv(
    'SP_API_LWA_AUTHORIZE_URL',
    'https://sellercentral.amazon.co.jp/apps/authorize/consent',
)
SP_API_LWA_STATE_TTL = int(os.getenv('SP_API_LWA_STATE_TTL', '900'))
