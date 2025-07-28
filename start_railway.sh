#!/bin/bash
# Script de inicio para Railway
# Configura y ejecuta la aplicación Django en Railway

set -e  # Salir si hay errores

echo "🚀 SISEG - Iniciando en Railway"
echo "================================"

# Variables de entorno
export DJANGO_SETTINGS_MODULE="pagTickets.settings_railway"
export DEBUG="False"
export RAILWAY_ENVIRONMENT="production"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Verificar entorno
log "📋 Verificando entorno Railway..."
python --version
pip --version

# 2. Instalar dependencias
log "📦 Instalando dependencias..."
pip install -r requirements.txt

# 3. Ejecutar migraciones
log "🗄️  Ejecutando migraciones..."
python manage_railway.py migrate --noinput

# 4. Recopilar archivos estáticos
log "📁 Recopilando archivos estáticos..."
python manage_railway.py collectstatic --noinput

# 5. Verificar configuración
log "🔍 Verificando configuración..."
python manage_railway.py check --deploy

# 6. Iniciar servidor
log "🌐 Iniciando servidor Railway..."
exec gunicorn pagTickets.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 4 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    --log-level info
