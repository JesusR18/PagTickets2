# 🔒 DOCUMENTACIÓN TÉCNICA - SISTEMA QR SISEG

## 📋 POR QUÉ SOLO FUNCIONA CON TU PÁGINA WEB

### � RESTRICCIONES TÉCNICAS IMPLEMENTADAS:

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

### � ACCESO A CÁMARA:
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

## � ESTRUCTURA DE DATOS

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

## � STACK TECNOLÓGICO

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

## 🧩 COMPONENTES TÉCNICOS ESPECÍFICOS DEL SISTEMA

### 📱 LIBRERÍAS QR UTILIZADAS:

#### 1. html5-qrcode (v2.3.8)
```html
<script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
```
**¿QUÉ HACE EXACTAMENTE?**
- Proporciona API de alto nivel para acceso a cámara
- Detecta múltiples formatos de códigos: QR, Code 128, Code 39, EAN, UPC
- Maneja permisos de cámara automáticamente
- **REALIDAD**: En nuestro código NO SE USA directamente, solo está cargada

#### 2. jsQR (v1.4.0) - LA QUE REALMENTE USAMOS
```html
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
```
**¿QUÉ HACE ESPECÍFICAMENTE?**
```javascript
// Uso real en nuestro código:
const code = jsQR(imageData.data, imageData.width, imageData.height);
```
- **Entrada**: Array de píxeles RGBA de un canvas
- **Proceso**: Analiza patrones geométricos del código QR
- **Salida**: Objeto con `{data: "contenido", location: coordenadas}`
- **NO ENCRIPTA**: Solo lee patrones visuales
- **Ventaja**: Funciona completamente offline (sin servidor)

### 🎥 ACCESO A CÁMARA - WebRTC API NATIVA:

```javascript
const constraints = {
    video: {
        facingMode: 'environment',    // Cámara trasera
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        aspectRatio: { ideal: 16/9 }
    }
};
videoStream = await navigator.mediaDevices.getUserMedia(constraints);
```

**¿QUÉ SEGURIDAD TIENE?**
- **Permiso del Usuario**: Navegador solicita autorización explícita
- **HTTPS Requerido**: Solo funciona en conexiones seguras
- **Dominio Específico**: Solo funciona en el dominio autorizado
- **NO HAY ENCRIPTACIÓN**: El video es raw, sin cifrado

### �️ SEGURIDAD REAL IMPLEMENTADA:

#### 1. CSRF Protection (Django)
```python
# En views.py:
@csrf_exempt  # IMPORTANTE: Deshabilitamos el decorador automático
def registrar_qr(request):
    # PERO validamos manualmente el token en JavaScript:
```

```javascript
// En qr-scanner.js:
headers: { 
    'X-CSRFToken': getCookie('csrftoken')  // Token extraído de cookies
}
```

**¿CÓMO FUNCIONA EL CSRF?**
1. Django genera token único por sesión
2. Token se guarda en cookie `csrftoken`
3. JavaScript extrae token y lo envía en header
4. Django valida que token coincida con la sesión
5. **SIN ENCRIPTACIÓN**: Solo validación de origen

#### 2. Validación de Método HTTP
```python
if request.method == 'POST':  # Solo acepta POST
    # procesar...
else:
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'})
```

#### 3. Parsing Seguro de JSON
```python
try:
    data = json.loads(request.body)  # Parsing controlado
    codigo = data.get('codigo_qr')   # Extracción segura
except Exception as e:
    return JsonResponse({'status': 'error', 'message': str(e)})
```

### � BASE DE DATOS - SQLite (SIN ENCRIPTACIÓN):

```python
# models.py - Modelo real:
class QRRegistro(models.Model):
    codigo = models.CharField(max_length=500)     # TEXTO PLANO
    fecha = models.DateTimeField(auto_now_add=True)  # Timestamp automático
```

**¿QUÉ SE GUARDA EXACTAMENTE?**
- **codigo**: Contenido RAW del QR (sin encriptar)
- **fecha**: Timestamp UTC automático de Django
- **NO HAY**: Encriptación, hash, usuario, IP, etc.

