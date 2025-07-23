#!/bin/bash

echo "🚀 Iniciando SISEG en Railway..."

# Configurar variables de entorno
export DJANGO_SETTINGS_MODULE=pagTickets.settings_railway

echo "📊 Ejecutando migraciones..."
python manage.py migrate --noinput

echo "📁 Recolectando archivos estáticos..."
python manage.py collectstatic --noinput || echo "⚠️  Collectstatic falló, continuando..."

echo "👤 Creando usuario admin..."
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pagTickets.settings_railway')
django.setup()
from django.contrib.auth.models import User
try:
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@siseg.com', 'admin')
        print('✅ Usuario admin creado')
    else:
        print('✅ Usuario admin ya existe')
except Exception as e:
    print(f'⚠️  Error creando admin: {e}')
"

echo "🌐 Iniciando servidor con Gunicorn..."
exec gunicorn --bind 0.0.0.0:$PORT --timeout 300 --workers 1 --access-logfile - --error-logfile - pagTickets.wsgi:application
