"""
Configuración ASGI para el proyecto pagTickets.

Expone el callable ASGI como una variable a nivel de módulo llamada ``application``.

Para más información sobre este archivo, ver
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

# Importa el módulo os para variables de entorno
import os

# Importa la función para obtener la aplicación ASGI de Django
from django.core.asgi import get_asgi_application

# Establece la configuración por defecto de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')

# Crea la aplicación ASGI que servirá tu proyecto Django (para aplicaciones asíncronas)
application = get_asgi_application()
