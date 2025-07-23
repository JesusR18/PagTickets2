import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

# Ahora importar el modelo
from pagTickets.models import ActivoFijo

# Datos de ejemplo
activos_ejemplo = [
    {
        "codigo": "ACT001",
        "nombre": "Laptop Dell Inspiron 15",
        "ubicacion": "Oficina Principal - Escritorio 1",
        "marca": "Dell",
        "modelo": "Inspiron 15 3000",
        "no_serie": "DL123456789"
    },
    {
        "codigo": "ACT002", 
        "nombre": "Monitor Samsung 24\"",
        "ubicacion": "Oficina Principal - Escritorio 1",
        "marca": "Samsung",
        "modelo": "S24F350FH",
        "no_serie": "SM987654321"
    },
    {
        "codigo": "ACT003",
        "nombre": "Impresora HP LaserJet",
        "ubicacion": "Área de Impresión",
        "marca": "HP",
        "modelo": "LaserJet Pro P1102",
        "no_serie": "HP556677889"
    }
]

print("Agregando activos de ejemplo...")

try:
    for activo_data in activos_ejemplo:
        activo, created = ActivoFijo.objects.get_or_create(
            codigo=activo_data['codigo'],
            defaults=activo_data
        )
        if created:
            print(f"✅ Creado: {activo.nombre}")
        else:
            print(f"⚠️ Ya existe: {activo.nombre}")
    
    print(f"\nTotal de activos en el sistema: {ActivoFijo.objects.count()}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("Nota: Si el modelo ActivoFijo no existe, ejecuta primero las migraciones.")
