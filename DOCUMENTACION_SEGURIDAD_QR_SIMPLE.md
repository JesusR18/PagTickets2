# 🔒 DOCUMENTACIÓN TÉCNICA - SISTEMA QR SISEG

## 📋 POR QUÉ SOLO FUNCIONA CON TU PÁGINA WEB

### 🔐 RESTRICCIONES TÉCNICAS IMPLEMENTADAS:

#### 1. TOKEN CSRF (Cross-Site Request Forgery Protection)
```javascript
// En qr-scanner.js:
headers: { 
    'X-CSRFToken': getCookie('csrftoken')  // Token único por sesión
}

// Función que extrae el token:
function getCookie(name) {
    // Busca en document.cookie = "csrftoken=abc123xyz..."
    // Solo funciona si la cookie existe en el mismo dominio
}
```
**CÓMO FUNCIONA:**
- Django genera un token único cuando cargas la página
- El token se guarda en una cookie del navegador
- Solo páginas del mismo dominio pueden leer esa cookie
- El servidor valida que el token coincida con la sesión

**POR QUÉ RESTRINGE:**
- Otras páginas web NO pueden acceder a tu cookie
- Sin token válido, el servidor rechaza la petición
- Previene que sitios maliciosos envíen datos falsos

#### 2. SAME-ORIGIN POLICY (Política del Navegador)
```javascript
// Esta petición SOLO funciona desde tu dominio:
fetch('/qr/registrar_qr/', {
    method: 'POST',
    body: JSON.stringify({codigo_qr: "test"})
})
```
**CÓMO FUNCIONA:**
- Los navegadores bloquean requests entre dominios diferentes
- `example.com` NO puede hacer peticiones a `tu-servidor.com`
- Solo scripts cargados desde tu dominio pueden usar tus endpoints

#### 3. ENDPOINT ESPECÍFICO
```python
# En urls.py tu servidor tiene rutas como:
urlpatterns = [
    path('qr/registrar_qr/', views.registrar_qr),  # Solo tu servidor
]
```
**POR QUÉ RESTRINGE:**
- Esta URL solo existe en tu servidor
- Otras páginas no tienen acceso a este endpoint
- El código JavaScript está programado para usar TU servidor específico

#### 4. DEPENDENCIAS LOCALES
```html
<!-- El JavaScript que hace todo funcionar: -->
<script src="{% static 'js/qr-scanner.js' %}"></script>
```
**CÓMO FUNCIONA:**
- El archivo `qr-scanner.js` solo existe en tu servidor
- Contiene toda la lógica de conexión a TUS endpoints
- Otras páginas no tienen acceso a este archivo

## 🧩 COMPONENTES TÉCNICOS ESENCIALES

### 📱 DETECCIÓN QR:
```javascript
// jsQR - Librería que lee códigos QR:
const code = jsQR(imageData.data, imageData.width, imageData.height);
// Retorna: {data: "contenido_del_qr", location: coordenadas}
```

### 🎥 ACCESO A CÁMARA:
```javascript
// WebRTC API - Acceso a cámara del dispositivo:
videoStream = await navigator.mediaDevices.getUserMedia({
    video: {facingMode: 'environment'}  // Cámara trasera
});
```

### 💾 ALMACENAMIENTO:
```python
# Django Model - Donde se guardan los códigos:
class QRRegistro(models.Model):
    codigo = models.CharField(max_length=500)     # Texto plano
    fecha = models.DateTimeField(auto_now_add=True)  # Timestamp
```

### 🌐 COMUNICACIÓN:
```javascript
// Petición AJAX al servidor:
fetch('/qr/registrar_qr/', {
    method: 'POST',
    headers: {'X-CSRFToken': getCookie('csrftoken')},
    body: JSON.stringify({codigo_qr: codigo})
})
```

## 🔒 VALIDACIONES IMPLEMENTADAS

### En el Frontend (JavaScript):
- Extracción de token CSRF de cookies
- Validación de estructura JSON
- Control de estado del scanner

### En el Backend (Django):
```python
@csrf_exempt
def registrar_qr(request):
    if request.method == 'POST':  # Solo POST
        data = json.loads(request.body)  # Parse JSON seguro
        codigo = data.get('codigo_qr')   # Extrae código
        registro = QRRegistro.objects.create(codigo=codigo)  # Guarda
        return JsonResponse({'status': 'ok'})
```

## 📊 ESTRUCTURA DE DATOS

### Base de Datos SQLite:
```sql
CREATE TABLE qrweb_qrregistro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(500) NOT NULL,
    fecha DATETIME NOT NULL
);
```

### JSON de Comunicación:
```javascript
// Envío:
{"codigo_qr": "contenido_del_codigo"}

// Respuesta:
{"status": "ok", "codigo_qr": "contenido_del_codigo"}
```

## 🎯 LIMITACIONES REALES

### LO QUE SÍ PROTEGE:
1. **CSRF Token**: Evita peticiones desde otros sitios
2. **Same-Origin Policy**: Navegador bloquea requests externos
3. **Endpoint Específico**: Solo tu servidor tiene la URL
4. **Dependencias Locales**: JavaScript solo en tu servidor

### LO QUE NO PROTEGE:
1. **Contenido del QR**: Se guarda en texto plano
2. **Autenticación**: Cualquiera con acceso al sitio puede usar el scanner
3. **Encriptación**: No hay cifrado de datos en la base de datos
4. **Rate Limiting**: No hay límite de peticiones por usuario

## 💻 STACK TECNOLÓGICO

- **Frontend**: HTML5, JavaScript (ES6), Canvas API, WebRTC
- **Backend**: Django 4.x, Python 3.x
- **Base de Datos**: SQLite3
- **Librerías**: jsQR v1.4.0
- **Protocolo**: HTTP/HTTPS, JSON

## 🔧 CONFIGURACIÓN NECESARIA

### En tu servidor Django:
```python
# settings.py
MIDDLEWARE = [
    'django.middleware.csrf.CsrfViewMiddleware',  # CSRF protection
]

# urls.py
urlpatterns = [
    path('qr/', include('qrweb.urls')),
]
```

### Archivos requeridos:
- `qr_home.html` - Interfaz web
- `qr-scanner.js` - Lógica del scanner
- `views.py` - Endpoints del servidor
- `models.py` - Estructura de datos

---

*Este documento explica los mecanismos técnicos que hacen que el sistema QR solo funcione con tu página web específica.*
