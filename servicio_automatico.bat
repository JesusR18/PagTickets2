@echo off
echo ================================
echo    SISEG - Servicio Automatico
echo    Iniciando en segundo plano...
echo ================================

cd /d "c:\Users\MONITOREO6\pagTickets\pagTickets-1"

echo Verificando entorno virtual...
if not exist ".venv" (
    echo Creando entorno virtual...
    python -m venv .venv
)

echo Activando entorno virtual...
call .venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -r requirements.txt

echo Aplicando migraciones...
python manage.py migrate

echo Creando usuario admin...
python crear_admin.py

echo.
echo ✅ Servidor iniciado en: http://localhost:8000
echo 📱 Acceso red local: http://%COMPUTERNAME%:8000
echo 🌐 Con ngrok: ngrok http 8000
echo.
echo ⚠️  NO CERRAR ESTA VENTANA
echo    El servidor se ejecuta en segundo plano
echo ================================

start /min python manage.py runserver 0.0.0.0:8000

echo Servidor corriendo en segundo plano...
echo Presiona cualquier tecla para detener el servidor
pause > nul

echo Deteniendo servidor...
taskkill /f /im python.exe /t > nul 2>&1
