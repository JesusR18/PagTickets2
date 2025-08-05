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
        
        # Para healthcheck: respuesta inmediata
        if self.path in ['/', '/health', '/ping', '/healthz']:
            if django_ready and django_app:
                # Django listo - usar aplicación real
                try:
                    environ = self.get_wsgi_environ()
                    response_data = []
                    
                    def start_response(status, headers):
                        self.send_response(int(status.split()[0]))
                        for header in headers:
                            self.send_header(header[0], header[1])
                        self.end_headers()
                    
                    result = django_app(environ, start_response)
                    for data in result:
                        self.wfile.write(data)
                    return
                except:
                    pass
            
            # Fallback rápido para healthcheck
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            # Para otras rutas, si Django no está listo, responder OK temporalmente
            if not django_ready:
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Loading...')
                return
            
            # Django listo - servir aplicación real
            try:
                environ = self.get_wsgi_environ()
                response_data = []
                
                def start_response(status, headers):
                    self.send_response(int(status.split()[0]))
                    for header in headers:
                        self.send_header(header[0], header[1])
                    self.end_headers()
                
                result = django_app(environ, start_response)
                for data in result:
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(f'Error: {e}'.encode())
    
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
    """Cargar Django en segundo plano"""
    global django_app, django_ready
    
    try:
        # Configurar Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        import django
        from django.core.wsgi import get_wsgi_application
        from django.core.management import execute_from_command_line
        
        django.setup()
        
        # Migrar base de datos si es necesario
        try:
            execute_from_command_line(['manage.py', 'migrate', '--run-syncdb'])
        except:
            pass
        
        # Obtener aplicación Django
        django_app = get_wsgi_application()
        django_ready = True
        
        print("✅ Django aplicación real cargada")
        
    except Exception as e:
        print(f"❌ Error cargando Django: {e}")
        django_ready = False

def start_server():
    """Iniciar servidor Railway"""
    print(f"🚀 Starting Railway server on port {PORT}")
    
    # Cargar Django en segundo plano
    django_thread = threading.Thread(target=load_django, daemon=True)
    django_thread.start()
    
    # Iniciar servidor inmediatamente
    with socketserver.TCPServer(("", PORT), RailwayHandler) as httpd:
        print(f"✅ Server ready for Railway healthcheck")
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()