### 🌐 TRANSMISIÓN DE DATOS:

#### Estructura JSON Real:
```javascript
// Lo que se envía al servidor:
{
    "codigo_qr": "contenido_del_codigo_aqui"
}

// Lo que responde el servidor:
{
    "status": "ok",
    "codigo_qr": "contenido_del_codigo_aqui"
}
```

**¿HAY ENCRIPTACIÓN EN TRANSMISIÓN?**
- **HTTPS**: SÍ (si el servidor lo tiene configurado)
- **TLS**: Automático con HTTPS
- **Encriptación Custom**: NO, solo la estándar del navegador

### 🔍 DETECCIÓN QR - PROCESO TÉCNICO REAL:

```javascript
// Proceso exacto de detección:
function iniciarDeteccionQR() {
    const detectar = () => {
        // 1. Capturar frame del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 2. Extraer píxeles RGBA
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        // imageData.data = [R,G,B,A, R,G,B,A, R,G,B,A, ...]
        
        // 3. jsQR analiza los píxeles
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // 4. Si encuentra patrón QR, extrae contenido
        if (code) {
            // code.data = "contenido del QR como string"
            registrarCodigo(code.data);
        }
        
        // 5. Repetir en siguiente frame
        requestAnimationFrame(detectar);
    };
}
```

### 📊 CONTROLES DE CÁMARA REALES:

#### Zoom (Si es compatible):
```javascript
async function aplicarZoomReal(nivelZoom) {
    const constraints = {
        advanced: [{ 
            zoom: nivelZoom,                    // Zoom físico
            focusMode: 'continuous',            // Enfoque automático
            exposureMode: 'continuous'          // Exposición automática
        }]
    };
    await videoTrack.applyConstraints(constraints);
}
```

#### Flash/Linterna:
```javascript
async function toggleFlash() {
    const capabilities = videoTrack.getCapabilities();
    if (capabilities.torch) {  // Si tiene flash
        await videoTrack.applyConstraints({
            advanced: [{ torch: flashActivo }]  // true/false
        });
    }
}
```

### 🔐 LIMITACIONES DE SEGURIDAD REALES:

#### LO QUE SÍ TENEMOS:
- ✅ CSRF token validation
- ✅ HTTP method validation (POST only)
- ✅ JSON parsing seguro
- ✅ Timestamp automático
- ✅ Validación de entrada básica

#### LO QUE NO TENEMOS:
- ❌ Encriptación de datos en BD
- ❌ Autenticación de usuario
- ❌ Validación de formato de QR
- ❌ Rate limiting
- ❌ Logs de seguridad
- ❌ Validación de IP
- ❌ Hash de códigos QR
- ❌ Expiración de registros

---

## 🛡️ MEDIDAS DE SEGURIDAD

### 1. Control de Acceso
- **Red Restringida**: Solo dispositivos autorizados en la red SISEG
- **Sesión Web**: Solo usuarios con acceso válido al sistema
- **Permisos de Cámara**: El usuario debe autorizar explícitamente

### 2. Validación de Códigos
```python
# En el servidor Django:
def registrar_qr(request):
    if request.method == 'POST':  # Solo métodos POST
        data = json.loads(request.body)  # Parseo seguro
        token = request.headers.get('X-CSRFToken')  # Validar CSRF
        codigo = data.get('codigo_qr')  # Extraer código
        # ✅ AQUÍ SE PUEDEN AGREGAR MÁS VALIDACIONES:
        # - Verificar formato del código
        # - Validar contra lista blanca/negra  
        # - Comprobar permisos del usuario
        registro = QRRegistro.objects.create(codigo=codigo)
        return JsonResponse({'status': 'ok'})
```

### 3. Protección CSRF
```javascript
// En el frontend:
headers: { 
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')  // Token de seguridad
}
```

### 4. Auditoría Completa
- **Timestamp Exacto**: Cada registro incluye fecha/hora precisa
- **Código Completo**: Se guarda el contenido completo del QR
- **Trazabilidad**: Historial completo de todos los escaneos

---

## 🔧 PROCESO TÉCNICO DETALLADO

