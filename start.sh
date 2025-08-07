#!/bin/bash
echo "🚀 SISEG Starting..."

# Set environment
export DJANGO_SETTINGS_MODULE=pagTickets.settings_railway
export PYTHONPATH=/app

# Start server directly - no migrations for now
echo "🌐 Starting Gunicorn..."
exec gunicorn pagTickets.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --timeout 300 --log-level debug
