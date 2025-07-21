# Importa funciones necesarias de Django
from django.shortcuts import render  # Para mostrar páginas HTML
from django.http import JsonResponse  # Para enviar respuestas en formato JSON
from django.views.decorators.csrf import csrf_exempt  # Para permitir peticiones POST sin token CSRF
import json  # Para trabajar con datos JSON
from .models import QRRegistro  # Importa el modelo QRRegistro desde models.py

# Función principal que muestra la página de inicio con los códigos QR
def qr_home(request):
    # Obtiene los últimos 10 registros de la base de datos, ordenados por fecha (más reciente primero)
    registros = QRRegistro.objects.order_by('-fecha')[:10]
    # Renderiza la página HTML y le pasa los registros como contexto
    return render(request, 'qrweb/qr_home.html', {'registros': registros})

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
            # Crea un nuevo registro en la base de datos con el código QR
            registro = QRRegistro.objects.create(codigo=codigo)
            # Devuelve una respuesta JSON exitosa con el código registrado
            return JsonResponse({'status': 'ok', 'codigo_qr': registro.codigo})
        except Exception as e:
            # Si hay algún error, devuelve una respuesta JSON con el error
            return JsonResponse({'status': 'error', 'message': str(e)})
    # Si no es una petición POST, devuelve un error
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'})

# Función que devuelve los últimos códigos QR registrados en formato JSON
def ultimos_registros(request):
    # Obtiene los últimos 10 registros ordenados por fecha
    registros = QRRegistro.objects.order_by('-fecha')[:10]
    # Convierte cada registro a un diccionario con código y fecha formateada
    data = [
        {'codigo': r.codigo, 'fecha': r.fecha.strftime('%Y-%m-%d %H:%M:%S')}
        for r in registros  # Recorre cada registro y crea un diccionario
    ]
    # Devuelve los datos en formato JSON
    return JsonResponse({'registros': data})
