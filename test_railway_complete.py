#!/usr/bin/env python3
"""
Test completo del Railway WSGI
"""

def test_railway_wsgi():
    print("🚀 TEST RAILWAY WSGI COMPLETO")
    print("=" * 40)
    
    try:
        # Test 1: Importación
        from railway_wsgi import application
        print("✅ WSGI importado exitosamente")
        
        # Test 2: Variables de entorno
        import os
        os.environ.setdefault('PORT', '8000')
        print(f"✅ PORT configurado: {os.environ.get('PORT')}")
        
        # Test 3: Múltiples rutas
        test_routes = [
            ('/', 'RAILWAY_READY'),
            ('/ping', 'PONG'),
            ('/health', 'HEALTHY'),
            ('/any/other/path', 'OK_any_other_path')
        ]
        
        for path, expected_content in test_routes:
            print(f"\n🔍 Testing {path}")
            
            environ = {
                'REQUEST_METHOD': 'GET',
                'PATH_INFO': path,
                'SERVER_NAME': 'localhost',
                'SERVER_PORT': '8000',
                'HTTP_HOST': 'localhost:8000'
            }
            
            response_status = None
            response_headers = None
            
            def mock_start_response(status, headers):
                nonlocal response_status, response_headers
                response_status = status
                response_headers = headers
            
            # Ejecutar request
            import time
            start_time = time.time()
            response_body = list(application(environ, mock_start_response))
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000
            body_text = b''.join(response_body).decode('utf-8')
            
            print(f"   ✅ Status: {response_status}")
            print(f"   ✅ Response time: {response_time:.2f}ms")
            print(f"   ✅ Body: {body_text}")
            print(f"   ✅ Headers: {len(response_headers)}")
            
            # Verificar respuesta
            if response_status != '200 OK':
                print(f"   ❌ Status incorrecto: {response_status}")
                return False
                
            if expected_content not in body_text:
                print(f"   ❌ Contenido incorrecto. Esperado: {expected_content}")
                return False
            
            print(f"   ✅ Test {path} PASSED")
        
        print("\n🎉 TODOS LOS TESTS RAILWAY WSGI PASSED!")
        print("🚀 Ready for Railway deployment!")
        return True
        
    except Exception as e:
        print(f"\n❌ RAILWAY WSGI TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_railway_wsgi()
    exit(0 if success else 1)
