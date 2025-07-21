# Importa funciones necesarias de Django
from django.shortcuts import render  # Para mostrar páginas HTML
from django.http import JsonResponse, HttpResponse  # Para enviar respuestas en formato JSON y HTTP
from django.views.decorators.csrf import csrf_exempt  # Para permitir peticiones POST sin token CSRF
import json  # Para trabajar con datos JSON
from .models import RegistroQR  # Importa el modelo RegistroQR desde models.py

# Importar librerías para Excel
from openpyxl import Workbook  # Para crear archivos Excel
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side  # Para estilos de Excel
from openpyxl.utils import get_column_letter  # Para obtener letras de columnas
import datetime  # Para trabajar con fechas

# Función principal que muestra la página de inicio con los códigos QR
def index(request):
    # Obtiene los últimos 10 registros de la base de datos, ordenados por fecha (más reciente primero)
    registros = RegistroQR.objects.order_by('-fecha_registro')[:10]
    # Renderiza la página HTML y le pasa los registros como contexto
    return render(request, 'index.html', {'registros': registros})

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
            registro = RegistroQR.objects.create(codigo=codigo)
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
    registros = RegistroQR.objects.order_by('-fecha_registro')[:10]
    # Convierte cada registro a un diccionario con código y fecha formateada
    data = [
        {'codigo': r.codigo, 'fecha': r.fecha_registro.strftime('%Y-%m-%d %H:%M:%S')}
        for r in registros  # Recorre cada registro y crea un diccionario
    ]
    # Devuelve los datos en formato JSON
    return JsonResponse({'registros': data})

# Función que exporta todos los códigos QR a un archivo Excel
def exportar_excel(request):
    # Crear un nuevo libro de Excel
    workbook = Workbook()
    worksheet = workbook.active  # Obtener la hoja activa
    worksheet.title = "Registros QR"  # Título de la hoja
    
    # Definir estilos para el Excel
    # Estilo para el título principal
    titulo_font = Font(name='Arial', size=16, bold=True, color='FFFFFF')
    titulo_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
    titulo_alignment = Alignment(horizontal='center', vertical='center')
    
    # Estilo para los encabezados de columna
    header_font = Font(name='Arial', size=12, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='70AD47', end_color='70AD47', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center')
    
    # Estilo para los datos
    data_font = Font(name='Arial', size=11)
    data_alignment = Alignment(horizontal='left', vertical='center')
    
    # Bordes para las celdas
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Crear título principal
    worksheet.merge_cells('A1:D2')  # Combinar celdas para el título
    title_cell = worksheet['A1']
    title_cell.value = f"📱 REGISTRO DE CÓDIGOS QR - {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
    title_cell.font = titulo_font
    title_cell.fill = titulo_fill
    title_cell.alignment = titulo_alignment
    title_cell.border = thin_border
    
    # Crear encabezados de columna en la fila 4
    headers = ['N°', 'Código QR', 'Fecha de Registro', 'Hora']
    for col, header in enumerate(headers, 1):
        cell = worksheet.cell(row=4, column=col)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    # Obtener todos los registros de la base de datos
    registros = RegistroQR.objects.order_by('-fecha_registro')
    
    # Llenar los datos starting from row 5
    for row, registro in enumerate(registros, 5):
        # Número de registro
        cell = worksheet.cell(row=row, column=1)
        cell.value = row - 4  # Número secuencial
        cell.font = data_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border
        
        # Código QR
        cell = worksheet.cell(row=row, column=2)
        cell.value = registro.codigo
        cell.font = data_font
        cell.alignment = data_alignment
        cell.border = thin_border
        
        # Fecha (solo fecha)
        cell = worksheet.cell(row=row, column=3)
        cell.value = registro.fecha_registro.strftime('%d/%m/%Y')
        cell.font = data_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border
        
        # Hora (solo hora)
        cell = worksheet.cell(row=row, column=4)
        cell.value = registro.fecha_registro.strftime('%H:%M:%S')
        cell.font = data_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border
    
    # Ajustar ancho de columnas automáticamente
    column_widths = {
        'A': 8,   # N°
        'B': 40,  # Código QR (más ancho para códigos largos)
        'C': 15,  # Fecha
        'D': 12   # Hora
    }
    
    for column, width in column_widths.items():
        worksheet.column_dimensions[column].width = width
    
    # Agregar información adicional al final
    last_row = len(registros) + 6
    
    # Celda con total de registros
    total_cell = worksheet.cell(row=last_row, column=1)
    total_cell.value = f"Total de registros: {len(registros)}"
    worksheet.merge_cells(f'A{last_row}:B{last_row}')
    total_cell.font = Font(name='Arial', size=11, bold=True)
    total_cell.fill = PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid')
    total_cell.border = thin_border
    
    # Celda con fecha de exportación
    export_cell = worksheet.cell(row=last_row, column=3)
    export_cell.value = f"Exportado: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
    worksheet.merge_cells(f'C{last_row}:D{last_row}')
    export_cell.font = Font(name='Arial', size=10, italic=True)
    export_cell.alignment = Alignment(horizontal='right', vertical='center')
    export_cell.border = thin_border
    
    # Crear la respuesta HTTP con el archivo Excel
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    
    # Nombre del archivo con fecha actual
    filename = f'registros_qr_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    # Guardar el workbook en la respuesta
    workbook.save(response)
    
    return response
