# Script para crear datos de prueba de activos fijos
# Ejecutar con: python manage.py shell < crear_activos_ejemplo.py

from pagTickets.models import ActivoFijo
from datetime import date

# Crear activos de ejemplo basados en la imagen de MicroSIP que vimos
activos_ejemplo = [
    {
        'codigo': 'MOUSE',
        'nombre': 'Mouse óptico',
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
