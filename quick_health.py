#!/usr/bin/env python3
"""
Script simple para verificar que la aplicación está respondiendo correctamente
Script ultra-minimalista para healthcheck
"""

import sys
import os

def quick_health_check():
    """
    Verificación ultra-rápida de salud de la aplicación
    """
    try:
        print("🚀 QUICK HEALTH CHECK")
        print("=" * 30)
        
        # 1. Verificar que Python funciona
        print(f"✅ Python version: {sys.version.split()[0]}")
        
        # 2. Verificar variables de entorno críticas
        port = os.environ.get('PORT', 'NOT_SET')
        settings = os.environ.get('DJANGO_SETTINGS_MODULE', 'NOT_SET')
        
        print(f"✅ PORT: {port}")
        print(f"✅ SETTINGS: {settings}")
        
        # 3. Verificar que Django se puede importar
        try:
            import django
            print(f"✅ Django import: {django.get_version()}")
        except ImportError as e:
            print(f"❌ Django import failed: {e}")
            return False
        
        # 4. Verificar configuración básica
        try:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
            django.setup()
            
            from django.conf import settings
            print(f"✅ Django setup: OK")
            print(f"✅ Debug mode: {settings.DEBUG}")
            print(f"✅ Allowed hosts: {len(settings.ALLOWED_HOSTS)} configured")
            
        except Exception as e:
            print(f"❌ Django setup failed: {e}")
            return False
        
        print("🎉 ALL CHECKS PASSED")
        return True
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        return False

if __name__ == "__main__":
    success = quick_health_check()
    sys.exit(0 if success else 1)
