#!/usr/bin/env python3
"""
Script de configuración automática para Railway
Configura el proyecto Django para producción en Railway
"""

import os
import sys
import subprocess
import django
from pathlib import Path

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')

def run_command(command, description):
    """Ejecutar comando con descripción"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True)
        print(f"✅ {description} - Completado")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en {description}: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return None

def setup_railway_environment():
    """Configurar entorno para Railway"""
    print("🚀 SISEG - Configuración automática para Railway")
    print("=" * 50)
    
    # 1. Verificar dependencias
    print("📦 Verificando dependencias...")
    run_command("pip install -r requirements.txt", "Instalación de dependencias")
    
    # 2. Configurar Django
    django.setup()
    
    # 3. Ejecutar migraciones
    run_command("python manage_railway.py migrate --noinput", "Migraciones de base de datos")
    
    # 4. Recopilar archivos estáticos
    run_command("python manage_railway.py collectstatic --noinput", "Recopilación de archivos estáticos")
    
    # 5. Verificar configuración
    print("🔍 Verificando configuración...")
    run_command("python manage_railway.py check --deploy", "Verificación de despliegue")
    
    # 6. Crear superusuario si no existe (opcional)
    print("👤 Configuración de usuario admin...")
    
    print("\n✅ Configuración de Railway completada")
    print("🌐 Tu aplicación está lista para Railway")
    print("📝 Asegúrate de configurar las variables de entorno en Railway:")
    print("   - DJANGO_SETTINGS_MODULE=pagTickets.settings_railway")
    print("   - DEBUG=False")
    print("   - RAILWAY_ENVIRONMENT=production")

def main():
    """Función principal"""
    if len(sys.argv) > 1:
        if sys.argv[1] == '--setup':
            setup_railway_environment()
        elif sys.argv[1] == '--migrate-only':
            run_command("python manage_railway.py migrate --noinput", "Solo migraciones")
        elif sys.argv[1] == '--static-only':
            run_command("python manage_railway.py collectstatic --noinput", "Solo archivos estáticos")
        else:
            print("Opciones disponibles:")
            print("  --setup      : Configuración completa")
            print("  --migrate-only : Solo migraciones")
            print("  --static-only  : Solo archivos estáticos")
    else:
        setup_railway_environment()

if __name__ == "__main__":
    main()
