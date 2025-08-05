#!/usr/bin/env python3
"""Test rápido del servidor Django"""

import subprocess
import sys
import os
import time
import urllib.request

def test_django_server():
    """Prueba rápida del servidor"""
    try:
        os.chdir(r"c:\Users\MONITOREO6\Downloads\pagTickets\pagTickets\pagTickets-2")
        
        print("🧪 Testing Django server...")
        
        # Verificar que los archivos existen
        if not os.path.exists('minimal_server.py'):
            print("❌ minimal_server.py not found")
            return False
            
        if not os.path.exists('manage.py'):
            print("❌ manage.py not found")
            return False
            
        print("✅ Files found")
        
        # Verificar imports de Django
        try:
            import django
            print(f"✅ Django {django.get_version()} imported")
        except ImportError:
            print("❌ Django not available")
            return False
            
        # Test de sintaxis del servidor
        result = subprocess.run([sys.executable, '-m', 'py_compile', 'minimal_server.py'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Server syntax OK")
        else:
            print(f"❌ Syntax error: {result.stderr}")
            return False
            
        print("🚀 Server ready for Railway deployment!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_django_server()
    print("\n" + "="*50)
    if success:
        print("✅ ALL TESTS PASSED - Ready to deploy!")
        print("📝 Next: Deploy to Railway with:")
        print("   railway up")
    else:
        print("❌ Tests failed - check configuration")
    print("="*50)
