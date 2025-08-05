# Importa las funciones necesarias para crear modelos de base de datos en Django
from django.db import models
import json

# TODO: Implementar modelo ActivoFijo después de solucionar migraciones
# Define una clase que representa un activo fijo
# class ActivoFijo(models.Model):
#     codigo = models.CharField(max_length=50, unique=True, verbose_name="Código QR")
#     nombre = models.CharField(max_length=200, verbose_name="Nombre del Activo")
#     ubicacion = models.CharField(max_length=200, verbose_name="Ubicación")
#     marca = models.CharField(max_length=100, verbose_name="Marca")
#     modelo = models.CharField(max_length=100, verbose_name="Modelo")
#     no_serie = models.CharField(max_length=100, verbose_name="Número de Serie")
#     fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")
#     
#     class Meta:
#         verbose_name = "Activo Fijo"
#         verbose_name_plural = "Activos Fijos"
#         ordering = ['-fecha_registro']
#     
#     def __str__(self):
#         return f"{self.nombre} - {self.codigo}"

# Define una clase que representa una tabla en la base de datos para registros QR
class RegistroQR(models.Model):
    # Campo de texto para guardar el código QR (máximo 255 caracteres)
    codigo = models.CharField(max_length=255, verbose_name="Código QR")
    # Campo de fecha y hora que se llena automáticamente cuando se crea el registro
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de registro")
    # Información adicional del escaneo (opcional)
    usuario = models.CharField(max_length=100, blank=True, verbose_name="Usuario")
    ubicacion = models.CharField(max_length=200, blank=True, verbose_name="Ubicación")
    notas = models.TextField(blank=True, verbose_name="Notas")
    
    # ================================================================================================
    # 💰 CAMPOS PARA APIS DE PRECIOS Y CATÁLOGOS - NUEVO SISTEMA SISEG
    # ================================================================================================
    
    # Información del producto
    marca = models.CharField(max_length=100, blank=True, verbose_name="Marca")
    modelo = models.CharField(max_length=100, blank=True, verbose_name="Modelo")
    numero_serie = models.CharField(max_length=100, blank=True, verbose_name="Número de Serie")
    tipo_producto = models.CharField(max_length=50, blank=True, verbose_name="Tipo de Producto")
    
    # Información de precios (en USD)
    precio_actual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Precio Actual USD")
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Precio de Compra USD")
    precio_min_mercado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Precio Mín. Mercado")
    precio_max_mercado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Precio Máx. Mercado")
    
    # Depreciación
    valor_depreciado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Valor Depreciado")
    depreciacion_anual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Depreciación Anual")
    anos_vida_util = models.IntegerField(null=True, blank=True, verbose_name="Años Vida Útil")
    
    # Información técnica (JSON para flexibilidad)
    especificaciones_json = models.JSONField(default=dict, blank=True, verbose_name="Especificaciones Técnicas")
    
    # APIs y fuentes
    fuentes_precio = models.TextField(blank=True, verbose_name="Fuentes de Precio")
    ultima_actualizacion_precio = models.DateTimeField(null=True, blank=True, verbose_name="Última Actualización Precio")
    
    # Estado del activo
    estado_activo = models.CharField(
        max_length=20, 
        choices=[
            ('nuevo', 'Nuevo'),
            ('bueno', 'Bueno'),
            ('regular', 'Regular'),
            ('malo', 'Malo'),
            ('fuera_servicio', 'Fuera de Servicio')
        ],
        default='bueno',
        verbose_name="Estado del Activo"
    )
    
    # Información de la API
    api_consultada = models.BooleanField(default=False, verbose_name="API Consultada")
    api_error = models.TextField(blank=True, verbose_name="Error de API")
    
    # ================================================================================================

    class Meta:
        verbose_name = "Registro QR"
        verbose_name_plural = "Registros QR"
        ordering = ['-fecha_registro']

    # Función que define cómo se va a mostrar este objeto cuando se imprima
    def __str__(self):
        return f"{self.codigo} - {self.fecha_registro.strftime('%Y-%m-%d %H:%M')}"
