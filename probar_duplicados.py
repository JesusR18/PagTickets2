#!/usr/bin/env python
"""
Script para probar la detección de duplicados
Crea QR con mismas características pero diferente formato
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
django.setup()

from pagTickets.models import RegistroQR
from pagTickets.views import extraer_informacion_qr, verificar_activo_existente

def probar_duplicados():
    """Prueba la detección de activos duplicados"""
    
    print("🔍 Probando detección de duplicados...")
    
    # QR original existente
    qr_original = 'Activo: Silla Ejecutiva Ubicación: Gerencia General Marca: Steelcase Modelo: Think Chair N. Serie: SC123456'
    
    # QR con mismas características pero formato diferente
    qr_duplicado_json = '{"nombre": "Silla Ejecutiva", "ubicacion": "Gerencia General", "marca": "Steelcase", "modelo": "Think Chair", "no_serie": "SC123456"}'
    
    # QR con mismas características pero formato pipe
    qr_duplicado_pipe = 'SILLA-EJ-001|Silla Ejecutiva|Gerencia General|Steelcase|Think Chair|SC123456'
    
    # Extraer información de cada QR
    print("\n📋 Información extraída:")
    info_original = extraer_informacion_qr(qr_original)
    print(f"Original: {info_original}")
    
    info_duplicado_json = extraer_informacion_qr(qr_duplicado_json)
    print(f"JSON: {info_duplicado_json}")
    
    info_duplicado_pipe = extraer_informacion_qr(qr_duplicado_pipe)
    print(f"Pipe: {info_duplicado_pipe}")
    
    # Verificar si son detectados como duplicados
    print("\n🔍 Verificación de duplicados:")
    
    # Verificar el JSON
    resultado_json = verificar_activo_existente(info_duplicado_json)
    if resultado_json:
        print(f"✅ JSON detectado como duplicado del registro ID: {resultado_json.id}")
    else:
        print("❌ JSON NO detectado como duplicado")
    
    # Verificar el pipe
    resultado_pipe = verificar_activo_existente(info_duplicado_pipe)
    if resultado_pipe:
        print(f"✅ Pipe detectado como duplicado del registro ID: {resultado_pipe.id}")
    else:
        print("❌ Pipe NO detectado como duplicado")
    
    # Probar con un activo completamente diferente
    qr_diferente = '{"nombre": "Computadora Diferente", "ubicacion": "Otra Oficina", "marca": "HP", "modelo": "EliteBook", "no_serie": "HP987654"}'
    info_diferente = extraer_informacion_qr(qr_diferente)
    resultado_diferente = verificar_activo_existente(info_diferente)
    
    print(f"\n🆕 Activo diferente:")
    print(f"Info: {info_diferente}")
    if resultado_diferente:
        print(f"❌ ERROR: Activo diferente detectado como duplicado del registro ID: {resultado_diferente.id}")
    else:
        print("✅ Activo diferente correctamente identificado como nuevo")

if __name__ == "__main__":
    try:
        probar_duplicados()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
