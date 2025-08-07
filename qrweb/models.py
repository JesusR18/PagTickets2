# Importa las funciones necesarias para crear modelos de base de datos en Django
from django.db import models

# Define una clase que representa una tabla en la base de datos para guardar códigos QR y códigos de barras
class QRRegistro(models.Model):
    # Tipos de código disponibles
    TIPO_CODIGO_CHOICES = [
        ('QR', 'Código QR'),
        ('BARCODE', 'Código de Barras'),
    ]
    
    # Campo de texto para guardar el código (máximo 500 caracteres)
    codigo = models.CharField(max_length=500)
    
    # Tipo de código (QR o Código de Barras)
    tipo_codigo = models.CharField(max_length=10, choices=TIPO_CODIGO_CHOICES, default='QR')
    
    # Información adicional sobre el activo asociado (opcional)
    nombre_activo = models.CharField(max_length=200, blank=True, null=True)
    marca_activo = models.CharField(max_length=100, blank=True, null=True)
    modelo_activo = models.CharField(max_length=100, blank=True, null=True)
    
    # Campo de fecha y hora que se llena automáticamente cuando se crea el registro
    fecha = models.DateTimeField(auto_now_add=True)
    
    # Metadatos adicionales del código
    formato_barcode = models.CharField(max_length=20, blank=True, null=True, help_text="Formato del código de barras (CODE128, CODE39, EAN13, etc.)")

    class Meta:
        verbose_name = "Registro de Código"
        verbose_name_plural = "Registros de Códigos"
        ordering = ['-fecha']

    # Función que define cómo se va a mostrar este objeto cuando se imprima
    def __str__(self):
        return f"{self.get_tipo_codigo_display()}: {self.codigo}"  # Devuelve el tipo y código como representación del objeto
