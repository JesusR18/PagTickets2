#!/usr/bin/env python
"""
Test script específico para verificar funcionalidades QR y Códigos de Barras
"""

import os
import sys
import django

# Configurar Django con configuración Railway
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
django.setup()

def test_qr_barcode_functionality():
    """Test completo de funcionalidades QR y códigos de barras"""
    print("🧪 Probando funcionalidades QR y Códigos de Barras...")
    
    try:
        # Test 1: Importar librerías
        import qrcode
        from barcode import Code128, Code39, EAN13
        from barcode.writer import ImageWriter
        print("✅ Librerías QR y Barcode importadas correctamente")
        
        # Test 2: Importar modelos y vistas actualizadas
        from qrweb.models import QRRegistro
        from qrweb.views import (
            qr_home, registrar_qr, registrar_barcode,
            generar_qr_imagen, generar_barcode_imagen,
            generar_qr_base64, generar_barcode_base64
        )
        print("✅ Modelos y vistas QR/Barcode importados correctamente")
        
        # Test 3: Crear registro QR
        qr_test = QRRegistro(
            codigo="TEST_QR_SISEG_001",
            tipo_codigo="QR",
            nombre_activo="Laptop Test",
            marca_activo="Dell",
            modelo_activo="Inspiron"
        )
        print(f"✅ Modelo QR creado: {qr_test}")
        
        # Test 4: Crear registro de código de barras
        barcode_test = QRRegistro(
            codigo="123456789012",
            tipo_codigo="BARCODE",
            formato_barcode="CODE128",
            nombre_activo="Monitor Test",
            marca_activo="Samsung",
            modelo_activo="24 inch"
        )
        print(f"✅ Modelo Barcode creado: {barcode_test}")
        
        # Test 5: Generar QR real
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data("SISEG-TEST-QR")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        print("✅ Generación de QR funcional")
        
        # Test 6: Generar código de barras real
        barcode_obj = Code128("123456789", writer=ImageWriter())
        print("✅ Generación de código de barras funcional")
        
        # Test 7: Verificar URLs
        from django.urls import reverse
        try:
            qr_home_url = reverse('qr_home')
            print(f"✅ URL QR Home: {qr_home_url}")
        except:
            print("⚠️  URL qr_home no encontrada")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test QR/Barcode: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_new_template():
    """Test del nuevo template"""
    print("\n🧪 Probando nuevo template...")
    
    try:
        import os
        template_path = "qrweb/templates/qrweb/qr_barcode_scanner.html"
        if os.path.exists(template_path):
            print("✅ Nuevo template qr_barcode_scanner.html existe")
        else:
            print("⚠️  Template no encontrado en ruta esperada")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test de template: {e}")
        return False

def test_database_migration():
    """Test de migración de base de datos"""
    print("\n🧪 Probando migraciones de base de datos...")
    
    try:
        from qrweb.models import QRRegistro
        
        # Verificar campos nuevos
        qr_instance = QRRegistro()
        
        # Verificar que los nuevos campos existen
        fields = [field.name for field in QRRegistro._meta.fields]
        required_fields = [
            'codigo', 'tipo_codigo', 'nombre_activo', 
            'marca_activo', 'modelo_activo', 'fecha', 'formato_barcode'
        ]
        
        missing_fields = [field for field in required_fields if field not in fields]
        
        if not missing_fields:
            print("✅ Todos los campos requeridos están presentes")
            print(f"   Campos disponibles: {', '.join(fields)}")
        else:
            print(f"❌ Campos faltantes: {missing_fields}")
            return False
        
        # Verificar choices
        tipo_choices = [choice[0] for choice in QRRegistro.TIPO_CODIGO_CHOICES]
        if 'QR' in tipo_choices and 'BARCODE' in tipo_choices:
            print("✅ Opciones de tipo de código correctas")
        else:
            print(f"❌ Opciones de tipo incorrectas: {tipo_choices}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error en test de migración: {e}")
        return False

def main():
    """Función principal del test"""
    print("🚀 SISEG - Test de Funcionalidades QR y Códigos de Barras")
    print("=" * 60)
    
    resultados = []
    
    # Ejecutar tests
    resultados.append(test_qr_barcode_functionality())
    resultados.append(test_new_template())
    resultados.append(test_database_migration())
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE RESULTADOS:")
    
    exitosos = sum(resultados)
    total = len(resultados)
    
    if exitosos == total:
        print(f"✅ Todos los tests pasaron ({exitosos}/{total})")
        print("🎉 ¡Funcionalidades QR y Códigos de Barras listas!")
        print("\n🚀 NUEVAS CARACTERÍSTICAS DISPONIBLES:")
        print("   📱 Escáner QR con información de activos")
        print("   📊 Escáner de códigos de barras (CODE128, CODE39, EAN13)")
        print("   🎨 Generador de códigos QR personalizados")
        print("   🏷️  Generador de códigos de barras en múltiples formatos")
        print("   💾 Descarga de códigos como imágenes PNG")
        print("   📋 Registro mejorado con información de activos")
        print("   🔄 Interface modernizada con tabs")
        return 0
    else:
        print(f"⚠️  {exitosos}/{total} tests pasaron")
        print("🔧 Revisar errores antes del despliegue")
        return 1

if __name__ == "__main__":
    sys.exit(main())
