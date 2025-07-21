#!/usr/bin/env python
"""Utilidad de línea de comandos de Django para tareas administrativas."""
# Importa el módulo os para trabajar con variables de entorno
import os
# Importa sys para acceder a argumentos de línea de comandos
import sys


# Función principal que ejecuta tareas administrativas
def main():
    """Ejecuta tareas administrativas."""
    # Establece la configuración por defecto de Django si no está definida
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
    try:
        # Intenta importar la función para ejecutar comandos de Django
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Si no puede importar Django, muestra un error explicativo
        raise ImportError(
            "No se pudo importar Django. ¿Estás seguro de que está instalado y "
            "disponible en tu variable de entorno PYTHONPATH? ¿Olvidaste "
            "activar un entorno virtual?"
        ) from exc
    # Ejecuta el comando de Django pasado como argumentos
    execute_from_command_line(sys.argv)


# Si este archivo se ejecuta directamente (no se importa), ejecuta main()
if __name__ == '__main__':
    main()
