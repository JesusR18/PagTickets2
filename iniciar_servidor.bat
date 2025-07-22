@echo off
echo ================================
echo    SISEG - Escaner QR
echo    Iniciando servidor Django...
echo ================================

cd /d "c:\Users\MONITOREO6\pagTickets\pagTickets-1"

echo Activando entorno virtual...
call .venv\Scripts\activate.bat

echo Aplicando migraciones...
python manage.py migrate

echo Iniciando servidor en puerto 8000...
echo.
echo ✅ Servidor corriendo en: http://localhost:8000
echo 📱 Para celular: Ejecuta 'ngrok http 8000' en otra terminal
echo.
echo Presiona Ctrl+C para detener el servidor
echo ================================

python manage.py runserver 127.0.0.1:8000

pause
