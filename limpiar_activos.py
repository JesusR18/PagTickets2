#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from qrweb.models import QRRegistro
from pagTickets.models import RegistroQR

def main():
    print("=== LIMPIEZA DE ACTIVOS DE EJEMPLO Y PRUEBA ===\n")
    
    # Mostrar registros QR actuales (qrweb)
    print("QRRegistros existentes (qrweb):")
    qr_registros = QRRegistro.objects.all()
    for registro in qr_registros:
        print(f"- {registro.codigo} (fecha: {registro.fecha})")
    
    print(f"\nTotal de QRRegistros: {qr_registros.count()}")
    
    # Mostrar registros QR actuales (pagTickets)
    print("\nRegistroQR existentes (pagTickets):")
    registros = RegistroQR.objects.all()
    for registro in registros:
        print(f"- {registro.codigo} (fecha: {registro.fecha_registro})")
    
    print(f"\nTotal de RegistroQR: {registros.count()}")
    
    # Buscar registros de ejemplo/prueba (palabras clave comunes)
    palabras_ejemplo = ['ejemplo', 'prueba', 'test', 'sample', 'demo', 'COMP-001', 'COMP-002', 'COMP-003', 'hola como estas', 'qr.link']
    
    qr_registros_a_eliminar = []
    registros_a_eliminar = []
    
    for registro in qr_registros:
        for palabra in palabras_ejemplo:
            if palabra.lower() in registro.codigo.lower():
                qr_registros_a_eliminar.append(registro)
                break
    
    for registro in registros:
        for palabra in palabras_ejemplo:
            if palabra.lower() in registro.codigo.lower():
                registros_a_eliminar.append(registro)
                break
    
    if qr_registros_a_eliminar:
        print(f"\n=== QRRegistros A ELIMINAR ({len(qr_registros_a_eliminar)}) ===")
        for registro in qr_registros_a_eliminar:
            print(f"- {registro.codigo}")
    
    if registros_a_eliminar:
        print(f"\n=== RegistroQR A ELIMINAR ({len(registros_a_eliminar)}) ===")
        for registro in registros_a_eliminar:
            print(f"- {registro.codigo}")
    
    if qr_registros_a_eliminar or registros_a_eliminar:
        respuesta = input(f"\n¿Desea eliminar {len(qr_registros_a_eliminar)} QRRegistros y {len(registros_a_eliminar)} RegistroQR? (s/n): ")
        if respuesta.lower() in ['s', 'si', 'y', 'yes']:
            # Eliminar QRRegistros
            for registro in qr_registros_a_eliminar:
                print(f"Eliminando QRRegistro: {registro.codigo}")
                registro.delete()
            
            # Eliminar RegistroQR
            for registro in registros_a_eliminar:
                print(f"Eliminando RegistroQR: {registro.codigo}")
                registro.delete()
            
            print(f"\n✅ Limpieza completada!")
            print(f"   - {len(qr_registros_a_eliminar)} QRRegistros eliminados")
            print(f"   - {len(registros_a_eliminar)} RegistroQR eliminados")
            
            # Mostrar estado final
            print(f"\nEstado final:")
            print(f"   - QRRegistros restantes: {QRRegistro.objects.count()}")
            print(f"   - RegistroQR restantes: {RegistroQR.objects.count()}")
        else:
            print("Operación cancelada.")
    else:
        print("\n✅ No se encontraron registros de ejemplo o prueba para eliminar.")

if __name__ == "__main__":
    main()
