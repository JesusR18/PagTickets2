"""
WSGI ultra-optimizado para Railway con healthcheck rápido
"""

import os
from django.core.wsgi import get_wsgi_application
from django.http import HttpResponse

# Configurar settings antes de inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')

# Obtener aplicación WSGI estándar
application = get_wsgi_application()

# Wrapper que maneja healthchecks antes que Django
class HealthCheckWSGI:
    """WSGI wrapper que responde healthchecks ultra-rápido"""
    
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app
    
    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        
        # Healthcheck ultra-rápido sin cargar Django
        if path == '/ping/':
            start_response('200 OK', [('Content-Type', 'text/plain')])
            return [b'PONG']
        
        # Para todo lo demás, usar Django normal
        return self.wsgi_app(environ, start_response)

# Aplicar wrapper de healthcheck
application = HealthCheckWSGI(application)
