import os
import sys
import django
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

# Ahora importar el modelo
from pagTickets.models import RegistroQR

# Datos de ejemplo en formato JSON para los códigos QR
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
    },
    {
        "codigo": "ACT004",
        "nombre": "Silla Ergonómica Oficina",
        "ubicacion": "Oficina Principal - Escritorio 2",
        "marca": "Steelcase",
        "modelo": "Leap V2",
        "no_serie": "SC112233445"
    },
    {
        "codigo": "ACT005",
        "nombre": "Escritorio de Madera",
        "ubicacion": "Oficina Principal - Escritorio 3",
        "marca": "IKEA",
        "modelo": "BEKANT",
        "no_serie": "IK778899001"
    }
]

print("Agregando registros QR de ejemplo...")

try:
    for activo_data in activos_ejemplo:
        # Convertir los datos a JSON para almacenar en el campo codigo
        codigo_json = json.dumps(activo_data, ensure_ascii=False)
        
        # Crear o obtener el registro
        registro, created = RegistroQR.objects.get_or_create(
            codigo=codigo_json,
            defaults={
                'usuario': 'Sistema',
                'ubicacion': 'Datos de Prueba',
                'notas': f'Activo de ejemplo: {activo_data["nombre"]}'
            }
        )
        
        if created:
            print(f"✅ Creado: {activo_data['nombre']} (Código: {activo_data['codigo']})")
        else:
            print(f"⚠️ Ya existe: {activo_data['nombre']} (Código: {activo_data['codigo']})")
    
    print(f"\nTotal de registros en el sistema: {RegistroQR.objects.count()}")
    print("\n🎉 ¡Datos de ejemplo agregados exitosamente!")
    print("Ahora puedes:")
    print("1. Visitar http://localhost:8000 para ver la interfaz del escáner")
    print("2. Ver la tabla con los activos de ejemplo")
    print("3. Exportar los datos a Excel")
    print("4. Probar escaneando QRs con formato JSON similar")
    
except Exception as e:
    print(f"❌ Error: {e}")
