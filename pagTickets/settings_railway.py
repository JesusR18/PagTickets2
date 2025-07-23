# Configuración adicional para Railway
import os
from .settings import *

# Configuración de producción
DEBUG = True  # Temporal para diagnosticar

# Hosts permitidos específicos para Railway
ALLOWED_HOSTS = ['*']  # Railway maneja esto a través de su proxy

# Configuración CSRF para Railway
CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'https://*.up.railway.app',
]

# Deshabilitar CSRF temporalmente para healthcheck
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False

# Configuración de seguridad para HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False
USE_TZ = True

# Agregar middleware personalizado para Railway
MIDDLEWARE = [
    'pagTickets.middleware.RailwayMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Configuración de archivos estáticos para producción
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Configuración de base de datos para Railway
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Configuración de logging para Railway
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
    },
}
