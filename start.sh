#!/bin/bash
echo "🚀 Iniciando aplicación SISEG..."

# Configurar variables de entorno
export DJANGO_SETTINGS_MODULE=pagTickets.settings_railway
export PYTHONPATH=/app

echo "📦 Ejecutando migraciones..."
python manage.py migrate --noinput

echo "📁 Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

echo "🌐 Iniciando servidor Gunicorn..."
exec gunicorn pagTickets.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --timeout 300
