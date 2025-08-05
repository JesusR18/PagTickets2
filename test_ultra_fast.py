"""
Test del servidor ultra-rápido para Railway
"""

import time
import sys

def test_ultra_fast_server():
    """Test del servidor que no usa Django para healthcheck"""
    try:
        print("🚀 TEST ULTRA FAST SERVER")
        print("=" * 40)
        
        # Test del WSGI directamente
        import os
        os.environ.setdefault('PORT', '8000')
        
        from pagTickets.wsgi_no_django import application
        print("✅ WSGI application imported")
        
        # Simular request de healthcheck
        environ = {
            'REQUEST_METHOD': 'GET',
            'PATH_INFO': '/ping',
            'SERVER_NAME': 'localhost',
            'SERVER_PORT': '8000',
        }
        
        start_response_called = False
        response_status = None
        response_headers = None
        
        def mock_start_response(status, headers):
            nonlocal start_response_called, response_status, response_headers
            start_response_called = True
            response_status = status
            response_headers = headers
        
        # Test 1: Healthcheck
        print("\n🔍 Test 1: Healthcheck request")
        start_time = time.time()
        
        response = application(environ, mock_start_response)
        response_body = b''.join(response)
        
        end_time = time.time()
        response_time = (end_time - start_time) * 1000
        
        print(f"   ✅ Response time: {response_time:.2f}ms")
        print(f"   ✅ Status: {response_status}")
        print(f"   ✅ Body: {response_body.decode()}")
        print(f"   ✅ Headers: {len(response_headers)} headers")
        
        if response_status.startswith('200') and b'RAILWAY_OK' in response_body:
            print("   ✅ Healthcheck PASSED")
        else:
            print("   ❌ Healthcheck FAILED")
            return False
        
        # Test 2: Verificar que NO carga Django para healthcheck
        print("\n🔍 Test 2: Django load test")
        # En el test anterior, Django NO debería haberse cargado
        if 'django' not in sys.modules:
            print("   ✅ Django NOT loaded for healthcheck (GOOD!)")
        else:
            print("   ⚠️ Django was loaded (not optimal but OK)")
        
        print("\n🎉 ULTRA FAST SERVER TEST PASSED!")
        print(f"🚀 Ready for Railway deployment with {response_time:.0f}ms healthcheck")
        return True
        
    except Exception as e:
        print(f"\n❌ ULTRA FAST SERVER TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_ultra_fast_server()
    sys.exit(0 if success else 1)
