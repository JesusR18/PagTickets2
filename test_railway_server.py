#!/usr/bin/env python3
"""
Test del servidor HTTP básico para Railway
"""

import subprocess
import time
import sys
import os
import signal
import urllib.request
import urllib.error

def test_railway_server():
    """Test completo del servidor Railway"""
    print("🚀 TEST RAILWAY SERVER HTTP BÁSICO")
    print("=" * 50)
    
    server_process = None
    
    try:
        # Test 1: Verificar que el script se puede importar
        print("🔍 Test 1: Import del servidor")
        import railway_server
        print("   ✅ railway_server.py importado exitosamente")
        
        # Test 2: Iniciar servidor en background
        print("\n🔍 Test 2: Iniciando servidor en background")
        port = 8001  # Puerto diferente para test
        
        env = os.environ.copy()
        env['PORT'] = str(port)
        
        server_process = subprocess.Popen([
            sys.executable, 'railway_server.py'
        ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print(f"   ✅ Servidor iniciado en puerto {port}")
        
        # Esperar a que el servidor arranque
        time.sleep(2)
        
        # Test 3: Verificar que el proceso está vivo
        print("\n🔍 Test 3: Verificando proceso del servidor")
        if server_process.poll() is None:
            print("   ✅ Proceso del servidor está corriendo")
        else:
            print("   ❌ Proceso del servidor murió")
            stdout, stderr = server_process.communicate()
            print(f"   STDOUT: {stdout.decode()}")
            print(f"   STDERR: {stderr.decode()}")
            return False
        
        # Test 4: Probar endpoints HTTP
        print("\n🔍 Test 4: Probando endpoints HTTP")
        
        test_endpoints = [
            ('/', 'RAILWAY_OK'),
            ('/ping', 'PONG'),
            ('/health', 'HEALTHY')
        ]
        
        for endpoint, expected in test_endpoints:
            try:
                url = f"http://localhost:{port}{endpoint}"
                print(f"   🔗 Testing {url}")
                
                start_time = time.time()
                with urllib.request.urlopen(url, timeout=5) as response:
                    end_time = time.time()
                    
                    status_code = response.getcode()
                    response_body = response.read().decode('utf-8')
                    response_time = (end_time - start_time) * 1000
                    
                    print(f"      ✅ Status: {status_code}")
                    print(f"      ✅ Response time: {response_time:.2f}ms")
                    print(f"      ✅ Body: {response_body}")
                    
                    if status_code == 200 and expected in response_body:
                        print(f"      ✅ Test {endpoint} PASSED")
                    else:
                        print(f"      ❌ Test {endpoint} FAILED")
                        return False
                        
            except urllib.error.URLError as e:
                print(f"      ❌ Connection error: {e}")
                return False
            except Exception as e:
                print(f"      ❌ Test error: {e}")
                return False
        
        print("\n🎉 TODOS LOS TESTS DEL SERVIDOR HTTP PASSED!")
        print("🚀 Ready for Railway deployment!")
        return True
        
    except Exception as e:
        print(f"\n❌ SERVER TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup: matar proceso del servidor
        if server_process and server_process.poll() is None:
            print("\n🧹 Limpiando proceso del servidor...")
            try:
                server_process.terminate()
                server_process.wait(timeout=5)
                print("   ✅ Servidor detenido correctamente")
            except subprocess.TimeoutExpired:
                server_process.kill()
                print("   ⚠️ Servidor forzado a terminar")
            except Exception as e:
                print(f"   ⚠️ Error al detener servidor: {e}")

if __name__ == "__main__":
    success = test_railway_server()
    sys.exit(0 if success else 1)
