#!/usr/bin/env python
"""
Script para crear activos de ejemplo en la base de datos
Esto permite probar la funcionalidad de eliminación
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
django.setup()

from pagTickets.models import RegistroQR
from django.utils import timezone

def crear_activos_ejemplo():
    """Crea activos de ejemplo para probar el sistema"""
    
    activos_ejemplo = [
        # Formato estructurado
        "Activo: Escritorio en L Ubicación: 1er piso R.H. Marca: Techni mobili Modelo: Havano N. Serie: -.",
        "Activo: Silla Ejecutiva Ubicación: Gerencia General Marca: Steelcase Modelo: Think Chair N. Serie: SC123456",
        "Activo: Monitor 24 pulgadas Ubicación: Contabilidad Marca: Samsung Modelo: F24T450FQL N. Serie: SN789123",
        
        # Formato JSON
        '{"codigo": "LAP001", "nombre": "Laptop Dell Latitude", "ubicacion": "Oficina Principal", "marca": "Dell", "modelo": "Latitude 7520", "no_serie": "DL123456"}',
        '{"codigo": "IMP001", "nombre": "Impresora Canon", "ubicacion": "Sala de Juntas", "marca": "Canon", "modelo": "PIXMA G6020", "no_serie": "CN987654"}',
        
        # Formato pipe
        "TEL001|Teléfono IP Cisco|Recepción|Cisco|IP Phone 7945|CS456789",
        "PRY001|Proyector Epson|Sala de Conferencias|Epson|PowerLite|EP123456",
        
        # Formato simple
        "EQUIPO-008 - Router WiFi",
        "ACTIVO-GENERAL-009"
    ]
    
    print("Creando activos de ejemplo...")
    
    for i, codigo in enumerate(activos_ejemplo, 1):
        # Verificar si ya existe
        if not RegistroQR.objects.filter(codigo=codigo).exists():
            registro = RegistroQR.objects.create(
                codigo=codigo,
                usuario="Sistema",
                ubicacion="Creado automáticamente",
                notas=f"Activo de ejemplo #{i}"
            )
            print(f"✅ Activo {i} creado: {codigo[:50]}{'...' if len(codigo) > 50 else ''}")
        else:
            print(f"⚠️  Activo {i} ya existe, saltando...")
    
    total_activos = RegistroQR.objects.count()
    print(f"\n🎉 Total de activos en la base de datos: {total_activos}")
    print("📱 Ve a http://localhost:8000 para ver los activos y probar la eliminación")

if __name__ == "__main__":
    try:
        crear_activos_ejemplo()
    except Exception as e:
        print(f"❌ Error: {e}")
        'grupo': 'ADMINISTRACION',
        'fecha_adquisicion': date(2022, 9, 24),
        'ubicacion': 'Oficina Principal',
        'responsable': 'Juan Pérez',
        'descripcion': 'Mouse óptico para computadora de oficina'
    },
    {
        'codigo': 'ESCRITORIO',
        'nombre': 'Escritorio de oficina',
        'grupo': 'ADMINISTRACION', 
        'fecha_adquisicion': date(2022, 9, 24),
        'ubicacion': 'Oficina Principal',
        'responsable': 'María González',
        'descripcion': 'Escritorio de madera para estación de trabajo'
    },
    {
        'codigo': 'MONITOR',
        'nombre': 'Monitor LCD 24 pulgadas',
        'grupo': 'ADMINISTRACION',
        'fecha_adquisicion': date(2022, 9, 24),
        'ubicacion': 'Oficina Principal',
        'responsable': 'Carlos López',
        'descripcion': 'Monitor LCD de 24 pulgadas para estación de trabajo'
    },
    {
        'codigo': 'SILLA1',
        'nombre': 'Silla para visitas',
        'grupo': 'ADMINISTRACION',
        'fecha_adquisicion': date(2022, 9, 24),
        'ubicacion': 'Sala de Juntas',
        'responsable': 'Ana Martínez',
        'descripcion': 'Silla ergonómica para visitas, color negro'
    },
    {
        'codigo': 'TELEFONO',
        'nombre': 'Teléfono IP',
        'grupo': 'ADMINISTRACION',
        'fecha_adquisicion': date(2022, 9, 24),
        'ubicacion': 'Oficina Principal',
        'responsable': 'Roberto Silva',
        'descripcion': 'Teléfono IP para comunicaciones internas'
    },
    {
        'codigo': 'CPU',
        'nombre': 'Computadora de escritorio',
        'grupo': 'ADMINISTRACION',
        'fecha_adquisicion': date(2022, 9, 24),
        'ubicacion': 'Oficina Principal',
        'responsable': 'Laura Hernández',
        'descripcion': 'CPU Intel Core i5, 8GB RAM, 500GB SSD'
    }
]

# Crear o actualizar activos
activos_creados = 0
activos_actualizados = 0

for activo_data in activos_ejemplo:
    activo, created = ActivoFijo.objects.get_or_create(
        codigo=activo_data['codigo'],
        defaults=activo_data
    )
    
    if created:
        activos_creados += 1
        print(f"✅ Creado: {activo.codigo} - {activo.nombre}")
    else:
        # Actualizar información
        for field, value in activo_data.items():
            setattr(activo, field, value)
        activo.save()
        activos_actualizados += 1
        print(f"🔄 Actualizado: {activo.codigo} - {activo.nombre}")

print(f"\n📊 Resumen:")
print(f"   Activos creados: {activos_creados}")
print(f"   Activos actualizados: {activos_actualizados}")
print(f"   Total activos en sistema: {ActivoFijo.objects.count()}")
print(f"\n🎯 Ahora puedes escanear códigos QR con estos códigos:")
for activo_data in activos_ejemplo:
    print(f"   - {activo_data['codigo']}")