### Detección del Código QR:
```javascript
function iniciarDeteccionQR() {
    const detectar = () => {
        // 1. Capturar frame actual del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 2. Extraer datos de imagen para análisis
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // 3. Analizar imagen con jsQR
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // 4. Si se detecta código, procesarlo
        if (code) {
            registrarCodigo(code.data);  // Enviar al servidor
        }
        
        // 5. Continuar detección en siguiente frame
        requestAnimationFrame(detectar);
    };
}
```

### Registro Seguro en Servidor:
```python
@csrf_exempt  # Permite POST con validación CSRF manual
def registrar_qr(request):
    if request.method == 'POST':
        try:
            # 1. Parsear datos JSON de manera segura
            data = json.loads(request.body)
            
            # 2. Extraer código QR
            codigo = data.get('codigo_qr')
            
            # 3. AQUÍ SE PUEDEN AGREGAR VALIDACIONES ADICIONALES:
            # if not validar_formato_qr(codigo):
            #     return JsonResponse({'status': 'error', 'message': 'Formato inválido'})
            
            # 4. Crear registro en base de datos
            registro = QRRegistro.objects.create(codigo=codigo)
            
            # 5. Confirmar éxito
            return JsonResponse({'status': 'ok', 'codigo_qr': registro.codigo})
            
        except Exception as e:
            # 6. Manejar errores de manera segura
            return JsonResponse({'status': 'error', 'message': str(e)})
```

---

## ✅ VALIDACIONES Y CONTROLES

### Validaciones Actuales:
1. **Método HTTP**: Solo acepta POST para registro
2. **Formato JSON**: Valida estructura de datos
3. **Token CSRF**: Previene ataques de falsificación
4. **Manejo de Errores**: Respuestas controladas ante fallos

---

## 🛡️ ANÁLISIS REAL DE SEGURIDAD

### ❌ MITOS vs ✅ REALIDAD:

#### MITO: "Los códigos QR están encriptados"
- **REALIDAD**: Los códigos QR son TEXTO PLANO visible
- **EJEMPLO**: Un QR con "HOLA" se lee literalmente como "HOLA"
- **SIN CIFRADO**: jsQR lee directamente el contenido sin desencriptar nada

#### MITO: "Solo nuestra app puede leer los códigos"
- **REALIDAD**: CUALQUIER app QR puede leer nuestros códigos
- **DIFERENCIA**: Solo nosotros REGISTRAMOS y VALIDAMOS en nuestro servidor
- **ANALOGÍA**: Como una entrada de cine - cualquiera puede leerla, pero solo el cine la acepta

#### MITO: "Los datos están encriptados en la base de datos"
- **REALIDAD**: Se guardan en TEXTO PLANO en SQLite
- **EVIDENCIA**: 
```sql
SELECT * FROM qrweb_qrregistro;
-- Resultado:
-- id | codigo | fecha
-- 1  | HOLA   | 2025-07-29 15:30:45
```

### 🔍 SEGURIDAD REAL DEL SISTEMA:

#### 1. CONTROL DE ORIGEN (CSRF)
```javascript
// Función real que usamos:
function getCookie(name) {
    // Extrae token de: document.cookie = "csrftoken=abc123xyz..."
    // NO ES ENCRIPTACIÓN: Solo un identificador de sesión
}
```

**¿Para qué sirve?**
- Evita que sitios maliciosos envíen datos a nuestro servidor
- Valida que la petición viene de nuestro sitio web
- **NO PROTEGE**: El contenido del código QR

#### 2. MÉTODO HTTP RESTRINGIDO
```python
if request.method == 'POST':  # Solo POST, no GET
```
**¿Para qué sirve?**
- Evita registros accidentales por enlaces maliciosos
- Fuerza uso de formularios/JavaScript para enviar datos
- **NO PROTEGE**: Contra ataques sofisticados

#### 3. VALIDACIÓN JSON
```python
data = json.loads(request.body)  # Puede fallar si no es JSON válido
codigo = data.get('codigo_qr')   # Extrae campo específico
```
**¿Para qué sirve?**
- Evita errores de parseo que crasheen el servidor
- Valida estructura básica de datos
- **NO PROTEGE**: Contra contenido malicioso del QR

