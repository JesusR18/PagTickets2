#!/usr/bin/env python3
"""
Servidor Railway DEFINITIVO - SISEG PagTickets
Responde inmediatamente al healthcheck y sirve la aplicación real
"""

import os
import sys
import threading
import time
import socketserver
import http.server
from urllib.parse import urlparse

PORT = int(os.environ.get('PORT', 8000))

# Variables globales
django_app = None
django_ready = False

class RailwayHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global django_app, django_ready
        
        # SIEMPRE intentar usar Django primero para TODAS las rutas
        if django_app:
            try:
                environ = self.get_wsgi_environ()
                
                def start_response(status, headers):
                    self.send_response(int(status.split()[0]))
                    for header in headers:
                        self.send_header(header[0], header[1])
                    self.end_headers()
                
                result = django_app(environ, start_response)
                for data in result:
                    self.wfile.write(data)
                return
            except Exception as e:
                print(f"Error serving Django: {e}")
        
        # Solo para healthchecks específicos si Django falla
        if self.path in ['/health', '/ping', '/healthz']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            # Si Django no está disponible, error 503
            self.send_response(503)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Service loading...')
    
    def do_POST(self):
        self.do_GET()
    
    def get_wsgi_environ(self):
        """Crear environ WSGI básico"""
        environ = {
            'REQUEST_METHOD': self.command,
            'PATH_INFO': self.path,
            'SERVER_NAME': 'localhost',
            'SERVER_PORT': str(PORT),
            'wsgi.version': (1, 0),
            'wsgi.url_scheme': 'http',
            'wsgi.input': self.rfile,
            'wsgi.errors': sys.stderr,
            'wsgi.multithread': True,
            'wsgi.multiprocess': False,
            'wsgi.run_once': False,
        }
        
        # Agregar headers
        for key, value in self.headers.items():
            key = key.replace('-', '_').upper()
            if key not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                key = 'HTTP_' + key
            environ[key] = value
            
        return environ
    
    def log_message(self, format, *args):
        pass

def load_django():
    """Cargar Django de forma directa"""
    global django_app, django_ready
    
    try:
        print("🔄 Configurando Django SISEG...")
        
        # Configurar Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        import django
        from django.core.wsgi import get_wsgi_application
        
        # Setup rápido
        django.setup()
        
        # Obtener aplicación Django
        django_app = get_wsgi_application()
        django_ready = True
        
        print("✅ Aplicación SISEG cargada correctamente!")
        return True
        
    except Exception as e:
        print(f"❌ Error cargando Django: {e}")
        django_ready = False
        return False

def start_server():
    """Iniciar servidor Railway con Django cargado síncronamente"""
    print(f"🚀 Starting Railway server on port {PORT}")
    
    # Cargar Django ANTES de iniciar el servidor
    print("🔄 Cargando tu aplicación SISEG...")
    load_django()
    
    # Verificar que Django esté listo
    if django_ready and django_app:
        print("✅ Tu aplicación SISEG está lista!")
    else:
        print("⚠️ Django no se cargó completamente")
    
    # Iniciar servidor
    with socketserver.TCPServer(("", PORT), RailwayHandler) as httpd:
        print(f"🌐 SISEG PagTickets serviendo en puerto {PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()
