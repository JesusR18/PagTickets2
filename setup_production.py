#!/usr/bin/env python
import os
import django
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
django.setup()

from django.contrib.auth.models import User

# Crear usuario admin automáticamente en producción
try:
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser(
            username='admin',
            email='admin@siseg.com',
            password='admin'
        )
        print("✅ Usuario admin creado automáticamente")
    else:
        # Actualizar contraseña por si acaso
        admin_user = User.objects.get(username='admin')
        admin_user.set_password('admin')
        admin_user.save()
        print("✅ Usuario admin verificado")
except Exception as e:
    print(f"Error al crear admin: {e}")

# Ejecutar migraciones
execute_from_command_line(['manage.py', 'migrate'])