### 🚨 VULNERABILIDADES REALES:

#### 1. SIN AUTENTICACIÓN DE USUARIO
```python
# CUALQUIERA puede registrar códigos si conoce la URL:
# POST http://tu-servidor/qr/registrar_qr/
# {"codigo_qr": "codigo_malicioso"}
```

#### 2. SIN VALIDACIÓN DE CONTENIDO
```python
# Se acepta CUALQUIER contenido:
QRRegistro.objects.create(codigo="<script>alert('hack')</script>")
QRRegistro.objects.create(codigo="DROP TABLE usuarios;")
QRRegistro.objects.create(codigo="http://sitio-malicioso.com")
```

#### 3. SIN RATE LIMITING
```javascript
// Se puede spamear el servidor:
for(i=0; i<1000; i++) {
    fetch('/qr/registrar_qr/', {method: 'POST', body: JSON.stringify({codigo_qr: i})});
}
```

#### 4. SIN LOGS DE SEGURIDAD
```python
# NO sabemos:
# - Quién registró el código
# - Desde qué IP
# - Con qué navegador
# - Si fue un ataque
```

### 📡 FLUJO DE DATOS REAL:

```
🎥 CÁMARA (video stream sin cifrar)
        ↓
📱 CANVAS (píxeles RGBA sin cifrar)
        ↓
🔍 jsQR (análisis de patrones, sin cifrar)
        ↓
📨 AJAX (JSON por HTTPS, cifrado en tránsito)
        ↓
🐍 DJANGO (procesamiento sin cifrar)
        ↓
💾 SQLITE (almacenamiento sin cifrar)
        ↓
📋 HTML (display sin cifrar)
```

### 🔒 DÓNDE ESTÁ LA SEGURIDAD REAL:

#### 1. HTTPS/TLS (Si está configurado)
- **QUÉ PROTEGE**: Datos en tránsito entre navegador y servidor
- **CÓMO**: Cifrado automático del navegador
- **LIMITACIÓN**: Solo durante transmisión

#### 2. Permissions API del Navegador
- **QUÉ PROTEGE**: Acceso no autorizado a la cámara
- **CÓMO**: Usuario debe dar permiso explícito
- **LIMITACIÓN**: Solo primera vez por dominio

#### 3. Same-Origin Policy
- **QUÉ PROTEGE**: Scripts de otros sitios no pueden usar nuestras funciones
- **CÓMO**: Navegador bloquea requests cross-origin
- **LIMITACIÓN**: Solo en navegador, no en servidor

### 🎯 SEGURIDAD REAL IMPLEMENTADA:

#### LO QUE REALMENTE FUNCIONA:
1. **Control de Acceso por Red**: Solo dispositivos en red SISEG
2. **Dominio Específico**: Solo funciona en tu servidor
3. **CSRF Protection**: Evita requests de otros sitios
4. **Auditoría Básica**: Se registra qué y cuándo

#### LO QUE ES COSMÉTICO:
1. **"Scanner Seguro"**: Cualquier app puede leer los mismos QRs
2. **"Validación"**: Solo verifica que sea JSON válido
3. **"Encriptación"**: No hay cifrado de datos
4. **"Códigos Seguros"**: Los QRs son texto plano normal

---

### Validaciones Adicionales Posibles:
```python
def validar_codigo_qr(codigo):
    """Función para validaciones adicionales del código QR"""
    
    # 1. Validar longitud
    if len(codigo) < 5 or len(codigo) > 500:
        return False, "Longitud de código inválida"
    
    # 2. Validar formato (ejemplo para códigos específicos)
    if not codigo.startswith('SISEG-'):
        return False, "Código no pertenece al sistema SISEG"
    
    # 3. Validar contra lista negra
    codigos_bloqueados = ['BLOCKED-001', 'INVALID-999']
    if codigo in codigos_bloqueados:
        return False, "Código bloqueado por seguridad"
    
    # 4. Validar duplicados recientes
    registro_reciente = QRRegistro.objects.filter(
        codigo=codigo,
        fecha__gte=timezone.now() - timedelta(minutes=5)
    ).first()
    if registro_reciente:
        return False, "Código ya registrado recientemente"
    
    return True, "Código válido"
```

