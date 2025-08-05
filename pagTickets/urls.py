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
    # Rutas de autenticación
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('logout_automatico/', views.logout_automatico, name='logout_automatico'),
    path('verificar_sesion/', views.verificar_sesion, name='verificar_sesion'),
    # Ruta principal ('') que muestra la página de inicio con el lector QR
    path('', views.index, name='index'),
    # PWA Routes - ESPECÍFICAS PARA FUNCIONALIDAD OFFLINE
    path('sw.js', views.service_worker, name='service_worker'),
    path('manifest.json', views.manifest_json, name='manifest_json'),
    path('offline/', views.pwa_offline_fallback, name='pwa_offline'),
    # Rutas de healthcheck para Railway (múltiples opciones) - PRIORITARIAS
    path('ping/', views.simple_ping, name='simple_ping'),
    path('health/', views.health_check, name='health_check'),
    path('healthz/', views.health_check, name='health_check_k8s'),
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
    
    # ================================================================================================
    # 🚀 RUTAS PARA SISTEMA DE APIs DE PRECIOS Y CATÁLOGOS
    # ================================================================================================
    # Dashboard de precios
    path('dashboard-precios/', views.dashboard_precios, name='dashboard_precios'),
    # API para obtener precio rápido de un producto
    path('api/precio/', views.obtener_precio_producto, name='api_precio_producto'),
    # API para obtener información completa de un producto
    path('api/producto/completo/', views.obtener_info_completa_producto, name='api_producto_completo'),
    # API para generar reporte de inventario
    path('api/inventario/reporte/', views.generar_reporte_inventario_api, name='api_reporte_inventario'),
    # API para obtener catálogo de marca
    path('api/catalogo/marca/<str:marca>/', views.obtener_catalogo_marca_api, name='api_catalogo_marca'),
    # API para verificar estado de APIs
    path('api/estado/', views.verificar_estado_apis_view, name='api_estado'),
    # API para actualización masiva de precios
    path('api/actualizar-precios/', views.actualizar_precios_masivo, name='api_actualizar_precios'),
    
    # Ruta para la app qrweb (scanner QR simple)
    path('qr/', include('qrweb.urls')),
]
