"""
Configuración ULTRA-SIMPLE de Django para Railway
Configuración mínima para garantizar deployment exitoso
"""

from .settings import *
import os

# =================================
# CONFIGURACIÓN MÍNIMA RAILWAY
# =================================

# DEBUG OFF en producción
DEBUG = False

# Hosts - Permitir TODOS para evitar problemas
ALLOWED_HOSTS = ['*']

# Middleware MÍNIMO
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

# CSRF simplificado
CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'https://*.up.railway.app',
]

# Base de datos SIMPLE (SQLite)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Archivos estáticos SIMPLE
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# WhiteNoise para archivos estáticos
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# SECURITY MÍNIMA
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Variable para Railway
RAILWAY_ENVIRONMENT = True

print("🚀 Configuración ULTRA-SIMPLE Railway cargada")
