# Importa el sistema de administración de Django
from django.contrib import admin
# Importa el modelo RegistroQR para registrarlo en el admin
from .models import RegistroQR

# Clase que personaliza cómo se muestra RegistroQR en el panel de administración
class RegistroQRAdmin(admin.ModelAdmin):
    # Campos que se muestran en la lista de registros
    list_display = ('codigo', 'fecha_registro')
    # Campos por los que se puede filtrar
    list_filter = ('fecha_registro',)
    # Campos en los que se puede buscar
    search_fields = ('codigo',)
    # Ordenar por fecha (más reciente primero)
    ordering = ('-fecha_registro',)
    # Campos de solo lectura (no se pueden editar)
    readonly_fields = ('fecha_registro',)

# Registra el modelo RegistroQR en el panel de administración con la configuración personalizada
admin.site.register(RegistroQR, RegistroQRAdmin)
