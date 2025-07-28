#!/usr/bin/env python3
"""
Script para probar los endpoints de healthcheck localmente
"""

import requests
import sys
import time

def test_healthcheck(base_url="http://localhost:8000"):
    """Probar todos los endpoints de healthcheck"""
    
    endpoints = [
        "/ping/",
        "/health/",
        "/healthz/",
        "/health/?simple=true"
    ]
    
    print(f"🔍 Probando healthchecks en: {base_url}")
    print("=" * 50)
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        try:
            print(f"📡 Probando: {endpoint}")
            start_time = time.time()
            
            response = requests.get(url, timeout=10)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            print(f"   Status: {response.status_code}")
            print(f"   Tiempo: {response_time:.2f}ms")
            print(f"   Respuesta: {response.text[:100]}...")
            
            if response.status_code == 200:
                print("   ✅ OK")
            else:
                print("   ❌ ERROR")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Error de conexión: {e}")
        
        print("-" * 30)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:8000"
    
    test_healthcheck(base_url)
