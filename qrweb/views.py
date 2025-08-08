# Importa funciones necesarias de Django
from django.shortcuts import render  # Para mostrar páginas HTML
from django.http import JsonResponse, HttpResponse  # Para enviar respuestas en formato JSON y HTTP
from django.views.decorators.csrf import csrf_exempt  # Para permitir peticiones POST sin token CSRF
import json  # Para trabajar con datos JSON
import io  # Para manejar streams de datos
import base64  # Para codificar imágenes en base64
from .models import QRRegistro  # Importa el modelo QRRegistro desde models.py

# Importar librerías para generar códigos QR y códigos de barras
try:
    import qrcode  # Para generar códigos QR
    import qrcode.image.pil  # Para imágenes PIL
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False

try:
    from barcode import Code128, Code39, EAN13  # Para generar códigos de barras
    from barcode.writer import ImageWriter  # Para escribir imágenes de códigos de barras
    BARCODE_AVAILABLE = True
except ImportError:
    BARCODE_AVAILABLE = False

# Función principal que muestra la página de inicio con los códigos QR y códigos de barras
def qr_home(request):
    # Obtiene los últimos 20 registros de la base de datos, ordenados por fecha (más reciente primero)
    registros = QRRegistro.objects.order_by('-fecha')[:20]
    # Renderiza la página HTML y le pasa los registros como contexto
    context = {
        'registros': registros,
        'qr_available': QR_AVAILABLE,
        'barcode_available': BARCODE_AVAILABLE
    }
    return render(request, 'qrweb/qr_barcode_scanner.html', context)

# Nueva vista específica SOLO para escanear códigos de barras
def barcode_scanner(request):
    # Obtiene los últimos registros de códigos de barras únicamente
    registros = QRRegistro.objects.filter(tipo_codigo='barcode').order_by('-fecha')[:20]
    context = {
        'registros': registros,
        'barcode_available': BARCODE_AVAILABLE,
        'solo_barcode': True  # Flag para indicar que es solo para códigos de barras
    }
    return render(request, 'qrweb/barcode_scanner_simple.html', context)

# Decorador que permite recibir peticiones POST sin validación CSRF
@csrf_exempt
# Función que guarda un nuevo código QR en la base de datos
def registrar_qr(request):
    # Verifica si la petición es de tipo POST (envío de datos)
    if request.method == 'POST':
        try:
            # Convierte los datos JSON recibidos a un diccionario de Python
            data = json.loads(request.body)
            # Extrae el código QR de los datos recibidos
            codigo = data.get('codigo_qr')
            nombre_activo = data.get('nombre_activo', '')
            marca_activo = data.get('marca_activo', '')
            modelo_activo = data.get('modelo_activo', '')
            
            # Crea un nuevo registro en la base de datos con el código QR
            registro = QRRegistro.objects.create(
                codigo=codigo,
                tipo_codigo='QR',
                nombre_activo=nombre_activo,
                marca_activo=marca_activo,
                modelo_activo=modelo_activo
            )
            # Devuelve una respuesta JSON exitosa con el código registrado
            return JsonResponse({
                'status': 'ok', 
                'codigo_qr': registro.codigo,
                'tipo': 'QR',
                'id': registro.id
            })
        except Exception as e:
            # Si hay algún error, devuelve una respuesta JSON con el error
            return JsonResponse({'status': 'error', 'message': str(e)})
    # Si no es una petición POST, devuelve un error
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'})

# Decorador que permite recibir peticiones POST sin validación CSRF
@csrf_exempt
# Función que guarda un nuevo código de barras en la base de datos
def registrar_barcode(request):
    # Verifica si la petición es de tipo POST (envío de datos)
    if request.method == 'POST':
        try:
            # Convierte los datos JSON recibidos a un diccionario de Python
            data = json.loads(request.body)
            # Extrae el código de barras de los datos recibidos
            codigo = data.get('codigo_barras')
            formato = data.get('formato_barcode', 'CODE128')
            nombre_activo = data.get('nombre_activo', '')
            marca_activo = data.get('marca_activo', '')
            modelo_activo = data.get('modelo_activo', '')
            
            # Crea un nuevo registro en la base de datos con el código de barras
            registro = QRRegistro.objects.create(
                codigo=codigo,
                tipo_codigo='BARCODE',
                formato_barcode=formato,
                nombre_activo=nombre_activo,
                marca_activo=marca_activo,
                modelo_activo=modelo_activo
            )
            # Devuelve una respuesta JSON exitosa con el código registrado
            return JsonResponse({
                'status': 'ok', 
                'codigo_barras': registro.codigo,
                'tipo': 'BARCODE',
                'formato': formato,
                'id': registro.id
            })
        except Exception as e:
            # Si hay algún error, devuelve una respuesta JSON con el error
            return JsonResponse({'status': 'error', 'message': str(e)})
    # Si no es una petición POST, devuelve un error
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'})

