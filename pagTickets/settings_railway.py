"""
Configuración de Django para Railway (producción)
Hereda de settings.py y añade configuraciones específicas para Railway
"""

from .settings import *
import os

# Configuración específica para Railway
DEBUG = False

# Hosts permitidos para Railway
ALLOWED_HOSTS = [
    '*.railway.app',
    '*.up.railway.app',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
]

# Base de datos para Railway (PostgreSQL)
if 'DATABASE_URL' in os.environ:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }

# Configuración de archivos estáticos para Railway
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configuración adicional para Railway
SECURE_SSL_REDIRECT = False  # Railway maneja SSL
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CORS para Railway
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Logging para Railway
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
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}
