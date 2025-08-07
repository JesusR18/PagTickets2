#!/bin/bash
echo "🚀 SISEG Production Starting..."

export DJANGO_SETTINGS_MODULE=pagTickets.settings_railway
export PYTHONPATH=/app

echo "📊 Starting Production Gunicorn..."
exec gunicorn pagTickets.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --log-level info --access-logfile - --error-logfile -
