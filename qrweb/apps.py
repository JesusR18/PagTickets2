# Importa la clase base para configurar aplicaciones Django
from django.apps import AppConfig


# Clase de configuración para la aplicación qrweb
class QrwebConfig(AppConfig):
    # Define el tipo de campo automático por defecto para los IDs de la base de datos
    default_auto_field = 'django.db.models.BigAutoField'
    # Nombre de la aplicación (debe coincidir con el nombre de la carpeta)
    name = 'qrweb'
