# Script PowerShell para crear un servicio de Windows
# Ejecutar como Administrador

$serviceName = "DjangoQRService"
$serviceDisplayName = "Django QR Tickets Service"
$serviceDescription = "Servicio para la aplicación Django de códigos QR"
$pythonPath = (Get-Command python).Source
$projectPath = "c:\Users\MONITOREO6\pagTickets\pagTickets-1"
$managePyPath = "$projectPath\manage.py"

# Comando para el servicio
$serviceCommand = "$pythonPath $managePyPath runserver 0.0.0.0:8000"

# Crear el servicio
New-Service -Name $serviceName -BinaryPathName $serviceCommand -DisplayName $serviceDisplayName -Description $serviceDescription -StartupType Automatic

Write-Host "Servicio '$serviceName' creado exitosamente"
Write-Host "Para iniciar: Start-Service $serviceName"
Write-Host "Para detener: Stop-Service $serviceName"
Write-Host "Para eliminar: Remove-Service $serviceName"
