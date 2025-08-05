"""
Middleware para Railway Healthcheck
Maneja las peticiones de healthcheck de manera más eficiente
"""

from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin
import logging

logger = logging.getLogger(__name__)

class RailwayHealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware que responde rápidamente a healthchecks sin procesar toda la aplicación
    """
    
    def process_request(self, request):
        # Rutas de healthcheck que responden inmediatamente
        health_paths = ['/ping/', '/health/', '/healthz/']
        
        if request.path in health_paths:
            # Log para debugging
            logger.info(f"🏥 Healthcheck request: {request.path}")
            
            if request.path == '/ping/':
                # Respuesta ultra-rápida para ping
                return HttpResponse("PONG", content_type="text/plain", status=200)
            else:
                try:
                    # Verificación rápida de base de datos solo si es necesario
                    from django.db import connection
                    from django.db.utils import OperationalError
                    
                    # Timeout corto para la verificación
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT 1")
                        result = cursor.fetchone()
                        
                    if result and result[0] == 1:
                        return HttpResponse("OK", content_type="text/plain", status=200)
                    else:
                        logger.warning("🔥 Database check returned unexpected result")
                        return HttpResponse("DB_UNEXPECTED", content_type="text/plain", status=503)
                        
                except OperationalError as e:
                    logger.error(f"❌ Database operational error: {e}")
                    return HttpResponse("DB_OPERATIONAL_ERROR", content_type="text/plain", status=503)
                except Exception as e:
                    logger.error(f"❌ Database connection error: {e}")
                    return HttpResponse("DB_CONNECTION_ERROR", content_type="text/plain", status=503)
        
        return None