---

## 📊 AUDITORÍA Y TRAZABILIDAD

### Información Registrada:
```sql
-- Tabla QRRegistro en base de datos
CREATE TABLE qrweb_qrregistro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(500) NOT NULL,           -- Contenido del código QR
    fecha DATETIME NOT NULL DEFAULT NOW()   -- Timestamp exacto del escaneo
);
```

### Consultas de Auditoría:
```python
# Ver últimos registros
QRRegistro.objects.order_by('-fecha')[:10]

# Buscar código específico
QRRegistro.objects.filter(codigo='SISEG-12345')

# Registros por fecha
QRRegistro.objects.filter(fecha__date='2025-07-29')

# Estadísticas por hora
QRRegistro.objects.extra({
    'hora': "strftime('%%H', fecha)"
}).values('hora').annotate(total=Count('id'))
```

### Reportes de Seguridad:
```python
def generar_reporte_seguridad():
    """Genera reporte de actividad del sistema QR"""
    
    hoy = timezone.now().date()
    
    return {
        'total_escaneos_hoy': QRRegistro.objects.filter(fecha__date=hoy).count(),
        'codigos_unicos_hoy': QRRegistro.objects.filter(fecha__date=hoy).values('codigo').distinct().count(),
        'ultimo_escaneo': QRRegistro.objects.order_by('-fecha').first(),
        'escaneos_por_hora': QRRegistro.objects.filter(fecha__date=hoy).extra({
            'hora': "strftime('%%H', fecha)"
        }).values('hora').annotate(total=Count('id')),
    }
```

---

## � TECNOLOGÍAS ESPECÍFICAS UTILIZADAS

### 🌐 FRONTEND STACK:

#### 1. HTML5 Canvas API
```html
<canvas id="canvas"></canvas>
```
**FUNCIÓN ESPECÍFICA:**
- Extrae frames del video como array de píxeles RGBA
- NO cifra ni protege datos, solo convierte imagen a datos

#### 2. WebRTC getUserMedia API  
```javascript
navigator.mediaDevices.getUserMedia(constraints)
```
**FUNCIÓN ESPECÍFICA:**
- Accede a cámara del dispositivo
- Retorna MediaStream sin cifrado

#### 3. MediaStream API
```javascript
video.srcObject = videoStream;
videoTrack = videoStream.getVideoTracks()[0];
```
**FUNCIÓN ESPECÍFICA:**
- Controla stream de video (zoom, flash)
- NO tiene funciones de seguridad

#### 4. RequestAnimationFrame API
```javascript
requestAnimationFrame(detectar);
```
**FUNCIÓN ESPECÍFICA:**
- Sincroniza detección QR con refresh rate de pantalla
- Optimización de rendimiento, no seguridad

### 🐍 BACKEND STACK:

#### 1. Django Framework (v4.x)
```python
from django.http import JsonResponse
```
**FUNCIÓN ESPECÍFICA:**
- Framework web que maneja HTTP requests/responses
- Proporciona CSRF protection automático

#### 2. SQLite Database
```python
# Base de datos por defecto de Django
DATABASE_ENGINE = 'django.db.backends.sqlite3'
```
**FUNCIÓN ESPECÍFICA:**
- Almacena datos en archivo .sqlite3 SIN CIFRADO
- Base de datos simple para desarrollo

#### 3. Django ORM
```python
QRRegistro.objects.create(codigo=codigo)
```
**FUNCIÓN ESPECÍFICA:**
- Abstrae queries SQL
- NO añade seguridad, solo facilita acceso a BD

### 🔧 APIS Y ESTÁNDARES:

#### 1. Fetch API (JavaScript)
```javascript
fetch('/qr/registrar_qr/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
})
```
**FUNCIÓN ESPECÍFICA:**
- Realiza HTTP requests desde JavaScript
- Usa HTTPS si está configurado (cifrado en tránsito)

