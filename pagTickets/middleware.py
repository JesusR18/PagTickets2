"""
Middleware personalizado para Railway
"""

class RailwayMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Procesar solicitud antes de la vista
        
        # Agregar headers específicos para Railway
        response = self.get_response(request)
        
        # Agregar headers de respuesta para Railway
        response['X-Railway-Health'] = 'OK'
        
        return response
