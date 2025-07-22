@echo off
echo ================================
echo    SISEG - Escaner QR
echo    Configurando ngrok para celular
echo ================================

echo.
echo 🔗 Creando túnel público con ngrok...
echo 📱 Podrás acceder desde cualquier celular
echo.
echo ⚠️  IMPORTANTE: Primero ejecuta 'iniciar_servidor.bat'
echo.
echo ================================

ngrok http 8000

pause
