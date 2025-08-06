"""
Configuración de Django para el proyecto pagTickets.

Generado por 'django-admin startproject' usando Django 5.2.1.

Para más información sobre este archivo, ver
https://docs.djangoproject.com/en/5.2/topics/settings/

Para la lista completa de configuraciones y sus valores, ver
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

# Importa Path para trabajar con rutas de archivos
from pathlib import Path
import os

# Construye rutas dentro del proyecto como: BASE_DIR / 'subdir'.
# Esta es la ruta base del proyecto (carpeta principal)
BASE_DIR = Path(__file__).resolve().parent.parent


# Configuraciones de desarrollo rápido - NO aptas para producción
# Ver https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# ADVERTENCIA DE SEGURIDAD: mantén la clave secreta utilizada en producción en secreto!
# Esta clave se usa para encriptación y seguridad en Django
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-gk+8sdz)ym-hjp91rcj-dgdyqh=s6w7m%+ypnm4p4m&!gi@ccm')

# ADVERTENCIA DE SEGURIDAD: no ejecutes con debug activado en producción!
# DEBUG=True muestra errores detallados, útil para desarrollo pero peligroso en producción
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# En Railway, usar DEBUG=False automáticamente
if 'RAILWAY_ENVIRONMENT' in os.environ:
    DEBUG = False

# Lista de hosts/dominios permitidos para servir la aplicación
# Permitir conexiones desde cualquier IP en la red local (para desarrollo)
ALLOWED_HOSTS = ['*']  # ⚠️ Solo para desarrollo, no usar en producción

# En producción, agregar dominio específico:
# ALLOWED_HOSTS = ['tu-app.railway.app', 'localhost', '127.0.0.1']

# Configuración para Railway y HTTPS
CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'https://*.up.railway.app', 
    'http://localhost:8000',
    'http://127.0.0.1:8000'
]

# Configuración adicional para Railway
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False  # Railway maneja esto automáticamente


# Definición de aplicaciones

# Lista de aplicaciones instaladas en este proyecto Django
INSTALLED_APPS = [
    # 'django.contrib.admin',        # Panel de administración - ELIMINADO
    'django.contrib.auth',         # Sistema de autenticación
    'django.contrib.contenttypes', # Framework de tipos de contenido
    'django.contrib.sessions',     # Framework de sesiones
    'django.contrib.messages',     # Framework de mensajes
    'django.contrib.staticfiles',  # Manejo de archivos estáticos (CSS, JS, imágenes)
    'corsheaders',                 # Para CORS en producción
    'pagTickets.apps.PagTicketsConfig',  # Aplicación principal del proyecto
    'qrweb',                      # Nuestra aplicación personalizada para códigos QR
]

# Lista de middleware (software que procesa peticiones antes de llegar a las vistas)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',           # Seguridad
    'whitenoise.middleware.WhiteNoiseMiddleware',              # Para servir archivos estáticos
    'corsheaders.middleware.CorsMiddleware',                   # CORS para producción
    'django.contrib.sessions.middleware.SessionMiddleware',    # Sesiones
    'django.middleware.common.CommonMiddleware',               # Funcionalidad común
    'django.middleware.csrf.CsrfViewMiddleware',              # Protección CSRF
    # 'django.contrib.auth.middleware.AuthenticationMiddleware', # Autenticación - ELIMINADO (solo para admin)
    'django.contrib.messages.middleware.MessageMiddleware',    # Mensajes
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  # Protección clickjacking
]

# Configuración de URLs principal
ROOT_URLCONF = 'pagTickets.urls'

# Configuración de templates (plantillas HTML)
TEMPLATES = [
    {
        # Motor de plantillas de Django
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # Directorios adicionales donde buscar templates (vacío = usar los de las apps)
        'DIRS': [],
        # Permitir que Django busque templates en las carpetas 'templates' de cada app
        'APP_DIRS': True,
        # Opciones adicionales para el motor de plantillas
        'OPTIONS': {
            # Procesadores de contexto que añaden variables disponibles en todos los templates
            'context_processors': [
                'django.template.context_processors.request',  # Añade la variable 'request'
                # 'django.contrib.auth.context_processors.auth', # Añade variables de usuario - ELIMINADO (solo para admin)
                'django.contrib.messages.context_processors.messages', # Añade mensajes
            ],
        },
    },
]

# Aplicación WSGI para servir el proyecto (usado por servidores web)
WSGI_APPLICATION = 'pagTickets.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# En Railway, usar base de datos en memoria para evitar problemas de escritura
if 'RAILWAY_ENVIRONMENT' in os.environ:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

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
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'es-mx'

TIME_ZONE = 'America/Mexico_City'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Directorios donde Django buscará archivos estáticos
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'pagTickets' / 'static',
]

# Configuración para archivos multimedia (imágenes subidas por usuarios)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Configuración para servir archivos estáticos en producción
# En Railway, agregar whitenoise para servir archivos estáticos
if 'RAILWAY_ENVIRONMENT' in os.environ:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Puerto para Railway
PORT = os.environ.get('PORT', 8000)