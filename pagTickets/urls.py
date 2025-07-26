"""
Configuración de URLs para el proyecto pagTickets.

La lista `urlpatterns` conecta las URLs con las vistas (funciones que procesan las peticiones).
Para más información ver:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
# Importa la función path para definir rutas URL
from django.urls import path, include
# Importa las vistas de la aplicación principal
from . import views

# Lista que define todas las rutas URL de la aplicación
urlpatterns = [
    # Ruta principal ('') que muestra la página de inicio con el lector QR
    path('', views.index, name='index'),
    # Ruta de healthcheck para Railway
    path('health/', views.health_check, name='health_check'),
    # Ruta para registrar un código QR nuevo (recibe datos POST desde JavaScript)
    path('registrar_qr/', views.registrar_qr, name='registrar_qr'),
    # Ruta para eliminar un activo
    path('eliminar_activo/', views.eliminar_activo, name='eliminar_activo'),
    # Ruta para obtener los últimos códigos registrados (devuelve JSON)
    path('ultimos_registros/', views.ultimos_registros, name='ultimos_registros'),
    # Ruta para obtener los activos escaneados (nueva funcionalidad)
    path('obtener_activos_escaneados/', views.obtener_activos_escaneados, name='obtener_activos_escaneados'),
    # Ruta para exportar activos escaneados a Excel
    path('exportar_activos_excel/', views.exportar_activos_excel, name='exportar_activos_excel'),
    # Ruta para eliminar todos los activos
    path('eliminar_todos_activos/', views.eliminar_todos_activos, name='eliminar_todos_activos'),
    # Ruta para la app qrweb (scanner QR simple)
    path('qr/', include('qrweb.urls')),
]
