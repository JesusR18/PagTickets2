"""
WSGI ultra-minimalista para Railway
Solo healthcheck básico sin Django completo
"""

import os
import sys
import logging

# Configurar logging básico
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_ultra_simple')

# Solo responder ping sin cargar nada más
class UltraMinimalWSGI:
    def __init__(self):
        self.django_app = None
        self.setup_attempted = False
    
    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        method = environ.get('REQUEST_METHOD', 'GET')
        
        logger.info(f"Request: {method} {path}")
        
        # Healthcheck ultra-rápido - SIN cargar Django
        if path == '/ping/' or path == '/health/' or path == '/healthz/':
            logger.info("Healthcheck request - responding immediately")
            start_response('200 OK', [
                ('Content-Type', 'text/plain'),
                ('Cache-Control', 'no-cache')
            ])
            return [b'PONG']
        
        # Para todo lo demás, cargar Django lazy
        if self.django_app is None and not self.setup_attempted:
            try:
                logger.info("Loading Django application...")
                self.setup_attempted = True
                from django.core.wsgi import get_wsgi_application
                self.django_app = get_wsgi_application()
                logger.info("Django application loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Django: {e}")
                # Respuesta de error
                start_response('503 Service Unavailable', [('Content-Type', 'text/plain')])
                return [f'Django Load Error: {str(e)}'.encode()]
        
        if self.django_app:
            return self.django_app(environ, start_response)
        else:
            # Si Django no se cargó, respuesta de error
            start_response('503 Service Unavailable', [('Content-Type', 'text/plain')])
            return [b'Service Temporarily Unavailable']

application = UltraMinimalWSGI()
