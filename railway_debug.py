#!/usr/bin/env python3
"""
Script de debugging para Railway
Ayuda a identificar problemas de healthcheck
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

def debug_railway_setup():
    """Debug de configuración Railway"""
    print("🔍 RAILWAY DEBUG INFORMATION")
    print("=" * 50)
    
    # Variables de entorno Railway
    railway_vars = [
        'RAILWAY_ENVIRONMENT',
        'PORT',
        'DJANGO_SETTINGS_MODULE',
        'PYTHONPATH',
        'DEBUG'
    ]
    
    print("📋 Variables de entorno:")
    for var in railway_vars:
        value = os.environ.get(var, 'NOT SET')
        print(f"  {var}: {value}")
    
    print("\n🔧 Django Setup:")
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
        django.setup()
        
        from django.conf import settings
        print(f"  Settings Module: {settings.SETTINGS_MODULE}")
        print(f"  Debug Mode: {settings.DEBUG}")
        print(f"  Allowed Hosts: {settings.ALLOWED_HOSTS}")
        print(f"  Database: {settings.DATABASES['default']['NAME']}")
        
        # Test de base de datos
        print("\n💾 Database Test:")
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                print(f"  ✅ Database connection: OK (result: {result})")
        except Exception as db_error:
            print(f"  ❌ Database connection: FAILED - {db_error}")
        
        # Test de healthcheck endpoints
        print("\n🏥 Healthcheck Endpoints Test:")
        from django.test import Client
        client = Client()
        
        endpoints = ['/ping/', '/health/', '/healthz/']
        for endpoint in endpoints:
            try:
                response = client.get(endpoint)
                status = "✅ OK" if response.status_code == 200 else f"❌ ERROR {response.status_code}"
                print(f"  {endpoint}: {status}")
                print(f"    Content: {response.content.decode()[:50]}...")
            except Exception as e:
                print(f"  {endpoint}: ❌ EXCEPTION - {e}")
        
    except Exception as setup_error:
        print(f"  ❌ Django setup failed: {setup_error}")
        return False
    
    print("\n🚀 Recommendations:")
    
    # Verificar PORT
    port = os.environ.get('PORT', '8080')
    if not port.isdigit():
        print("  ⚠️  PORT variable should be numeric")
    else:
        print(f"  ✅ PORT is set to: {port}")
    
    # Verificar settings
    if os.environ.get('DJANGO_SETTINGS_MODULE') != 'pagTickets.settings_railway':
        print("  ⚠️  DJANGO_SETTINGS_MODULE should be 'pagTickets.settings_railway'")
    else:
        print("  ✅ DJANGO_SETTINGS_MODULE is correct")
    
    return True

if __name__ == "__main__":
    debug_railway_setup()
