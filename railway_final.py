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
        
        # Si Django está listo, SIEMPRE usar la aplicación real
        if django_ready and django_app:
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
        
        # Solo si Django NO está listo y es healthcheck
        if self.path in ['/health', '/ping', '/healthz']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            # Para la página principal, mostrar tu página incluso si Django no está listo
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            loading_html = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SISEG - Cargando</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .loading { color: #991b1b; font-size: 24px; margin: 20px 0; }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #991b1b; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
                <script>
                    // Recargar página cada 2 segundos hasta que Django esté listo
                    setTimeout(function(){ location.reload(); }, 2000);
                </script>
            </head>
            <body>
                <h1>🔄 SISEG - Sistemas de Seguridad Integral</h1>
                <div class="spinner"></div>
                <p class="loading">Iniciando sistema...</p>
                <p>Tu aplicación estará lista en unos segundos</p>
            </body>
            </html>
            """.encode('utf-8')
            self.wfile.write(loading_html)
    
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
    """Cargar Django en segundo plano de forma ultra-rápida"""
    global django_app, django_ready
    
    try:
        print("🔄 Iniciando Django...")
        
        # Configurar Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        import django
        from django.core.wsgi import get_wsgi_application
        
        # Setup rápido sin migraciones
        django.setup()
        
        # Obtener aplicación Django INMEDIATAMENTE
        django_app = get_wsgi_application()
        django_ready = True
        
        print("✅ Django aplicación SISEG lista!")
        
        # Migrar base de datos en segundo plano (DESPUÉS de que esté listo)
        def migrate_later():
            try:
                time.sleep(5)
                from django.core.management import execute_from_command_line
                execute_from_command_line(['manage.py', 'migrate', '--run-syncdb'])
                print("✅ Base de datos inicializada")
            except Exception as e:
                print(f"⚠️ Migración: {e}")
        
        migrate_thread = threading.Thread(target=migrate_later, daemon=True)
        migrate_thread.start()
        
    except Exception as e:
        print(f"❌ Error cargando Django: {e}")
        django_ready = False

def start_server():
    """Iniciar servidor Railway con carga ultra-rápida de Django"""
    print(f"🚀 Starting Railway server on port {PORT}")
    
    # Cargar Django INMEDIATAMENTE al iniciar
    django_thread = threading.Thread(target=load_django, daemon=True)
    django_thread.start()
    
    # Pequeña pausa para dar tiempo a Django de cargar
    time.sleep(0.5)
    
    # Iniciar servidor
    with socketserver.TCPServer(("", PORT), RailwayHandler) as httpd:
        print(f"✅ Server ready - SISEG PagTickets iniciando")
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()
