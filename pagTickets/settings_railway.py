"""
Configuración de Django para Railway (producción)
Configuración optimizada para despliegue en Railway
"""

from .settings import *
import os
import dj_database_url

# Agregar middleware específico para Railway
MIDDLEWARE = [
    'pagTickets.railway_middleware.RailwayHealthCheckMiddleware',  # Primero para healthcheck rápido
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# =================================
# CONFIGURACIÓN BÁSICA RAILWAY
# =================================

# Modo debug deshabilitado en producción
DEBUG = False

# Hosts permitidos para Railway
ALLOWED_HOSTS = [
    '*.railway.app',
    '*.up.railway.app',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    # Agregar el dominio específico si lo conoces
]

# Permitir todas las IPs para healthcheck
import os
if os.environ.get('RAILWAY_ENVIRONMENT') == 'production':
    ALLOWED_HOSTS.append('*')  # Solo en Railway

# Dominios confiables para CSRF
CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'https://*.up.railway.app',
]

# Configuración de logging para Railway
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'pagTickets': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# =================================
# BASE DE DATOS RAILWAY
# =================================

# PostgreSQL en Railway
if 'DATABASE_URL' in os.environ:
    DATABASES = {
        'default': dj_database_url.parse(
            os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Fallback a SQLite para desarrollo
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# =================================
# ARCHIVOS ESTÁTICOS RAILWAY
# =================================

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configuración de WhiteNoise para archivos estáticos
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# =================================
# SEGURIDAD RAILWAY
# =================================

# SSL y HTTPS
SECURE_SSL_REDIRECT = False  # Railway maneja SSL
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookies seguras
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# =================================
# CORS PARA RAILWAY
# =================================

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# =================================
# LOGGING RAILWAY
# =================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'pagTickets': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'qrweb': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# =================================
# CONFIGURACIÓN ADICIONAL RAILWAY
# =================================

# Timezone
USE_TZ = True
TIME_ZONE = 'America/Mexico_City'

# Internacionalización
LANGUAGE_CODE = 'es-mx'

# Cache (opcional)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Configuración de email (opcional)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

print("✅ Configuración Railway cargada exitosamente")