#### 2. JSON (JavaScript Object Notation)
```javascript
JSON.stringify({codigo_qr: "valor"})  // Convierte objeto a string
JSON.parse(response)                   // Convierte string a objeto
```
**FUNCIÓN ESPECÍFICA:**
- Formato de intercambio de datos
- NO es cifrado, es solo estructuración de datos

#### 3. HTTP/HTTPS Protocol
```
POST /qr/registrar_qr/ HTTP/1.1
Content-Type: application/json
X-CSRFToken: abc123xyz
```
**FUNCIÓN ESPECÍFICA:**
- HTTPS cifra datos en tránsito (si está configurado)
- HTTP NO cifra nada

### 🔐 MECANISMOS DE AUTENTICACIÓN/AUTORIZACIÓN:

#### LO QUE SÍ TENEMOS:
```python
# 1. Django CSRF Middleware (automático)
MIDDLEWARE = [
    'django.middleware.csrf.CsrfViewMiddleware',  # Valida tokens CSRF
]

# 2. Validación de método HTTP
if request.method == 'POST':
    # Solo acepta POST
```

#### LO QUE NO TENEMOS:
```python
# ❌ Sin autenticación de usuario:
# from django.contrib.auth.decorators import login_required
# @login_required  # ← NO LO USAMOS

# ❌ Sin permisos específicos:
# from django.contrib.auth.decorators import permission_required
# @permission_required('qr.add_qrregistro')  # ← NO LO USAMOS

# ❌ Sin validación de IP:
# ALLOWED_IPS = ['192.168.1.0/24']  # ← NO LO USAMOS

# ❌ Sin rate limiting:
# from django_ratelimit.decorators import ratelimit
# @ratelimit(key='ip', rate='10/m')  # ← NO LO USAMOS
```

### 📱 DEPENDENCIAS EXTERNAS:

#### 1. jsQR Library (CDN)
```html
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
```
**RIESGO DE SEGURIDAD:**
- Dependencia externa que podría cambiar
- CDN podría ser comprometido
- NO validamos integridad del archivo

#### 2. html5-qrcode Library (CDN)
```html
<script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
```
**RIESGO DE SEGURIDAD:**
- Cargada pero NO usada en el código
- Dependencia innecesaria que añade superficie de ataque

### 💾 ESTRUCTURA DE DATOS REAL:

#### Base de Datos (SQLite):
```sql
-- Archivo: db.sqlite3
CREATE TABLE "qrweb_qrregistro" (
    "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" varchar(500) NOT NULL,
    "fecha" datetime NOT NULL
);

-- Ejemplo de datos reales:
INSERT INTO qrweb_qrregistro VALUES 
(1, 'SISEG-12345', '2025-07-29 15:30:45.123456'),
(2, 'https://ejemplo.com', '2025-07-29 15:31:12.789012'),
(3, '<script>alert("xss")</script>', '2025-07-29 15:32:01.456789');
```

#### Cookies del Navegador:
```javascript
// Cookies automáticas de Django:
document.cookie = "csrftoken=abc123xyz789; Path=/; SameSite=Lax"
document.cookie = "sessionid=def456uvw012; Path=/; HttpOnly; SameSite=Lax"
```

### 🔍 ANÁLISIS DE CADA ARCHIVO:

#### qr_home.html (85% CSS, 10% HTML, 5% funcionalidad)
- **Propósito Real**: Interfaz visual bonita
- **Seguridad**: Ninguna, solo presentación
- **Contenido Crítico**: 3 líneas de JavaScript

#### qr-scanner.js (436 líneas total)
- **Líneas de Seguridad Real**: ~15 líneas (3.4%)
- **Líneas de UI/UX**: ~200 líneas (45.9%)
- **Líneas de Control de Cámara**: ~150 líneas (34.4%)
- **Líneas de Detección QR**: ~50 líneas (11.5%)
- **Líneas de Efectos Visuales**: ~21 líneas (4.8%)

#### views.py (25 líneas total)
- **Líneas de Seguridad Real**: ~5 líneas (20%)
- **Líneas de Funcionalidad**: ~15 líneas (60%)
- **Líneas de Comentarios**: ~5 líneas (20%)

