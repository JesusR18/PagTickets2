"""
WSGI wrapper optimizado para Railway
"""
import os
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')

# Agregar el directorio del proyecto al path
sys.path.insert(0, os.path.dirname(__file__))

# Importar Django WSGI application
from django.core.wsgi import get_wsgi_application

# Crear la aplicación WSGI
application = get_wsgi_application()
