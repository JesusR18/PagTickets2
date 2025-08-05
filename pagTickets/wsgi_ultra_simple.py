"""
WSGI ultra-minimalista para Railway
Solo healthcheck básico sin Django completo
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_ultra_simple')

# Solo responder ping sin cargar nada más
class UltraMinimalWSGI:
    def __init__(self):
        self.django_app = None
    
    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        
        # Healthcheck ultra-rápido
        if path == '/ping/':
            start_response('200 OK', [('Content-Type', 'text/plain')])
            return [b'PONG']
        
        # Cargar Django solo cuando sea necesario
        if self.django_app is None:
            self.django_app = get_wsgi_application()
        
        return self.django_app(environ, start_response)

application = UltraMinimalWSGI()
