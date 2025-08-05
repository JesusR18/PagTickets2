#!/usr/bin/env python3
"""
Test del WSGI súper simple
"""

def test_simple_wsgi():
    print("🧪 TEST SIMPLE WSGI")
    print("=" * 30)
    
    try:
        # Importar el WSGI
        from simple_wsgi import application
        print("✅ WSGI imported successfully")
        
        # Simular request
        environ = {
            'REQUEST_METHOD': 'GET',
            'PATH_INFO': '/',
            'SERVER_NAME': 'localhost',
            'SERVER_PORT': '8000',
        }
        
        # Variables para capturar respuesta
        response_status = None
        response_headers = None
        
        def mock_start_response(status, headers):
            nonlocal response_status, response_headers
            response_status = status
            response_headers = headers
        
        # Ejecutar request
        response_body = list(application(environ, mock_start_response))
        
        print(f"✅ Status: {response_status}")
        print(f"✅ Headers: {len(response_headers)} headers")
        print(f"✅ Body: {b''.join(response_body).decode()}")
        
        # Verificar que funciona
        if response_status == '200 OK' and b'OK' in b''.join(response_body):
            print("🎉 SIMPLE WSGI TEST PASSED!")
            return True
        else:
            print("❌ SIMPLE WSGI TEST FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_wsgi()
    exit(0 if success else 1)
