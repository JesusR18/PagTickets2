#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings')
django.setup()

from django.contrib.auth.models import User

# Crear o actualizar usuario admin
try:
    admin_user = User.objects.get(username='admin')
    admin_user.set_password('admin')
    admin_user.save()
    print("✅ Usuario admin actualizado con contraseña 'admin'")
except User.DoesNotExist:
    admin_user = User.objects.create_superuser(
        username='admin',
        email='admin@siseg.com',
        password='admin'
    )
    print("✅ Usuario admin creado con contraseña 'admin'")

print(f"🔐 Usuario: admin")
print(f"🔐 Contraseña: admin")
print(f"🌐 Panel admin: http://localhost:8000/admin/")
