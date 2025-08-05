#!/usr/bin/env python3
"""
Script de inicialización para Railway - SISEG PagTickets
Prepara la aplicación sin bloquear el startup
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
import threading
import time

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def initialize_database():
    """Inicializa la base de datos en segundo plano"""
    try:
        time.sleep(2)  # Esperar que el servidor inicie
        django.setup()
        
        # Ejecutar migraciones si es necesario
        from django.core.management.commands.migrate import Command as MigrateCommand
        from django.db import connection
        
        # Verificar si la BD necesita migraciones
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM django_migrations")
            print("Database already initialized")
        except:
            print("Initializing database...")
            execute_from_command_line(['manage.py', 'migrate', '--run-syncdb'])
            print("Database initialized successfully")
            
    except Exception as e:
        print(f"Database initialization warning: {e}")

def start_background_init():
    """Inicia la inicialización en segundo plano"""
    init_thread = threading.Thread(target=initialize_database, daemon=True)
    init_thread.start()

if __name__ == "__main__":
    start_background_init()
