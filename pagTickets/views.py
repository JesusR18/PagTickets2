# Importa funciones necesarias de Django
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.contrib import messages
from django.db.models import Count
from django.utils import timezone
import json
from .models import RegistroQR

# Importar librerías para Excel
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import datetime

# Crear usuario admin automáticamente si no existe
def create_admin_if_not_exists():
    try:
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@siseg.com',
                password='admin'
            )
    except Exception:
        pass  # Ignorar errores si ya existe

# Vista de healthcheck para Railway
def health_check(request):
    """Vista simple para verificación de salud de Railway"""
    try:
        # Verificación básica de base de datos
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        return HttpResponse("OK", content_type="text/plain", status=200)
    except Exception as e:
        return HttpResponse(f"ERROR: {str(e)}", content_type="text/plain", status=500)

# Función principal que muestra la página de inicio con el escáner QR
def index(request):
    # Obtiene los últimos activos escaneados desde RegistroQR
    registros_qr = RegistroQR.objects.order_by('-fecha_registro')[:50]
    
    # Extraer información de activos desde los códigos QR
    activos_escaneados = []
    for registro in registros_qr:
        try:
            # Intentar parsear el código QR como JSON
            qr_data = json.loads(registro.codigo)
            activo_info = {
                'codigo': qr_data.get('codigo', registro.codigo),
                'nombre': qr_data.get('nombre', 'Activo sin nombre'),
                'ubicacion': qr_data.get('ubicacion', 'Sin ubicación'),
                'marca': qr_data.get('marca', 'Sin marca'),
                'modelo': qr_data.get('modelo', 'Sin modelo'),
                'no_serie': qr_data.get('no_serie', 'Sin número de serie'),
                'fecha_registro': registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
            }
        except (json.JSONDecodeError, AttributeError):
            # Si no es JSON válido, usar información básica
            activo_info = {
                'codigo': registro.codigo,
                'nombre': registro.codigo,
                'ubicacion': registro.ubicacion or 'Sin ubicación',
                'marca': 'Sin marca',
                'modelo': 'Sin modelo',
                'no_serie': 'Sin número de serie',
                'fecha_registro': registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
            }
        activos_escaneados.append(activo_info)
    
    # Renderiza la página HTML y le pasa los activos como contexto
    return render(request, 'index.html', {'activos_escaneados': activos_escaneados})

