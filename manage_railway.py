#!/usr/bin/env python
"""
Django's command-line utility for administrative tasks - Railway Version
Versión específica para Railway con configuraciones optimizadas
"""
import os
import sys

def main():
    """Run administrative tasks."""
    # Configurar settings específico para Railway
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
    
    # Verificar entorno Railway
    if 'RAILWAY_ENVIRONMENT' in os.environ:
        print("🚀 Ejecutando en Railway Environment")
        os.environ.setdefault('DEBUG', 'False')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Comandos específicos para Railway
    if len(sys.argv) > 1 and sys.argv[1] == 'railway_deploy':
        print("🚀 Iniciando proceso de despliegue Railway...")
        # Ejecutar migraciones
        execute_from_command_line(['manage.py', 'migrate', '--noinput'])
        # Recopilar archivos estáticos
        execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
        print("✅ Despliegue Railway completado")
        return
    
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
