from pagTickets.models import ActivoFijo
from datetime import date

print("Creando activos de ejemplo...")

activos = [
    ("MOUSE", "Mouse óptico", "Oficina Principal", "Juan Pérez"),
    ("ESCRITORIO", "Escritorio de oficina", "Oficina Principal", "María González"),
    ("MONITOR", "Monitor LCD 24 pulgadas", "Oficina Principal", "Carlos López"),
    ("SILLA1", "Silla para visitas", "Sala de Juntas", "Ana Martínez"),
    ("TELEFONO", "Teléfono IP", "Oficina Principal", "Roberto Silva"),
    ("CPU", "Computadora de escritorio", "Oficina Principal", "Laura Hernández")
]

for codigo, nombre, ubicacion, responsable in activos:
    activo, created = ActivoFijo.objects.get_or_create(
        codigo=codigo,
        defaults={
            'nombre': nombre,
            'grupo': 'ADMINISTRACION',
            'fecha_adquisicion': date(2022, 9, 24),
            'ubicacion': ubicacion,
            'responsable': responsable,
            'descripcion': f'{nombre} - Activo de la empresa'
        }
    )
    status = "Creado" if created else "Ya existe"
    print(f"{status}: {codigo} - {nombre}")

print(f"\nTotal de activos en el sistema: {ActivoFijo.objects.count()}")
