@echo off
echo Iniciando servidor Django...
cd /d "c:\Users\MONITOREO6\pagTickets\pagTickets-1"

echo Aplicando migraciones...
python manage.py migrate

echo Iniciando servidor en puerto 8000...
python manage.py runserver 0.0.0.0:8000

pause
