from django.urls import path
from . import views

urlpatterns = [
    path('', views.qr_home, name='qr_home'),
    path('registrar_qr/', views.registrar_qr, name='qr_registrar'),
]
