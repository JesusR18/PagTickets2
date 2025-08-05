#!/usr/bin/env python3
"""
Test de API de precios - Railway Compatible
Prueba las APIs sin dependencias externas
"""

import os
import sys
import django

def test_pricing_api():
    """Test del sistema de precios"""
    try:
        print("🧪 TESTING PRICING API")
        print("=" * 40)
        
        # Setup Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
        django.setup()
        
        # Import después del setup
        from pagTickets.api_services import siseg_api
        
        print("✅ API Service imported successfully")
        
        # Test datos de prueba
        test_activo = {
            'id': 'TEST001',
            'nombre': 'Laptop HP EliteBook',
            'marca': 'HP',
            'modelo': 'EliteBook 840',
            'ubicacion': 'Administración'
        }
        
        # Test 1: Búsqueda rápida de precio
        print("\n🔍 Test 1: Búsqueda rápida de precio")
        resultado = siseg_api.buscar_precio_rapido(test_activo)
        if resultado['exito']:
            print(f"   ✅ Precio estimado: ${resultado['precio_estimado']} USD")
            print(f"   ✅ Rango: ${resultado['precio_min']}-${resultado['precio_max']}")
            print(f"   ✅ Fuente: {resultado['fuente']}")
        else:
            print(f"   ❌ Error: {resultado['error']}")
        
        # Test 2: Reporte de inventario
        print("\n📊 Test 2: Reporte de inventario")
        activos_test = [
            test_activo,
            {
                'id': 'TEST002',
                'nombre': 'Monitor Dell',
                'marca': 'Dell',
                'modelo': 'UltraSharp',
                'ubicacion': 'Oficina'
            }
        ]
        
        reporte = siseg_api.generar_reporte_inventario(activos_test)
        if reporte['exito']:
            print(f"   ✅ Total activos: {reporte['total_activos']}")
            print(f"   ✅ Valor total estimado: ${reporte['valor_total_estimado']} USD")
            print(f"   ✅ Categorías: {len(reporte['activos_por_categoria'])}")
        else:
            print(f"   ❌ Error: {reporte['error']}")
        
        # Test 3: Catálogo de marca
        print("\n📖 Test 3: Catálogo de marca")
        catalogo = siseg_api.obtener_catalogo_marca('HP')
        if catalogo['exito']:
            print(f"   ✅ Marca: {catalogo['data']['nombre_completo']}")
            print(f"   ✅ País: {catalogo['data']['pais_origen']}")
            print(f"   ✅ Especialidades: {len(catalogo['data']['especialidades'])}")
        else:
            print(f"   ❌ Error: {catalogo['error']}")
        
        print("\n🎉 ALL API TESTS PASSED!")
        return True
        
    except Exception as e:
        print(f"\n❌ API TEST FAILED: {e}")
        return False

if __name__ == "__main__":
    success = test_pricing_api()
    sys.exit(0 if success else 1)
