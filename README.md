# 📱 Lector de Códigos QR - pagTickets

## 📋 Descripción
Aplicación web Django que permite escanear códigos QR usando la cámara del dispositivo y guardar los registros en una base de datos.

## 🚀 Características
- ✅ Escaneo de códigos QR en tiempo real usando la cámara
- ✅ Almacenamiento de códigos QR en base de datos SQLite
- ✅ Visualización de los últimos códigos registrados
- ✅ Actualización automática de la lista cada 5 segundos
- ✅ Panel de administración Django para gestionar registros

## 🛠️ Tecnologías utilizadas
- **Backend**: Django 5.2.1 (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Base de datos**: SQLite
- **Librería QR**: html5-qrcode
- **Servidor**: Django Development Server

## 📦 Instalación

### 1. Clonar o descargar el proyecto
```bash
# Si tienes el proyecto en una carpeta, navega hasta ella
cd pagTickets
```

### 2. Instalar dependencias
```bash
# Instalar Django y dependencias
pip install -r requirements.txt
```

### 3. Configurar la base de datos
```bash
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate
```

### 4. Crear superusuario (opcional)
```bash
# Para acceder al panel de administración
python manage.py createsuperuser
```

### 5. Ejecutar el servidor
```bash
# Iniciar el servidor de desarrollo
python manage.py runserver
```

## 🌐 Uso

1. **Abrir la aplicación**: Ve a `http://localhost:8000` en tu navegador
2. **Permitir cámara**: Acepta los permisos de cámara cuando el navegador los solicite
3. **Escanear códigos**: Apunta la cámara hacia un código QR
4. **Ver registros**: Los códigos escaneados aparecerán automáticamente en la lista

### Panel de Administración
- Ve a `http://localhost:8000/admin`
- Inicia sesión con tu superusuario
- Gestiona los registros de códigos QR

## 📁 Estructura del proyecto
```
pagTickets/
├── manage.py                    # Comando principal de Django
├── requirements.txt             # Dependencias del proyecto
├── db.sqlite3                  # Base de datos SQLite
├── pagTickets/                 # Configuración principal
│   ├── __init__.py
│   ├── settings.py             # Configuraciones del proyecto
│   ├── urls.py                 # URLs principales
│   ├── views.py                # Vistas principales
│   ├── models.py               # Modelos de datos
│   ├── admin.py                # Configuración del admin
│   ├── wsgi.py                 # Configuración WSGI
│   ├── asgi.py                 # Configuración ASGI
│   └── templates/
│       └── index.html          # Página principal
├── qrweb/                      # Aplicación secundaria
│   ├── models.py               # Modelos adicionales
│   ├── views.py                # Vistas adicionales
│   ├── admin.py                # Admin de la app
│   ├── apps.py                 # Configuración de la app
│   ├── tests.py                # Pruebas
│   └── templates/
│       └── qrweb/
│           └── qr_home.html    # Template alternativo
└── staticfiles/                # Archivos estáticos de Django
```

## 🔧 APIs disponibles

### Registrar código QR
- **URL**: `/registrar_qr/`
- **Método**: POST
- **Datos**: `{"codigo_qr": "texto_del_codigo"}`
- **Respuesta**: `{"status": "ok", "codigo_qr": "texto_del_codigo"}`

### Obtener últimos registros
- **URL**: `/ultimos_registros/`
- **Método**: GET
- **Respuesta**: `{"registros": [{"codigo": "...", "fecha": "..."}]}`

## 🔒 Seguridad
- La aplicación está configurada para desarrollo (DEBUG=True)
- Para producción, cambiar DEBUG=False y configurar ALLOWED_HOSTS
- La vista de registro está exenta de CSRF para permitir peticiones AJAX

## 🐛 Solución de problemas

### La cámara no funciona
- Verifica que tengas permisos de cámara habilitados
- Usa HTTPS en producción (los navegadores requieren conexión segura para la cámara)

### Error de migración
```bash
python manage.py makemigrations pagTickets
python manage.py makemigrations qrweb
python manage.py migrate
```

### Puerto en uso
```bash
# Usar un puerto diferente
python manage.py runserver 8080
```

## 📝 Notas
- Este proyecto es ideal para aprender Django y JavaScript
- Todos los comentarios están en español para facilitar el aprendizaje
- La aplicación funciona mejor en dispositivos con cámara (móviles, laptops)

## 👨‍💻 Desarrollo
Para continuar desarrollando:
1. Modifica las vistas en `views.py`
2. Actualiza los templates en `templates/`
3. Añade nuevos modelos en `models.py`
4. Ejecuta migraciones cuando cambies modelos
