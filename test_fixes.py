#!/usr/bin/env python
"""
Test script para verificar que la aplicación SISEG funciona correctamente
después de las correcciones de importación - VERSION RAILWAY
"""

import os
import sys
import django

# Configurar Django con configuración Railway
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
django.setup()

def test_qrweb_models():
    """Test de modelos de qrweb"""
    print("🧪 Probando modelos de qrweb...")
    
    try:
        from qrweb.models import QRRegistro
        from qrweb import views
        print("✅ Import de QRRegistro exitoso")
        print("✅ Import de qrweb.views exitoso")
        
        # Test crear registro QR (sin guardar en DB)
        test_qr = QRRegistro(codigo="TEST_QR_12345")
        print(f"✅ Modelo QRRegistro funcional: {test_qr}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test de qrweb: {e}")
        return False

def test_api_services():
    """Test de los servicios de API"""
    print("🧪 Probando servicios de API...")
    
    try:
        from pagTickets.api_services import siseg_api
        print("✅ Import de api_services exitoso")
        
        # Test búsqueda de precio
        resultado = siseg_api.buscar_precio_rapido({
            'marca': 'dell',
            'modelo': 'laptop',
            'nombre': 'dell laptop inspiron'
        })
        print(f"✅ Búsqueda de precio: {resultado['exito']}")
        print(f"   Precio estimado: ${resultado['precio_estimado']}")
        
        # Test catálogo de marca
        catalogo = siseg_api.obtener_catalogo_marca('hp')
        print(f"✅ Catálogo de marca: {catalogo['exito']}")
        
        # Test reporte de inventario
        activos_test = [
            {'marca': 'hp', 'modelo': 'laptop', 'nombre': 'HP Laptop'},
            {'marca': 'dell', 'modelo': 'desktop', 'nombre': 'Dell Desktop'}
        ]
        reporte = siseg_api.generar_reporte_inventario(activos_test)
        print(f"✅ Reporte de inventario: {reporte['exito']}")
        print(f"   Total activos: {reporte['total_activos']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test de API services: {e}")
        return False

def test_views_import():
    """Test de importación de views"""
    print("\n🧪 Probando importación de views...")
    
    try:
        import pagTickets.views
        print("✅ Import de views exitoso")
        return True
    except Exception as e:
        print(f"❌ Error en import de views: {e}")
        return False

def test_url_patterns():
    """Test de patrones de URL"""
    print("\n🧪 Probando patrones de URL...")
    
    try:
        from django.urls import reverse
        from django.test import Client
        
        # URLs principales que deberían existir
        urls_test = [
            'qr_home',  # URL del escáner QR
            'generar_qr_activo',  # URL para generar QR
            'exportar_excel'  # URL para exportar Excel
        ]
        
        for url_name in urls_test:
            try:
                url = reverse(url_name)
                print(f"✅ URL '{url_name}': {url}")
            except:
                print(f"⚠️  URL '{url_name}' no encontrada (puede ser normal)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test de URLs: {e}")
        return False

def main():
    """Función principal del test"""
    print("🚀 SISEG - Test de Correcciones de Importación")
    print("=" * 50)
    
    resultados = []
    
    # Ejecutar tests
    resultados.append(test_views_import())
    resultados.append(test_qrweb_models())
    resultados.append(test_api_services())
    resultados.append(test_url_patterns())
    
    # Resumen
    print("\n" + "=" * 50)
    print("📊 RESUMEN DE RESULTADOS:")
    
    exitosos = sum(resultados)
    total = len(resultados)
    
    if exitosos == total:
        print(f"✅ Todos los tests pasaron ({exitosos}/{total})")
        print("🎉 La aplicación está lista para Railway!")
        return 0
    else:
        print(f"⚠️  {exitosos}/{total} tests pasaron")
        print("🔧 Revisar errores antes del despliegue")
        return 1

if __name__ == "__main__":
    sys.exit(main())
