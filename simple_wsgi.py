"""
WSGI súper simple que SIEMPRE funciona en Railway
Solo responde OK a cualquier request
"""

def application(environ, start_response):
    """WSGI application que responde OK a todo"""
    
    # Headers básicos
    headers = [
        ('Content-Type', 'text/plain'),
        ('Cache-Control', 'no-cache'),
        ('Access-Control-Allow-Origin', '*')
    ]
    
    # Responder 200 OK a CUALQUIER request
    start_response('200 OK', headers)
    
    # Mensaje simple
    return [b'OK']
