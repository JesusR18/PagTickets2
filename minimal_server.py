#!/usr/bin/env python3
"""
Servidor para Railway - SISEG PagTickets
Integra Django con servidor HTTP directo para Railway
"""

import os
import sys
import django
from django.core.wsgi import get_wsgi_application
import socketserver
import http.server
from wsgiref.simple_server import make_server, WSGIRequestHandler
import threading
import time

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

PORT = int(os.environ.get('PORT', 8000))

class QuietWSGIRequestHandler(WSGIRequestHandler):
    def log_message(self, format, *args):
        pass  # Silenciar logs para Railway

def initialize_database():
    """Inicializa la base de datos en segundo plano"""
    try:
        time.sleep(3)  # Esperar que el servidor inicie
        from django.core.management import execute_from_command_line
        from django.db import connection
        
        # Verificar si la BD necesita migraciones
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM django_migrations")
            print("✅ Database ready")
        except:
            print("🔄 Initializing database...")
            execute_from_command_line(['manage.py', 'migrate', '--run-syncdb'])
            print("✅ Database initialized")
            
    except Exception as e:
        print(f"⚠️ Database initialization: {e}")

def start_django_server():
    """Inicia el servidor Django de manera optimizada para Railway"""
    # Configurar Django para inicio rápido
    django.setup()
    
    # Inicializar BD en segundo plano
    init_thread = threading.Thread(target=initialize_database, daemon=True)
    init_thread.start()
    
    # Obtener la aplicación WSGI de Django - TU APLICACION REAL
    application = get_wsgi_application()
    
    # Crear servidor WSGI optimizado
    httpd = make_server('', PORT, application, handler_class=QuietWSGIRequestHandler)
    
    print(f"🚀 SISEG PagTickets running on port {PORT}")
    print(f"🌐 Access: http://0.0.0.0:{PORT}")
    httpd.serve_forever()

if __name__ == "__main__":
    start_django_server()
