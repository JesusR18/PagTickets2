# Importa el sistema de administración de Django
from django.contrib import admin
# Importa el modelo QRRegistro para registrarlo en el admin
from .models import QRRegistro

# Clase que personaliza cómo se muestra QRRegistro en el panel de administración
class QRRegistroAdmin(admin.ModelAdmin):
    # Campos que se muestran en la lista de registros
    list_display = ('codigo', 'fecha')
    # Campos por los que se puede filtrar
    list_filter = ('fecha',)
    # Campos en los que se puede buscar
    search_fields = ('codigo',)
    # Ordenar por fecha (más reciente primero)
    ordering = ('-fecha',)

# Registra el modelo QRRegistro en el panel de administración con la configuración personalizada
admin.site.register(QRRegistro, QRRegistroAdmin)
