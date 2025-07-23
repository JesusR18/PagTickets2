import json

# Datos de ejemplo para activos fijos en formato JSON
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

print("=== CÓDIGOS QR DE EJEMPLO ===")
print("Estos códigos QR contienen información estructurada en JSON:")
print()

for i, activo in enumerate(activos_ejemplo, 1):
    qr_content = json.dumps(activo, ensure_ascii=False)
    print(f"QR {i}: {activo['nombre']}")
    print(f"Contenido del QR: {qr_content}")
    print("-" * 80)
    print()

print("INSTRUCCIONES:")
print("1. Copia cualquiera de los contenidos de QR de arriba")
print("2. Usa un generador de QR online para crear el código QR")
print("3. Escanea el código QR con la aplicación")
print("4. El sistema debería detectar automáticamente la información del activo")