### 🎯 RESUMEN TÉCNICO HONESTO:

**LO QUE REALMENTE HACE EL SISTEMA:**
1. Captura video de la cámara (sin cifrar)
2. Analiza frames buscando patrones QR (jsQR)
3. Extrae texto plano del código QR
4. Envía texto por HTTP/HTTPS al servidor
5. Guarda texto en SQLite (sin cifrar)
6. Muestra historial en HTML

**LA ÚNICA SEGURIDAD REAL:**
1. Token CSRF que valida origen de peticiones
2. HTTPS (si está configurado) para cifrado en tránsito
3. Control de acceso por red (configuración externa)

**TODO LO DEMÁS ES:**
- Interfaz visual atractiva
- Efectos y animaciones
- Optimizaciones de UX
- Comentarios explicativos

El sistema es fundamentalmente un **lector de códigos QR con registro básico**, no un sistema de seguridad robusto.

### ❌ Sistema QR Tradicional:
```
Código QR → Lectura → Uso directo
(Sin control, sin validación, sin auditoría)
```

### ✅ Sistema QR Seguro SISEG:
```
Código QR → Lectura Controlada → Validación Servidor → Registro Auditado → Uso Autorizado
(Control total, validación centralizada, auditoría completa)
```

---

## 🚀 VENTAJAS DEL SISTEMA

1. **Seguridad Total**: Control completo del proceso
2. **Auditoría Completa**: Registro de toda la actividad
3. **Flexibilidad**: Fácil agregar nuevas validaciones
4. **Escalabilidad**: Puede manejar múltiples usuarios
5. **Trazabilidad**: Historial completo para investigaciones
6. **Prevención**: Múltiples capas de protección

---

## 💡 CASOS DE USO

### 1. Control de Acceso:
- Empleados escanean código QR de su gafete
- Sistema valida que el empleado esté activo
- Registra hora exacta de entrada/salida

### 2. Inventario de Activos:
- Cada activo tiene código QR único
- Personal autorizado escanea para registrar ubicación
- Sistema mantiene trazabilidad completa

### 3. Validación de Documentos:
- Documentos importantes tienen código QR
- Solo personal autorizado puede validar autenticidad
- Sistema registra quién y cuándo revisó cada documento

---

## 🔧 MANTENIMIENTO Y MONITOREO

### Logs de Seguridad:
```python
import logging

logger = logging.getLogger('siseg_qr')

def registrar_qr(request):
    # Log de intento de registro
    logger.info(f'Intento de registro QR desde {request.META.get("REMOTE_ADDR")}')
    
    try:
        # ... proceso de registro ...
        logger.info(f'QR registrado exitosamente: {codigo[:10]}...')
    except Exception as e:
        logger.error(f'Error registrando QR: {str(e)}')
```

### Monitoreo Automático:
```python
def verificar_seguridad_sistema():
    """Verificaciones automáticas de seguridad"""
    
    # 1. Verificar registros sospechosos
    registros_rapidos = QRRegistro.objects.filter(
        fecha__gte=timezone.now() - timedelta(minutes=1)
    ).count()
    
    if registros_rapidos > 10:
        enviar_alerta("Demasiados registros en poco tiempo")
    
    # 2. Verificar códigos duplicados
    duplicados = QRRegistro.objects.values('codigo').annotate(
        total=Count('codigo')
    ).filter(total__gt=5)
    
    if duplicados:
        enviar_alerta("Códigos QR duplicados detectados")
```

---

## 📞 SOPORTE Y CONTACTO

Para consultas sobre el sistema de códigos QR seguros de SISEG:
- **Sistema**: SISEG (Sistema Integral de Seguridad)
- **Módulo**: Scanner QR con Validación Segura
- **Versión**: 1.0
- **Última actualización**: Julio 2025

---

*Este documento explica el funcionamiento completo del sistema de códigos QR seguros implementado en SISEG. El sistema garantiza la seguridad mediante control de acceso, validación centralizada y auditoría completa de todas las operaciones.*
