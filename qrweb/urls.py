from django.urls import path
from . import views

urlpatterns = [
    # Página principal con escáner QR/Barcode
    path('', views.qr_home, name='qr_home'),
    
    # APIs para registrar códigos
    path('registrar_qr/', views.registrar_qr, name='qr_registrar'),
    path('registrar_barcode/', views.registrar_barcode, name='barcode_registrar'),
    
    # APIs para obtener últimos registros
    path('ultimos_registros/', views.ultimos_registros, name='ultimos_registros'),
    
    # APIs para generar códigos como imágenes descargables
    path('generar_qr_imagen/', views.generar_qr_imagen, name='generar_qr_imagen'),
    path('generar_barcode_imagen/', views.generar_barcode_imagen, name='generar_barcode_imagen'),
    
    # APIs para generar códigos en base64 (para mostrar en web)
    path('generar_qr_base64/', views.generar_qr_base64, name='generar_qr_base64'),
    path('generar_barcode_base64/', views.generar_barcode_base64, name='generar_barcode_base64'),
]
