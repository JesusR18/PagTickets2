# Importa el sistema de administración de Django
from django.contrib import admin
# Importa los modelos para registrarlos en el admin
from .models import RegistroQR

# Clase que personaliza cómo se muestra RegistroQR en el panel de administración
@admin.register(RegistroQR)
class RegistroQRAdmin(admin.ModelAdmin):
    # Campos que se muestran en la lista de registros
    list_display = ('codigo', 'usuario', 'ubicacion', 'fecha_registro', 'notas_cortas')
    # Campos por los que se puede filtrar
    list_filter = ('fecha_registro', 'usuario', 'ubicacion')
    # Campos en los que se puede buscar
    search_fields = ('codigo', 'usuario', 'ubicacion', 'notas')
    # Ordenar por fecha (más reciente primero)
    ordering = ('-fecha_registro',)
    # Campos de solo lectura (no se pueden editar)
    readonly_fields = ('fecha_registro',)
    # Cantidad de registros por página
    list_per_page = 20
    # Campos que se pueden editar directamente en la lista
    list_editable = ('usuario', 'ubicacion')
    # Mostrar total de registros
    show_full_result_count = True
    
    # Función para mostrar notas resumidas
    def notas_cortas(self, obj):
        if obj.notas:
            return obj.notas[:50] + '...' if len(obj.notas) > 50 else obj.notas
        return '-'
    notas_cortas.short_description = 'Notas'
    
    # Personalizar el formulario de edición
    fieldsets = (
        ('Información del QR', {
            'fields': ('codigo', 'fecha_registro')
        }),
        ('Detalles del Escaneo', {
            'fields': ('usuario', 'ubicacion', 'notas')
        }),
    )

# Personalizar el sitio de administración
admin.site.site_header = "SISEG - Panel de Administración"
admin.site.site_title = "SISEG Admin"
admin.site.index_title = "Gestión de Códigos QR"
