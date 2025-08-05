"""
Servidor HTTP ultra-simple para Railway
Responde healthcheck sin Django para deploy súper rápido
"""

import os
import sys
from wsgiref.simple_server import make_server
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UltraFastWSGI:
    """WSGI que responde healthcheck sin cargar nada"""
    
    def __init__(self):
        self.django_app = None
        self.django_loaded = False
    
    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '').rstrip('/')
        method = environ.get('REQUEST_METHOD', 'GET')
        
        logger.info(f"Request: {method} {path}")
        
        # Healthcheck INMEDIATO sin Django
        if path in ['/ping', '/health', '/healthz', '']:
            logger.info("Healthcheck - responding immediately without Django")
            start_response('200 OK', [
                ('Content-Type', 'text/plain'),
                ('Cache-Control', 'no-cache'),
                ('X-Health-Check', 'ultra-fast')
            ])
            return [b'RAILWAY_OK']
        
        # Solo para rutas no-healthcheck, cargar Django
        if not self.django_loaded:
            try:
                logger.info("Loading Django for non-healthcheck request...")
                os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_ultra_simple')
                
                import django
                django.setup()
                
                from django.core.wsgi import get_wsgi_application
                self.django_app = get_wsgi_application()
                self.django_loaded = True
                logger.info("Django loaded successfully")
                
            except Exception as e:
                logger.error(f"Django load failed: {e}")
                start_response('503 Service Unavailable', [('Content-Type', 'text/plain')])
                return [f'Django Error: {str(e)}'.encode()]
        
        # Usar Django para rutas normales
        if self.django_app:
            return self.django_app(environ, start_response)
        else:
            start_response('503 Service Unavailable', [('Content-Type', 'text/plain')])
            return [b'Service Loading...']

application = UltraFastWSGI()

# Para testing local
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting ultra-fast server on port {port}")
    
    httpd = make_server('0.0.0.0', port, application)
    logger.info(f"Server running on http://0.0.0.0:{port}")
    httpd.serve_forever()
