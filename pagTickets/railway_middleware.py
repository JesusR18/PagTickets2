"""
Middleware para Railway Healthcheck
Maneja las peticiones de healthcheck de manera más eficiente
"""

from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

class RailwayHealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware que responde rápidamente a healthchecks sin procesar toda la aplicación
    """
    
    def process_request(self, request):
        # Rutas de healthcheck que responden inmediatamente
        health_paths = ['/ping/', '/health/', '/healthz/']
        
        if request.path in health_paths:
            if request.path == '/ping/':
                return HttpResponse("PONG", content_type="text/plain", status=200)
            else:
                try:
                    # Verificación rápida de base de datos
                    from django.db import connection
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT 1")
                    return HttpResponse("OK", content_type="text/plain", status=200)
                except:
                    return HttpResponse("DB_ERROR", content_type="text/plain", status=503)
        
        return None
