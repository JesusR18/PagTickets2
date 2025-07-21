@echo off
rem Script para configurar y ejecutar el proyecto Django de códigos QR
rem Ejecuta este archivo desde PowerShell para configurar todo automáticamente

echo.
echo ========================================
echo   CONFIGURADOR DE PROYECTO QR TICKETS
echo ========================================
echo.

echo 📦 Instalando dependencias...
pip install -r requirements.txt

echo.
echo 🗃️  Creando migraciones...
python manage.py makemigrations

echo.
echo 🗃️  Aplicando migraciones...
python manage.py migrate

echo.
echo ✅ ¡Configuración completada!
echo.
echo 🚀 Para ejecutar el servidor usa:
echo    python manage.py runserver
echo.
echo 🌐 Luego ve a: http://localhost:8000
echo.
echo 👤 Para crear un superusuario (admin) usa:
echo    python manage.py createsuperuser
echo.
pause