# Función que devuelve los últimos códigos QR registrados en formato JSON
def ultimos_registros(request):
    # Obtiene los últimos 20 registros ordenados por fecha
    registros = QRRegistro.objects.order_by('-fecha')[:20]
    # Convierte cada registro a un diccionario con código y fecha formateada
    data = [
        {
            'codigo': r.codigo, 
            'fecha': r.fecha.strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': r.tipo_codigo,
            'nombre_activo': r.nombre_activo or '',
            'marca_activo': r.marca_activo or '',
            'modelo_activo': r.modelo_activo or '',
            'formato_barcode': r.formato_barcode or ''
        }
        for r in registros  # Recorre cada registro y crea un diccionario
    ]
    # Devuelve los datos en formato JSON
    return JsonResponse({'registros': data})

# Función para generar código QR como imagen
def generar_qr_imagen(request):
    if not QR_AVAILABLE:
        return JsonResponse({'error': 'Librería QR no disponible'}, status=500)
    
    texto = request.GET.get('texto', 'SISEG - Sistema de Gestión de Activos')
    
    try:
        # Crear el código QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(texto)
        qr.make(fit=True)
        
        # Crear imagen del QR
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a bytes
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Devolver imagen como respuesta HTTP
        response = HttpResponse(buffer.getvalue(), content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="qr_{texto[:20]}.png"'
        return response
        
    except Exception as e:
        return JsonResponse({'error': f'Error generando QR: {str(e)}'}, status=500)

# Función para generar código de barras como imagen
def generar_barcode_imagen(request):
    if not BARCODE_AVAILABLE:
        return JsonResponse({'error': 'Librería de códigos de barras no disponible'}, status=500)
    
    codigo = request.GET.get('codigo', '123456789012')
    formato = request.GET.get('formato', 'code128').lower()
    
    try:
        # Seleccionar el formato de código de barras
        if formato == 'code128':
            barcode_class = Code128
        elif formato == 'code39':
            barcode_class = Code39
        elif formato == 'ean13':
            barcode_class = EAN13
            # EAN13 requiere exactamente 12 dígitos (el 13º es checksum)
            if len(codigo) != 12 or not codigo.isdigit():
                codigo = '123456789012'  # Código por defecto válido
        else:
            barcode_class = Code128  # Por defecto
        
        # Crear el código de barras
        barcode_obj = barcode_class(codigo, writer=ImageWriter())
        
        # Convertir a bytes
        buffer = io.BytesIO()
        barcode_obj.write(buffer)
        buffer.seek(0)
        
        # Devolver imagen como respuesta HTTP
        response = HttpResponse(buffer.getvalue(), content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="barcode_{formato}_{codigo}.png"'
        return response
        
    except Exception as e:
        return JsonResponse({'error': f'Error generando código de barras: {str(e)}'}, status=500)

# Función para generar código QR en base64 para mostrar en web
def generar_qr_base64(request):
    if not QR_AVAILABLE:
        return JsonResponse({'error': 'Librería QR no disponible'}, status=500)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            texto = data.get('texto', 'SISEG')
            
            # Crear el código QR
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(texto)
            qr.make(fit=True)
            
            # Crear imagen del QR
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convertir a base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return JsonResponse({
                'status': 'ok',
                'qr_base64': f'data:image/png;base64,{img_base64}',
                'texto': texto
            })
            
        except Exception as e:
            return JsonResponse({'error': f'Error: {str(e)}'}, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)

# Función para generar código de barras en base64 para mostrar en web
def generar_barcode_base64(request):
    if not BARCODE_AVAILABLE:
        return JsonResponse({'error': 'Librería de códigos de barras no disponible'}, status=500)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            codigo = data.get('codigo', '123456789')
            formato = data.get('formato', 'code128').lower()
            
            # Seleccionar el formato de código de barras
            if formato == 'code128':
                barcode_class = Code128
            elif formato == 'code39':
                barcode_class = Code39
            elif formato == 'ean13':
                barcode_class = EAN13
                # EAN13 requiere exactamente 12 dígitos
                if len(codigo) != 12 or not codigo.isdigit():
                    codigo = '123456789012'
            else:
                barcode_class = Code128
            
            # Crear el código de barras
            barcode_obj = barcode_class(codigo, writer=ImageWriter())
            
            # Convertir a base64
            buffer = io.BytesIO()
            barcode_obj.write(buffer)
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return JsonResponse({
                'status': 'ok',
                'barcode_base64': f'data:image/png;base64,{img_base64}',
                'codigo': codigo,
                'formato': formato.upper()
            })
            
        except Exception as e:
            return JsonResponse({'error': f'Error: {str(e)}'}, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)