# Función que guarda un nuevo código QR en la base de datos
@csrf_exempt
def registrar_qr(request):
    if request.method == 'POST':
        try:
            # Convierte los datos JSON recibidos a un diccionario de Python
            data = json.loads(request.body)
            # Extrae el código QR de los datos recibidos
            codigo_qr = data.get('codigo')
            usuario = data.get('usuario', 'Usuario Web')
            ubicacion_scan = data.get('ubicacion', 'Escáner Web')
            
            # Intenta parsear el QR como JSON para extraer información del activo
            activo_info = extraer_informacion_qr(codigo_qr)
            
            # Verificar si el código ya existe (usando código original)
            registro_existente = RegistroQR.objects.filter(codigo=codigo_qr).first()
            
            if registro_existente:
                # Si ya existe, devolver información de que está registrado
                activo_existente = extraer_informacion_qr(registro_existente.codigo)
                return JsonResponse({
                    'success': True,
                    'already_registered': True,
                    'activo': activo_existente,
                    'mensaje': f'El activo "{activo_existente["nombre"]}" ya fue registrado anteriormente'
                })
            
            # Si no existe, crear nuevo registro
            nuevo_registro = RegistroQR.objects.create(
                codigo=codigo_qr,
                usuario=usuario,
                ubicacion=ubicacion_scan,
                notas=f"Activo registrado: {activo_info['nombre']}"
            )
            
            return JsonResponse({
                'success': True,
                'already_registered': False,
                'activo': activo_info,
                'mensaje': f'Activo "{activo_info["nombre"]}" registrado correctamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

# Función auxiliar para extraer información del QR
def extraer_informacion_qr(codigo_qr):
    """
    Extrae información del código QR soportando múltiples formatos:
    - JSON: {"codigo": "ACT001", "nombre": "Laptop", ...}
    - Texto simple separado por |: ACT001|Laptop Dell|Oficina 1|Dell|Latitude|SN123456
    - Texto simple: cualquier código
    """
    try:
        # Intento 1: Parsear como JSON
        if codigo_qr.strip().startswith('{') and codigo_qr.strip().endswith('}'):
            qr_data = json.loads(codigo_qr)
            return {
                'codigo': qr_data.get('codigo', codigo_qr),
                'nombre': qr_data.get('nombre', qr_data.get('activo', 'Activo sin nombre')),
                'ubicacion': qr_data.get('ubicacion', qr_data.get('location', 'Sin ubicación')),
                'marca': qr_data.get('marca', qr_data.get('brand', 'Sin marca')),
                'modelo': qr_data.get('modelo', qr_data.get('model', 'Sin modelo')),
                'no_serie': qr_data.get('no_serie', qr_data.get('serial', qr_data.get('serie', 'Sin número de serie')))
            }
        
        # Intento 2: Parsear como texto separado por |
        elif '|' in codigo_qr:
            partes = codigo_qr.split('|')
            return {
                'codigo': partes[0] if len(partes) > 0 else codigo_qr,
                'nombre': partes[1] if len(partes) > 1 else 'Activo sin nombre',
                'ubicacion': partes[2] if len(partes) > 2 else 'Sin ubicación',
                'marca': partes[3] if len(partes) > 3 else 'Sin marca',
                'modelo': partes[4] if len(partes) > 4 else 'Sin modelo',
                'no_serie': partes[5] if len(partes) > 5 else 'Sin número de serie'
            }
        
        # Intento 3: Buscar patrones conocidos en el texto
        else:
            # Buscar patrones como "ACT001 - Laptop Dell" o similares
            nombre_detectado = codigo_qr
            codigo_detectado = codigo_qr
            
            # Si contiene guión, probablemente sea código - nombre
            if ' - ' in codigo_qr:
                partes_guion = codigo_qr.split(' - ', 1)
                codigo_detectado = partes_guion[0].strip()
                nombre_detectado = partes_guion[1].strip()
            
            return {
                'codigo': codigo_detectado,
                'nombre': nombre_detectado,
                'ubicacion': 'Sin ubicación',
                'marca': 'Sin marca',
                'modelo': 'Sin modelo',
                'no_serie': 'Sin número de serie'
            }
            
    except Exception:
        # Si todo falla, usar el código QR tal como está
        return {
            'codigo': codigo_qr,
            'nombre': codigo_qr,
            'ubicacion': 'Sin ubicación',
            'marca': 'Sin marca',
            'modelo': 'Sin modelo',
            'no_serie': 'Sin número de serie'
        }

# Función para obtener los activos escaneados (para actualizar la tabla en tiempo real)
def obtener_activos_escaneados(request):
    try:
        # Obtiene todos los registros QR
        registros = RegistroQR.objects.order_by('-fecha_registro')
        
        # Convierte los registros a formato de activos usando la función de extracción mejorada
        activos_data = []
        for registro in registros:
            activo_info = extraer_informacion_qr(registro.codigo)
            # Agregar fecha de registro
            activo_info['fecha_registro'] = registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
            activos_data.append(activo_info)
        
        return JsonResponse({'activos': activos_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Función para exportar activos escaneados a Excel
def exportar_activos_excel(request):
    try:
        # Crear un nuevo libro de Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Activos Escaneados"
        
        # Configurar estilos
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        border = Border(left=Side(style='thin'), right=Side(style='thin'), 
                       top=Side(style='thin'), bottom=Side(style='thin'))
        
        # Encabezados
        headers = ['Código QR', 'Activo', 'Ubicación', 'Marca', 'Modelo', 'No. de Serie', 'Fecha de Registro']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = border
        
        # Obtener todos los registros y convertirlos a activos
        registros = RegistroQR.objects.order_by('-fecha_registro')
        
        # Agregar datos
        row = 2
        for registro in registros:
            # Usar la función de extracción mejorada
            activo_info = extraer_informacion_qr(registro.codigo)
            
            ws.cell(row=row, column=1, value=activo_info['codigo']).border = border
            ws.cell(row=row, column=2, value=activo_info['nombre']).border = border
            ws.cell(row=row, column=3, value=activo_info['ubicacion']).border = border
            ws.cell(row=row, column=4, value=activo_info['marca']).border = border
            ws.cell(row=row, column=5, value=activo_info['modelo']).border = border
            ws.cell(row=row, column=6, value=activo_info['no_serie']).border = border
            ws.cell(row=row, column=7, value=registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')).border = border
            row += 1
        
        # Ajustar ancho de columnas
        for col in range(1, len(headers) + 1):
            ws.column_dimensions[get_column_letter(col)].width = 20
        
        # Crear respuesta HTTP
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="activos_escaneados_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
        
        # Guardar el archivo en la respuesta
        wb.save(response)
        return response
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

# Vista de login personalizada
def login_view(request):
    # Crear admin automáticamente si no existe
    create_admin_if_not_exists()
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # Solo permitir usuario "admin" con contraseña "admin"
        if username == 'admin' and password == 'admin':
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('dashboard')
            else:
                messages.error(request, 'Credenciales incorrectas')
        else:
            messages.error(request, 'Solo se permite acceso con usuario: admin, contraseña: admin')
    
    return render(request, 'login.html')

# Vista de logout
def logout_view(request):
    logout(request)
    return redirect('index')

# Dashboard con estadísticas (requiere login)
@login_required
def dashboard(request):
    # Estadísticas básicas
    total_registros = RegistroQR.objects.count()
    hoy = timezone.now().date()
    registros_hoy = RegistroQR.objects.filter(fecha_registro__date=hoy).count()
    
    # Últimos 10 registros
    ultimos_registros = RegistroQR.objects.order_by('-fecha_registro')[:10]
    
    # Registros por usuario (top 5)
    usuarios_top = RegistroQR.objects.values('usuario').annotate(
        total=Count('id')
    ).order_by('-total')[:5]
    
    # Registros por ubicación (top 5)
    ubicaciones_top = RegistroQR.objects.values('ubicacion').annotate(
        total=Count('id')
    ).order_by('-total')[:5]
    
    # Registros de los últimos 7 días
    desde_7_dias = timezone.now() - datetime.timedelta(days=7)
    registros_7_dias = []
    for i in range(7):
        fecha = hoy - datetime.timedelta(days=i)
        count = RegistroQR.objects.filter(fecha_registro__date=fecha).count()
        registros_7_dias.append({
            'fecha': fecha.strftime('%d/%m'),
            'cantidad': count
        })
    registros_7_dias.reverse()
    
    context = {
        'total_registros': total_registros,
        'registros_hoy': registros_hoy,
        'ultimos_registros': ultimos_registros,
        'usuarios_top': usuarios_top,
        'ubicaciones_top': ubicaciones_top,
        'registros_7_dias': registros_7_dias,
    }
    
    return render(request, 'dashboard.html', context)

# Vista para obtener los últimos registros (API JSON)
def ultimos_registros(request):
    """Vista que devuelve los últimos registros QR en formato JSON"""
    try:
        registros = RegistroQR.objects.order_by('-fecha_registro')[:10]
        datos = []
        
        for registro in registros:
            try:
                # Intentar parsear como JSON
                qr_data = json.loads(registro.codigo)
                datos.append({
                    'id': registro.id,
                    'codigo': qr_data.get('codigo', registro.codigo),
                    'nombre': qr_data.get('nombre', 'Sin nombre'),
                    'ubicacion': qr_data.get('ubicacion', 'Sin ubicación'),
                    'marca': qr_data.get('marca', 'Sin marca'),
                    'modelo': qr_data.get('modelo', 'Sin modelo'),
                    'no_serie': qr_data.get('no_serie', 'Sin número de serie'),
                    'fecha_registro': registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
                })
            except (json.JSONDecodeError, AttributeError):
                # Si no es JSON, usar el código tal como está
                datos.append({
                    'id': registro.id,
                    'codigo': registro.codigo,
                    'nombre': registro.codigo,
                    'ubicacion': 'Sin ubicación',
                    'marca': 'Sin marca',
                    'modelo': 'Sin modelo',
                    'no_serie': 'Sin número de serie',
                    'fecha_registro': registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
                })
        
        return JsonResponse({'registros': datos})
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Vista para exportar registros QR a Excel
def exportar_excel(request):
    """Vista para exportar todos los registros QR a un archivo Excel"""
    try:
        # Crear un nuevo libro de trabajo
        wb = Workbook()
        ws = wb.active
        ws.title = "Registros QR"
        
        # Configurar encabezados
        headers = ['ID', 'Código', 'Fecha de Registro']
        ws.append(headers)
        
        # Estilo para encabezados
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
        
        # Obtener todos los registros
        registros = RegistroQR.objects.order_by('-fecha_registro')
        
        # Agregar datos
        for registro in registros:
            ws.append([
                registro.id,
                registro.codigo,
                registro.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
            ])
        
        # Ajustar ancho de columnas
        for column in ws.columns:
            max_length = 0
            column_letter = get_column_letter(column[0].column)
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Crear respuesta HTTP
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="registros_qr_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
        
        # Guardar el archivo en la respuesta
        wb.save(response)
        return response
        
    except Exception as e:
        return JsonResponse({'error': f'Error al exportar: {str(e)}'}, status=500)
