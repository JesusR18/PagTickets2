@echo off
echo ====================================
echo    SISEG - Tunel NGROK Activado
echo ====================================
echo.
echo Iniciando tunel para el servidor Django...
echo Puerto local: 8000
echo.

REM Verificar si ngrok esta instalado
if not exist "ngrok.exe" (
    echo ERROR: ngrok.exe no encontrado
    echo Por favor descarga ngrok desde: https://ngrok.com/download
    pause
    exit /b 1
)

REM Iniciar el tunel
echo Presiona Ctrl+C para detener el tunel
echo.
ngrok http 8000

pause
