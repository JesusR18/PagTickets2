"""
Configuración WSGI para el proyecto pagTickets.

Expone el callable WSGI como una variable a nivel de módulo llamada ``application``.

Para más información sobre este archivo, ver
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

# Importa el módulo os para variables de entorno
import os

# Importa la función para obtener la aplicación WSGI de Django
from django.core.wsgi import get_wsgi_application

# Establece la configuración por defecto de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')

# Crea la aplicación WSGI que servirá tu proyecto Django
application = get_wsgi_application()
