#!/bin/bash
echo "🆘 EMERGENCY MODE - SISEG Starting..."

export DJANGO_SETTINGS_MODULE=pagTickets.settings_minimal
export PYTHONPATH=/app

echo "🌐 Starting Gunicorn EMERGENCY..."
exec gunicorn pagTickets.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --timeout 300 --log-level debug --access-logfile - --error-logfile -
