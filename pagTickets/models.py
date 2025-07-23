# Importa las funciones necesarias para crear modelos de base de datos en Django
from django.db import models
import json

# Define una clase que representa un activo fijo
class ActivoFijo(models.Model):
    codigo = models.CharField(max_length=50, unique=True, verbose_name="Código QR")
    nombre = models.CharField(max_length=200, verbose_name="Nombre del Activo")
    ubicacion = models.CharField(max_length=200, verbose_name="Ubicación")
    marca = models.CharField(max_length=100, verbose_name="Marca")
    modelo = models.CharField(max_length=100, verbose_name="Modelo")
    no_serie = models.CharField(max_length=100, verbose_name="Número de Serie")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")
    
    class Meta:
        verbose_name = "Activo Fijo"
        verbose_name_plural = "Activos Fijos"
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.nombre} - {self.codigo}"

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

    class Meta:
        verbose_name = "Registro QR"
        verbose_name_plural = "Registros QR"
        ordering = ['-fecha_registro']

    # Función que define cómo se va a mostrar este objeto cuando se imprima
    def __str__(self):
        return f"{self.codigo} - {self.fecha_registro.strftime('%Y-%m-%d %H:%M')}"
