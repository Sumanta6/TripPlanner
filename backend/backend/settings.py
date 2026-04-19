import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def _load_env_file(env_path):
    if not env_path.exists():
        return
    try:
        from dotenv import load_dotenv

        load_dotenv(env_path, override=False)
        return
    except Exception:
        pass

    # Fallback parser so local .env loading still works even if python-dotenv is unavailable.
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


PROJECT_ROOT = BASE_DIR.parent
_load_env_file(PROJECT_ROOT / ".env")
_load_env_file(BASE_DIR / ".env")


def _env_str(name):
    return (os.environ.get(name, "") or "").strip()

SECRET_KEY = "django-insecure-change-this"

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
# ======================
# APPLICATIONS
# ======================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "accounts",
    "contacts",
    "itinerary",
    "guides",
    "destinations",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

# Required for Google OAuth popup flow
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = True

CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False


# ======================
# URLS / TEMPLATES
# ======================
ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# ======================
# DATABASE (PostgreSQL)
# ======================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "tripplanner_db",
        "USER": "sumanta",
        "PASSWORD": "gautam",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

# ======================
# PASSWORD VALIDATION
# ======================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ======================
# INTERNATIONALIZATION
# ======================
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ======================
# STATIC FILES
# ======================
STATIC_URL = "static/"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.GuideTokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "TripPlanner API",
    "DESCRIPTION": "OpenAPI schema for the TripPlanner backend.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ======================
# EMAIL (GMAIL SMTP)
# ======================
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True

EMAIL_HOST_USER = "sumantagautamm@gmail.com"
EMAIL_HOST_PASSWORD = "vjrpnjkzbqebifpk"  # NEW APP PASSWORD

DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# ======================
# GEMINI AI
# ======================
GEMINI_API_KEY = "AIzaSyApn5XibywuDUeTHIMN-iugzNYneGtlFfg"

# ======================
# GEOAPIFY (Destinations)
# ======================
GEOAPIFY_API_KEY = os.environ.get("GEOAPIFY_API_KEY", "")

# ======================
# ESEWA (Sandbox / Production)
# ======================
ESEWA_MERCHANT_ID = _env_str("ESEWA_MERCHANT_ID")
ESEWA_MERCHANT_CODE = ESEWA_MERCHANT_ID
ESEWA_SECRET_KEY = _env_str("ESEWA_SECRET_KEY")
ESEWA_PAYMENT_URL = _env_str("ESEWA_PAYMENT_URL")
ESEWA_STATUS_URL = _env_str("ESEWA_STATUS_URL")
ESEWA_SUCCESS_URL = _env_str("ESEWA_SUCCESS_URL")
ESEWA_FAILURE_URL = _env_str("ESEWA_FAILURE_URL")
ESEWA_FRONTEND_CALLBACK_URL = _env_str("ESEWA_FRONTEND_CALLBACK_URL")
