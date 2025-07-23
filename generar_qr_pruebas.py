import qrcode
from PIL import Image
import os

# Lista de códigos QR de ejemplo para probar el sistema
codigos_ejemplo = [
    # Formato estructurado como el que mencionaste
    "Activo: Escritorio en L Ubicación: 1er piso R.H. Marca: Techni mobili Modelo: Havano N. Serie: -.",
    "Activo: Silla Ejecutiva Ubicación: Gerencia General Marca: Steelcase Modelo: Think Chair N. Serie: SC123456",
    "Activo: Monitor 24 pulgadas Ubicación: Contabilidad Marca: Samsung Modelo: F24T450FQL N. Serie: SN789123",
    "Activo: Impresora Multifuncional Ubicación: Recepción Marca: HP Modelo: LaserJet Pro MFP M428fdw N. Serie: HPM428789",
    
    # Formato JSON
    '{"codigo": "ACT001", "nombre": "Laptop Dell Latitude", "ubicacion": "Oficina Principal", "marca": "Dell", "modelo": "Latitude 7520", "no_serie": "DL123456"}',
    
    # Formato pipe
    "ACT002|Impresora Canon|Sala de Juntas|Canon|PIXMA G6020|CN987654",
    
    # Formato simple
    "EQUIPO-005 - Teléfono IP",
    "ACTIVO-GENERAL-006"
]

def generar_qr_codes():
    """Genera códigos QR de ejemplo para probar el sistema"""
    
    # Crear directorio si no existe
    if not os.path.exists('qr_examples'):
        os.makedirs('qr_examples')
    
    for i, codigo in enumerate(codigos_ejemplo, 1):
        # Crear QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(codigo)
        qr.make(fit=True)
        
        # Crear imagen
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar imagen
        filename = f'qr_examples/qr_ejemplo_{i:02d}.png'
        img.save(filename)
        
        # Imprimir información
        print(f"QR {i:02d} guardado como: {filename}")
        print(f"Contenido: {codigo[:50]}{'...' if len(codigo) > 50 else ''}")
        print("-" * 80)

if __name__ == "__main__":
    try:
        generar_qr_codes()
        print("\n✅ Códigos QR generados exitosamente en la carpeta 'qr_examples'")
        print("📱 Puedes usar estos QR codes para probar el sistema de lectura")
    except ImportError:
        print("❌ Necesitas instalar las librerías: pip install qrcode[pil]")
    except Exception as e:
        print(f"❌ Error: {e}")
