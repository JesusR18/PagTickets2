"""
Configuración de URLs para el proyecto pagTickets.

La lista `urlpatterns` conecta las URLs con las vistas (funciones que procesan las peticiones).
Para más información ver:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Ejemplos:
Vistas basadas en funciones
    1. Agregar un import:  from my_app import views
    2. Agregar una URL a urlpatterns:  path('', views.home, name='home')
Vistas basadas en clases
    1. Agregar un import:  from other_app.views import Home
    2. Agregar una URL a urlpatterns:  path('', Home.as_view(), name='home')
Incluir otra configuración de URLs
    1. Importar la función include(): from django.urls import include, path
    2. Agregar a urlpatterns:  path('blog/', include('blog.urls'))
"""
# Importa el panel de administración de Django
from django.contrib import admin
# Importa la función path para definir rutas URL
from django.urls import path
# Importa las vistas de la aplicación principal
from . import views

# Lista que define todas las rutas URL de la aplicación
urlpatterns = [
    # Ruta principal ('') que muestra la página de inicio con el lector QR
    path('', views.index, name='index'),
    # Ruta para registrar un código QR nuevo (recibe datos POST desde JavaScript)
    path('registrar_qr/', views.registrar_qr, name='registrar_qr'),
    # Ruta para obtener los últimos códigos registrados (devuelve JSON)
    path('ultimos_registros/', views.ultimos_registros, name='ultimos_registros'),
    # Ruta para obtener los activos escaneados (nueva funcionalidad)
    path('obtener_activos_escaneados/', views.obtener_activos_escaneados, name='obtener_activos_escaneados'),
    # Ruta para exportar códigos QR a Excel
    path('exportar_excel/', views.exportar_excel, name='exportar_excel'),
    # Ruta para exportar activos escaneados a Excel (nueva funcionalidad)
    path('exportar_activos_excel/', views.exportar_activos_excel, name='exportar_activos_excel'),
    # Rutas de autenticación
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    # Dashboard con estadísticas (requiere login)
    path('dashboard/', views.dashboard, name='dashboard'),
    # Ruta para acceder al panel de administración de Django
    path('admin/', admin.site.urls),
]
