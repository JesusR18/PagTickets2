# Importa las funciones necesarias para crear modelos de base de datos en Django
from django.db import models

# Define una clase que representa una tabla en la base de datos para guardar códigos QR
class QRRegistro(models.Model):
    # Campo de texto para guardar el código QR (máximo 500 caracteres)
    codigo = models.CharField(max_length=500)
    # Campo de fecha y hora que se llena automáticamente cuando se crea el registro
    fecha = models.DateTimeField(auto_now_add=True)

    # Función que define cómo se va a mostrar este objeto cuando se imprima
    def __str__(self):
        return self.codigo  # Devuelve el código QR como representación del objeto
