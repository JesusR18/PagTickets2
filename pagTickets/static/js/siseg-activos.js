/**
 * SISEG - Sistema de Control de Activos
 * JavaScript Principal
 * Fecha: 26 de Julio, 2025
 */

console.log('🚀 Iniciando aplicación SISEG - Sistema de Activos...');

// ============================================
// DETECCIÓN DE PWA Y MODO STANDALONE
// ============================================

// Detectar si la app está ejecutándose en modo PWA standalone
const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              window.navigator.standalone || 
              document.referrer.includes('android-app://');

console.log('📱 Modo PWA detectado:', isPWA);

// Configurar permisos específicos para PWA
if (isPWA) {
    console.log('🔧 Configurando permisos para PWA standalone...');
    
    // Solicitar permisos de cámara temprano
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
            console.log('✅ Permisos de cámara concedidos para PWA');
        })
        .catch(error => {
            console.warn('⚠️ Permisos de cámara no disponibles:', error);
        });
    
    // Configurar wake lock para mantener pantalla activa
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen')
            .then(() => console.log('🔋 Wake Lock activado para PWA'))
            .catch(err => console.log('Wake Lock no disponible:', err));
    }
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Función para manejar respuestas de autenticación
 * Redirige al login si la sesión expiró
 */
function manejarRespuestaAuth(response) {
    // Si la respuesta incluye un redirect de autenticación
    if (response.redirect && response.redirect.includes('/login/')) {
        alert('🔒 Sesión expirada. Serás redirigido al login.');
        window.location.href = '/login/';
        return false;
    }
    return true;
}

/**
 * Función wrapper para fetch que maneja autenticación
 */
async function fetchSeguro(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        // Verificar si hay problemas de autenticación
        if (!manejarRespuestaAuth(data)) {
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error en petición:', error);
        throw error;
    }
}

// ============================================
// VARIABLES GLOBALES
// ============================================

// Variables para el scanner QR ULTRA PRECISO
let html5QrCode = null;
let zxingReader = null;
let scannerActivo = false;
let ultimoCodigoDetectado = null;
let activosEscaneados = [];
let videoStream = null;
let videoElement = null;
let canvasElement = null;
let canvasContext = null;
let scanInterval = null;
let contadorDetecciones = 0;

// Variables para swipe to delete
let touchStartX = 0;
let touchStartY = 0;
let currentSwipeElement = null;
let swipeThreshold = 100; // Píxeles mínimos para activar eliminación
let isSwiping = false;

// Variables para búsqueda y filtros
let activosOriginales = []; // Copia de todos los activos sin filtrar
let filtroActual = 'todos'; // 'todos', 'nombre', 'ubicacion', 'marca'

// Sistema de QR seguro SISEG
const SISEG_SECRET_KEY = 'SISEG2025_SECURITY_INTEGRAL_SYSTEM_SAFE_QR';
const SISEG_SIGNATURE = 'SISEG_ENCRYPTED_QR_';
let qrGeneratorActivo = false;
let qrActual = null;

// Variables para detección por región (cuadrado verde)
const SCAN_REGION = {
    // Tamaño del cuadrado verde (debe coincidir con el CSS)
    width: 180,   // 180px como definimos en el CSS
    height: 180,  // 180px como definimos en el CSS
    
    // Se calculará dinámicamente basado en el tamaño del video
    x: 0,         // Coordenada X del centro
    y: 0,         // Coordenada Y del centro
    
    // Coordenadas finales del rectángulo
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
};

// ============================================
// INICIALIZACIÓN
// ============================================

// Función para inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 DOM cargado, iniciando aplicación...');
    cargarActivosEscaneados();
    initializeStatusUpdates();
    
    // Configurar búsqueda con Enter
    const busquedaInput = document.getElementById('busqueda-input');
    if (busquedaInput) {
        busquedaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filtrarActivos();
                busquedaInput.blur(); // Ocultar teclado móvil
            }
        });
    }
});

// Función para inicializar actualizaciones de estado
function initializeStatusUpdates() {
    // Actualizar reloj cada segundo
    updateClock();
    setInterval(updateClock, 1000);
    
    // Mostrar consejos y características móviles por defecto
    const esMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
    
    // Siempre mostrar FAB y consejos ya que está optimizado para móvil
    document.getElementById('mobile-tips').style.display = 'block';
    document.getElementById('fab').style.display = 'block';
    
    // Si es escritorio, ajustar algunos elementos
    if (!esMobile && window.innerWidth > 768) {
        // En escritorio, hacer los botones un poco más pequeños
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.style.maxWidth = '250px';
        });
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Función para actualizar el reloj
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    });
    document.getElementById('time-display').textContent = `🕒 ${timeString} - ${dateString}`;
}

// Función para mostrar mensajes en la interfaz
function showMessage(message, type) {
    const statusDiv = document.getElementById('scanner-status');
    if (statusDiv) {
        statusDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        
        setTimeout(() => {
            if (!scannerActivo) {
                statusDiv.innerHTML = 'Solo acepta códigos QR generados por SISEG - Presiona el botón para iniciar';
            }
        }, 4000);
    }
}

// Función para actualizar el estado en pantalla
function actualizarEstado(mensaje, esExito = null) {
    const statusEl = document.getElementById('scanner-status');
    if (statusEl) {
        statusEl.textContent = mensaje;
        if (esExito === true) {
            statusEl.style.backgroundColor = '#dcfce7';
            statusEl.style.color = '#166534';
        } else if (esExito === false) {
            statusEl.style.backgroundColor = '#fee2e2';
            statusEl.style.color = '#dc2626';
        } else {
            statusEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            statusEl.style.color = '#991b1b';
        }
    }
}

// Función para obtener cookie CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ============================================
// FUNCIONES DEL SCANNER QR
// ============================================

// Función para calcular la región del cuadrado verde en coordenadas del video
function calcularRegionEscaneo() {
    if (!video || !canvas) return false;
    
    const videoWidth = canvas.width;
    const videoHeight = canvas.height;
    
    // El cuadrado verde está centrado en el video
    const centerX = videoWidth / 2;
    const centerY = videoHeight / 2;
    
    // Calcular el tamaño del cuadrado en coordenadas del video
    // El cuadrado verde es de 180px en la pantalla, pero necesitamos convertirlo
    // a coordenadas del video que pueden ser diferentes
    const scaleX = videoWidth / video.offsetWidth;
    const scaleY = videoHeight / video.offsetHeight;
    
    // Usar la escala promedio para mantener proporciones
    const scale = Math.min(scaleX, scaleY);
    
    const regionWidth = SCAN_REGION.width * scale;
    const regionHeight = SCAN_REGION.height * scale;
    
    // Calcular coordenadas del rectángulo
    SCAN_REGION.x = centerX;
    SCAN_REGION.y = centerY;
    SCAN_REGION.left = Math.max(0, centerX - regionWidth / 2);
    SCAN_REGION.top = Math.max(0, centerY - regionHeight / 2);
    SCAN_REGION.right = Math.min(videoWidth, centerX + regionWidth / 2);
    SCAN_REGION.bottom = Math.min(videoHeight, centerY + regionHeight / 2);
    
    // Actualizar dimensiones reales
    SCAN_REGION.width = SCAN_REGION.right - SCAN_REGION.left;
    SCAN_REGION.height = SCAN_REGION.bottom - SCAN_REGION.top;
    
    console.log('🎯 Región de escaneo calculada:', {
        video: { width: videoWidth, height: videoHeight },
        region: {
            x: Math.round(SCAN_REGION.left),
            y: Math.round(SCAN_REGION.top),
            width: Math.round(SCAN_REGION.width),
            height: Math.round(SCAN_REGION.height)
        }
    });
    
    return true;
}

// Función para extraer solo la región del cuadrado verde
function extraerRegionEscaneo(imageData) {
    if (!calcularRegionEscaneo()) {
        console.warn('⚠️ No se pudo calcular la región verde, creando región fija en el centro');
        
        // CREAR REGIÓN FIJA EN EL CENTRO (25% del tamaño total - MÁS GRANDE)
        const centerX = imageData.width / 2;
        const centerY = imageData.height / 2;
        const fixedSize = Math.min(imageData.width, imageData.height) * 0.25; // Ahora 25% en lugar de 20%
        
        SCAN_REGION.left = centerX - fixedSize / 2;
        SCAN_REGION.top = centerY - fixedSize / 2;
        SCAN_REGION.right = centerX + fixedSize / 2;
        SCAN_REGION.bottom = centerY + fixedSize / 2;
        SCAN_REGION.width = fixedSize;
        SCAN_REGION.height = fixedSize;
        
        console.log('✅ Región fija creada:', {
            centro: `(${Math.round(centerX)}, ${Math.round(centerY)})`,
            tamaño: `${Math.round(fixedSize)}x${Math.round(fixedSize)}`,
            porcentaje: Math.round((fixedSize * fixedSize) / (imageData.width * imageData.height) * 100) + '%'
        });
    }
    
    const sourceWidth = imageData.width;
    const sourceHeight = imageData.height;
    const sourceData = imageData.data;
    
    // Coordenadas de la región (redondeadas)
    const x = Math.max(0, Math.round(SCAN_REGION.left));
    const y = Math.max(0, Math.round(SCAN_REGION.top));
    const width = Math.min(sourceWidth - x, Math.round(SCAN_REGION.width));
    const height = Math.min(sourceHeight - y, Math.round(SCAN_REGION.height));
    
    // ⚠️ VALIDACIÓN RELAJADA: Rechazar solo regiones absurdamente grandes
    const maxAllowedArea = sourceWidth * sourceHeight * 0.8; // Máximo 80% de la imagen (más permisivo)
    const regionArea = width * height;
    
    if (regionArea > maxAllowedArea) {
        console.warn('⚠️ REGIÓN MUY GRANDE - Usando región central por defecto');
        // En lugar de fallar, usar región central
        const centerSize = Math.min(sourceWidth, sourceHeight) * 0.3;
        const centerX = sourceWidth / 2;
        const centerY = sourceHeight / 2;
        
        return context.getImageData(
            centerX - centerSize/2, 
            centerY - centerSize/2, 
            centerSize, 
            centerSize
        );
    }
    
    // ⚠️ VALIDACIÓN MÍNIMA: Solo rechazar regiones muy pequeñas
    if (width < 30 || height < 30) {
        console.warn('⚠️ REGIÓN MUY PEQUEÑA - Usando región mínima');
        // Usar región mínima de 100x100 en el centro
        const centerX = sourceWidth / 2;
        const centerY = sourceHeight / 2;
        
        return context.getImageData(
            centerX - 50, 
            centerY - 50, 
            100, 
            100
        );
    }
    
    console.log('🔍 Región válida:', {
        coordenadas: `(${x}, ${y})`,
        tamaño: `${width}x${height}`,
        porcentaje: Math.round((width * height) / (sourceWidth * sourceHeight) * 100) + '%'
    });
    
    // Crear nueva imagen solo con la región del cuadrado verde
    const regionData = new Uint8ClampedArray(width * height * 4);
    let pixelsCopied = 0;
    
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const sourceX = x + col;
            const sourceY = y + row;
            
            // Verificar límites estrictos
            if (sourceX >= 0 && sourceX < sourceWidth && sourceY >= 0 && sourceY < sourceHeight) {
                const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
                const targetIndex = (row * width + col) * 4;
                
                // Verificar que los índices sean válidos
                if (sourceIndex >= 0 && sourceIndex < sourceData.length - 3 && 
                    targetIndex >= 0 && targetIndex < regionData.length - 3) {
                    regionData[targetIndex] = sourceData[sourceIndex];         // R
                    regionData[targetIndex + 1] = sourceData[sourceIndex + 1]; // G
                    regionData[targetIndex + 2] = sourceData[sourceIndex + 2]; // B
                    regionData[targetIndex + 3] = sourceData[sourceIndex + 3]; // A
                    pixelsCopied++;
                }
            }
        }
    }
    
    console.log(`✅ Región extraída: ${pixelsCopied} píxeles copiados`);
    return new ImageData(regionData, width, height);
}

// ============================================
// ESCÁNER QR ULTRA PRECISO - MÚLTIPLES ALGORITMOS
// ============================================

// Función para alternar el escáner (iniciar/detener)
function toggleScanner() {
    console.log('🎯 Toggle scanner ULTRA PRECISO, estado actual:', scannerActivo);
    
    if (!scannerActivo) {
        iniciarScannerUltraPreciso();
    } else {
        detenerScannerUltraPreciso();
    }
}

// Función para iniciar el escáner QR ULTRA PRECISO
async function iniciarScannerUltraPreciso() {
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    const cameraContainer = document.getElementById('camera-container');
    const stopContainer = document.getElementById('stop-button-container');
    
    try {
        console.log('🚀 Iniciando escáner QR ULTRA PRECISO con múltiples algoritmos...');
        
        // Actualizar UI
        toggleBtn.disabled = true;
        toggleBtn.textContent = '⏳ INICIANDO ESCÁNER ULTRA PRECISO...';
        
        // Inicializar ZXing Reader para máxima compatibilidad
        if (typeof ZXing !== 'undefined') {
            zxingReader = new ZXing.BrowserMultiFormatReader();
            console.log('✅ ZXing Reader inicializado');
        }
        
        // Configuración de cámara de MÁXIMA CALIDAD
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 },
                frameRate: { ideal: 30, min: 15 },
                focusMode: 'continuous',
                exposureMode: 'continuous',
                whiteBalanceMode: 'continuous'
            }
        };
        
        // Obtener stream de video
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Configurar elementos
        videoElement = document.getElementById('camera-video');
        canvasElement = document.getElementById('qr-canvas');
        canvasContext = canvasElement.getContext('2d');
        
        videoElement.srcObject = videoStream;
        videoElement.setAttribute('playsinline', true);
        videoElement.setAttribute('autoplay', true);
        videoElement.setAttribute('muted', true);
        
        // Esperar a que el video esté listo
        await new Promise(resolve => {
            videoElement.onloadedmetadata = () => {
                console.log('📹 Video ULTRA HD listo:', videoElement.videoWidth + 'x' + videoElement.videoHeight);
                resolve();
            };
        });
        
        // Configurar HTML5-QRCode con máxima precisión
        try {
            html5QrCode = new Html5Qrcode("camera-video");
            
            const configUltraPreciso = {
                fps: 30,  // Máxima velocidad
                qrbox: { width: 300, height: 300 },  // Área grande de detección
                aspectRatio: 1.0,
                disableFlip: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };
            
            // Función de detección HÍBRIDA
            const onScanSuccess = (decodedText, decodedResult) => {
                procesarCodigoDetectado(decodedText, 'HTML5-QRCode');
            };
            
            await html5QrCode.start(
                { facingMode: "environment" },
                configUltraPreciso,
                onScanSuccess,
                () => {} // Sin mostrar errores
            );
            
            console.log('✅ HTML5-QRCode iniciado con configuración ultra precisa');
            
        } catch (html5Error) {
            console.warn('⚠️ HTML5-QRCode no disponible, usando métodos alternativos');
        }
        
        // INICIAR ESCANEO HÍBRIDO CONTINUO
        iniciarEscaneoHibrido();
        
        // Actualizar estado
        scannerActivo = true;
        cameraContainer.style.display = 'block';
        stopContainer.style.display = 'block';
        
        toggleBtn.textContent = '🎯 ESCÁNER ULTRA PRECISO ACTIVO';
        toggleBtn.disabled = false;
        
        actualizarEstado('🎯 Escáner Ultra Preciso activo - Detecta QR en papel, cartón y pantallas', true);
        
        console.log('✅ Escáner QR Ultra Preciso iniciado exitosamente');
        
    } catch (error) {
        console.error('❌ Error iniciando escáner ultra preciso:', error);
        
        toggleBtn.disabled = false;
        toggleBtn.textContent = '📱 INICIAR SCANNER QR';
        
        let mensajeError = 'Error iniciando la cámara ultra precisa';
        if (error.name === 'NotAllowedError') {
            mensajeError = 'Permisos de cámara denegados. Por favor, permite el acceso a la cámara.';
        } else if (error.name === 'NotFoundError') {
            mensajeError = 'No se encontró una cámara disponible.';
        }
        
        actualizarEstado(`❌ ${mensajeError}`, false);
    }
}

// Función para ESCANEO HÍBRIDO CONTINUO
function iniciarEscaneoHibrido() {
    if (scanInterval) {
        clearInterval(scanInterval);
    }
    
    console.log('🔄 Iniciando escaneo híbrido continuo...');
    
    scanInterval = setInterval(() => {
        if (!scannerActivo || !videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
            return;
        }
        
        try {
            // Configurar canvas con la resolución del video
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            // Dibujar frame actual con máxima calidad
            canvasContext.imageSmoothingEnabled = true;
            canvasContext.imageSmoothingQuality = 'high';
            canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            
            // MÉTODO 1: jsQR con múltiples técnicas
            escanearConJSQR();
            
            // MÉTODO 2: ZXing (si está disponible)
            if (zxingReader) {
                escanearConZXing();
            }
            
            // MÉTODO 3: Análisis manual de regiones
            escanearPorRegiones();
            
            contadorDetecciones++;
            
            // Mostrar estadísticas cada cierto tiempo
            mostrarEstadisticasPrecision();
            
        } catch (error) {
            console.warn('Error en escaneo híbrido:', error);
        }
        
    }, 100); // Escanear cada 100ms para máxima precisión
}

// MÉTODO 1: Escaneo con jsQR ULTRA PRECISO
function escanearConJSQR() {
    if (typeof jsQR === 'undefined') return;
    
    const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
    
    // Configuración ultra precisa para jsQR
    const opciones = {
        inversionAttempts: "attemptBoth"
    };
    
    // 1. Escaneo normal
    let code = jsQR(imageData.data, imageData.width, imageData.height, opciones);
    
    if (!code) {
        // 2. Escaneo con mejora de contraste
        const imagenMejorada = mejorarContraste(imageData);
        code = jsQR(imagenMejorada.data, imagenMejorada.width, imagenMejorada.height, opciones);
    }
    
    if (!code) {
        // 3. Escaneo con filtro de nitidez
        const imagenNitida = aplicarFiltroNitidez(imageData);
        code = jsQR(imagenNitida.data, imagenNitida.width, imagenNitida.height, opciones);
    }
    
    if (!code) {
        // 4. Escaneo en escala de grises optimizada
        const imagenGris = convertirAGrisOptimizado(imageData);
        code = jsQR(imagenGris.data, imagenGris.width, imagenGris.height, opciones);
    }
    
    if (code) {
        procesarCodigoDetectado(code.data, 'jsQR-UltraPreciso');
    }
}

// MÉTODO 2: Escaneo con ZXing
async function escanearConZXing() {
    try {
        const result = await zxingReader.decodeFromCanvas(canvasElement);
        if (result) {
            procesarCodigoDetectado(result.text, 'ZXing');
        }
    } catch (error) {
        // Normal, no siempre encuentra códigos
    }
}

// MÉTODO 3: Escaneo por regiones específicas
function escanearPorRegiones() {
    if (typeof jsQR === 'undefined') return;
    
    const regiones = [
        // Centro
        { x: canvasElement.width * 0.25, y: canvasElement.height * 0.25, w: canvasElement.width * 0.5, h: canvasElement.height * 0.5 },
        // Cuadrante superior izquierdo
        { x: 0, y: 0, w: canvasElement.width * 0.6, h: canvasElement.height * 0.6 },
        // Cuadrante superior derecho
        { x: canvasElement.width * 0.4, y: 0, w: canvasElement.width * 0.6, h: canvasElement.height * 0.6 },
        // Cuadrante inferior izquierdo
        { x: 0, y: canvasElement.height * 0.4, w: canvasElement.width * 0.6, h: canvasElement.height * 0.6 },
        // Cuadrante inferior derecho
        { x: canvasElement.width * 0.4, y: canvasElement.height * 0.4, w: canvasElement.width * 0.6, h: canvasElement.height * 0.6 }
    ];
    
    for (const region of regiones) {
        try {
            const imageData = canvasContext.getImageData(region.x, region.y, region.w, region.h);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth"
            });
            
            if (code) {
                procesarCodigoDetectado(code.data, 'jsQR-Regiones');
                break;
            }
        } catch (error) {
            // Continuar con la siguiente región
        }
    }
}

// FUNCIONES DE MEJORA DE IMAGEN PARA ULTRA PRECISIÓN

// Mejorar contraste
function mejorarContraste(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const factor = 1.5; // Factor de contraste
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // R
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // G
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // B
    }
    
    return new ImageData(data, imageData.width, imageData.height);
}

// Aplicar filtro de nitidez
function aplicarFiltroNitidez(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Kernel de nitidez
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) { // RGB
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += imageData.data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                const idx = (y * width + x) * 4 + c;
                data[idx] = Math.min(255, Math.max(0, sum));
            }
        }
    }
    
    return new ImageData(data, width, height);
}

// Convertir a escala de grises optimizada
function convertirAGrisOptimizado(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
        // Fórmula optimizada para QR
        const gris = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        const valorOptimizado = gris > 128 ? 255 : 0; // Binarización para QR
        
        data[i] = valorOptimizado;     // R
        data[i + 1] = valorOptimizado; // G
        data[i + 2] = valorOptimizado; // B
    }
    
    return new ImageData(data, imageData.width, imageData.height);
}

// Función para procesar código detectado (evita duplicados)
function procesarCodigoDetectado(codigoTexto, metodo) {
    // Evitar duplicados inmediatos
    if (ultimoCodigoDetectado === codigoTexto) {
        return;
    }
    
    ultimoCodigoDetectado = codigoTexto;
    console.log(`🎯 QR detectado con ${metodo}:`, codigoTexto);
    
    // Actualizar indicadores visuales
    actualizarIndicadorPrecision(metodo);
    
    // Procesar el código
    procesarCodigoQR(codigoTexto);
    
    // Limpiar después de 2 segundos para permitir nuevas detecciones
    setTimeout(() => {
        ultimoCodigoDetectado = null;
        limpiarIndicadoresPrecision();
    }, 2000);
}

// Función para actualizar indicadores de precisión
function actualizarIndicadorPrecision(metodo) {
    // Limpiar indicadores previos
    limpiarIndicadoresPrecision();
    
    // Activar indicador correspondiente
    let indicadorId = '';
    
    if (metodo.includes('HTML5')) {
        indicadorId = 'indicator-html5';
    } else if (metodo.includes('jsQR')) {
        indicadorId = 'indicator-jsqr';
    } else if (metodo.includes('ZXing')) {
        indicadorId = 'indicator-zxing';
    }
    
    if (indicadorId) {
        const indicador = document.getElementById(indicadorId);
        if (indicador) {
            indicador.classList.add('active');
            indicador.textContent = `✅ ${metodo.split('-')[0]}`;
        }
    }
    
    console.log(`📊 Indicador activado: ${metodo}`);
}

// Función para limpiar indicadores de precisión
function limpiarIndicadoresPrecision() {
    const indicadores = ['indicator-html5', 'indicator-jsqr', 'indicator-zxing'];
    
    indicadores.forEach(id => {
        const indicador = document.getElementById(id);
        if (indicador) {
            indicador.classList.remove('active');
            indicador.textContent = id.replace('indicator-', '').toUpperCase();
        }
    });
}

// Función para mostrar estadísticas de precisión
function mostrarEstadisticasPrecision() {
    if (contadorDetecciones > 0 && contadorDetecciones % 50 === 0) {
        console.log(`📊 Estadísticas Ultra Precisión: ${contadorDetecciones} intentos de detección`);
        
        // Mostrar notificación temporal
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 9999;
            backdrop-filter: blur(10px);
        `;
        notificacion.textContent = `🎯 Ultra Precisión: ${contadorDetecciones} análisis realizados`;
        
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.remove();
            }
        }, 2000);
    }
}

// Función para detener el escáner
async function detenerScannerUltraPreciso() {
    try {
        console.log('⏹️ Deteniendo escáner ultra preciso...');
        
        // Detener interval de escaneo
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        
        // Detener HTML5-QRCode
        if (html5QrCode && scannerActivo) {
            await html5QrCode.stop();
            html5QrCode = null;
        }
        
        // Detener ZXing
        if (zxingReader) {
            zxingReader.reset();
            zxingReader = null;
        }
        
        // Detener stream de video
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        
        // Actualizar estado
        scannerActivo = false;
        ultimoCodigoDetectado = null;
        contadorDetecciones = 0;
        
        // Ocultar elementos
        document.getElementById('camera-container').style.display = 'none';
        document.getElementById('stop-button-container').style.display = 'none';
        
        // Actualizar botón
        const toggleBtn = document.getElementById('scanner-toggle-btn');
        toggleBtn.textContent = '📱 INICIAR SCANNER QR';
        toggleBtn.disabled = false;
        
        actualizarEstado('⏹️ Escáner Ultra Preciso detenido', null);
        
        console.log('✅ Escáner ultra preciso detenido exitosamente');
        
    } catch (error) {
        console.error('Error deteniendo escáner ultra preciso:', error);
    }
}

// Función para detener escáner (alias para compatibilidad)
function detenerScanner() {
    detenerScannerUltraPreciso();
}

// Función para iniciar la cámara OPTIMIZADA (calidad + rendimiento)
async function iniciarScanner() {
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    const cameraContainer = document.getElementById('camera-container');
    
    try {
        toggleBtn.disabled = true;
        toggleBtn.textContent = '⏳ INICIANDO...';
        actualizarEstado('🚀 Configurando cámara optimizada...', null);
        
        // Configuración específica para PWA/Standalone
        const isPWAStandalone = isPWA || window.matchMedia('(display-mode: standalone)').matches;
        
        // Configuración PREMIUM: Máxima calidad optimizada para PWA
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: isPWAStandalone ? 1280 : 1920, min: 640 }, // Optimizado para PWA
                height: { ideal: isPWAStandalone ? 720 : 1080, min: 480 },
                frameRate: { ideal: isPWAStandalone ? 20 : 30, min: 15 }, // FPS optimizados
                // Configuraciones avanzadas para calidad premium
                advanced: [
                    { focusMode: 'continuous' }, // Enfoque continuo
                    { exposureMode: 'continuous' }, // Exposición automática
                    { whiteBalanceMode: 'continuous' } // Balance automático
                ]
            }
        };
        
        console.log('📱 Configuración de cámara para:', isPWAStandalone ? 'PWA Standalone' : 'Navegador');
        
        // Obtener stream de video con reintentos para PWA
        try {
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.warn('⚠️ Error con configuración premium, intentando básica...', error);
            // Configuración básica como fallback para PWA
            const basicConstraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            videoStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        }
        videoTrack = videoStream.getVideoTracks()[0];
        
        // Configurar elementos de video
        video = document.getElementById('camera-video');
        canvas = document.getElementById('qr-canvas');
        context = canvas.getContext('2d');
        
        video.srcObject = videoStream;
        
        // Configuración del video
        video.setAttribute('playsinline', true);
        video.setAttribute('autoplay', true);
        video.setAttribute('muted', true);
        
        // Esperar a que el video esté listo
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                console.log('📹 Video optimizado listo:', video.videoWidth + 'x' + video.videoHeight);
                resolve();
            };
        });
        
        // Configurar zoom NORMAL (sin zoom inicial)
        if (videoTrack.getCapabilities) {
            const capabilities = videoTrack.getCapabilities();
            console.log('🎥 Capacidades de la cámara:', capabilities);
            
            // Configurar zoom SIN ZOOM INICIAL
            if (capabilities.zoom) {
                zoomMin = capabilities.zoom.min || 1;
                zoomMax = capabilities.zoom.max || 5; // Limitar zoom máximo
                zoomActual = 1; // ⭐ INICIAR SIN ZOOM (1x)
                
                const zoomRange = document.getElementById('zoom-range');
                if (zoomRange) {
                    zoomRange.min = zoomMin;
                    zoomRange.max = zoomMax;
                    zoomRange.value = zoomActual;
                    zoomRange.step = 0.1;
                }
                
                // NO aplicar zoom inicial, mantener 1x
                document.getElementById('zoom-display-real').textContent = `${zoomActual.toFixed(1)}x`;
                actualizarEstado(`✅ Cámara lista - Zoom: ${zoomMin}x a ${zoomMax}x`, true);
            }
            
            // Solo configurar capacidades avanzadas si están disponibles
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                try {
                    await videoTrack.applyConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                    });
                    console.log('🎯 Enfoque continuo PREMIUM activado');
                } catch (focusError) {
                    console.log('⚠️ Enfoque automático no disponible, usando predeterminado');
                }
            }
            
            // Configurar exposición automática si está disponible
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
                try {
                    await videoTrack.applyConstraints({
                        advanced: [{ exposureMode: 'continuous' }]
                    });
                    console.log('📸 Exposición automática PREMIUM activada');
                } catch (exposureError) {
                    console.log('⚠️ Exposición automática no disponible');
                }
            }
            
            // Configurar balance de blancos automático
            if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
                try {
                    await videoTrack.applyConstraints({
                        advanced: [{ whiteBalanceMode: 'continuous' }]
                    });
                    console.log('🌡️ Balance de blancos automático PREMIUM activado');
                } catch (whiteBalanceError) {
                    console.log('⚠️ Balance de blancos automático no disponible');
                }
            }
        }
        
        // Mostrar interfaz de cámara
        cameraContainer.style.display = 'block';
        document.getElementById('stop-button-container').style.display = 'block';
        
        // Mostrar controles externos
        const externalControls = document.getElementById('external-controls');
        if (externalControls) {
            externalControls.classList.add('active');
        }
        
        toggleBtn.textContent = '⏸️ SCANNER PREMIUM ACTIVO';
        toggleBtn.disabled = true;
        scannerActivo = true;
        
        // Iniciar detección híbrida
        iniciarDeteccionQR();
        
        // Mostrar indicador
        mostrarIndicadorDeteccion();
        
        console.log('✅ Cámara PREMIUM configurada - Máxima calidad y precisión');
        
    } catch (error) {
        console.error('❌ Error iniciando cámara:', error);
        
        // Fallback automático a configuración básica
        console.log('🔄 Intentando configuración básica de respaldo...');
        try {
            const basicConstraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 25, min: 15 }
                }
            };
            
            videoStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
            videoTrack = videoStream.getVideoTracks()[0];
            video.srcObject = videoStream;
            
            // Esperar a que el video básico esté listo
            await new Promise(resolve => {
                video.onloadedmetadata = resolve;
            });
            
            // Configurar zoom básico
            if (videoTrack.getCapabilities && videoTrack.getCapabilities().zoom) {
                const basicCaps = videoTrack.getCapabilities();
                zoomMin = basicCaps.zoom.min || 1;
                zoomMax = basicCaps.zoom.max || 3;
                zoomActual = 1;
                
                const zoomRange = document.getElementById('zoom-range');
                if (zoomRange) {
                    zoomRange.min = zoomMin;
                    zoomRange.max = zoomMax;
                    zoomRange.value = zoomActual;
                }
                
                document.getElementById('zoom-display-real').textContent = `${zoomActual.toFixed(1)}x`;
            }
            
            // Mostrar interfaz
            cameraContainer.style.display = 'block';
            document.getElementById('stop-button-container').style.display = 'block';
            
            // Mostrar controles externos
            const externalControls = document.getElementById('external-controls');
            if (externalControls) {
                externalControls.classList.add('active');
            }
            
            toggleBtn.textContent = '⏸️ SCANNER BÁSICO ACTIVO';
            toggleBtn.disabled = true;
            scannerActivo = true;
            
            iniciarDeteccionQR();
            mostrarIndicadorDeteccion();
            
            actualizarEstado('✅ Cámara básica iniciada - Detección híbrida activa', true);
            
        } catch (basicError) {
            console.error('❌ Error con configuración básica:', basicError);
            actualizarEstado(`❌ Error: No se puede acceder a la cámara`, false);
            toggleBtn.disabled = false;
            toggleBtn.textContent = '📱 INICIAR SCANNER QR';
        }
    }
}

// Función para mostrar indicador visual de detección activa
function mostrarIndicadorDeteccion() {
    const cameraContainer = document.getElementById('camera-container');
    
    // Crear overlay de detección si no existe
    let overlay = document.getElementById('detection-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'detection-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 200px;
            height: 200px;
            border: 3px solid #25D366;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(37, 211, 102, 0.6);
            pointer-events: none;
            z-index: 10;
            animation: pulseGreen 2s infinite;
        `;
        
        // Crear mensaje informativo
        const mensaje = document.createElement('div');
        mensaje.id = 'region-message';
        mensaje.style.cssText = `
            position: absolute;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(37, 211, 102, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
            box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
            z-index: 15;
        `;
        mensaje.textContent = '🎯 Coloca el QR dentro del área verde';
        overlay.appendChild(mensaje);
        
        // Agregar animación CSS si no existe
        if (!document.getElementById('scanner-styles')) {
            const style = document.createElement('style');
            style.id = 'scanner-styles';
            style.textContent = `
                @keyframes pulse-scanner {
                    0% { 
                        border-color: #25D366; 
                        box-shadow: 0 0 20px rgba(37, 211, 102, 0.6);
                    }
                    50% { 
                        border-color: #22c55e; 
                        box-shadow: 0 0 30px rgba(37, 211, 102, 0.9);
                    }
                    100% { 
                        border-color: #25D366; 
                        box-shadow: 0 0 20px rgba(37, 211, 102, 0.6);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        cameraContainer.appendChild(overlay);
    }
    
    overlay.style.display = 'block';
}

// Función para actualizar indicador visual SIMPLE (sin trabar)
function actualizarIndicadorDeteccion(codigoDetectado, intentos) {
    const overlay = document.getElementById('detection-overlay');
    if (!overlay) return;
    
    // Actualización simple sin animaciones complejas
    if (codigoDetectado) {
        overlay.style.borderColor = '#10b981';
        overlay.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.6)';
    } else {
        // Cambio de color simple según intentos
        if (intentos < 50) {
            overlay.style.borderColor = '#3b82f6';
            overlay.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.4)';
        } else {
            overlay.style.borderColor = '#f59e0b';
            overlay.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
        }
    }
}

// Función para aplicar zoom real a la cámara
async function aplicarZoomReal(nivelZoom) {
    if (!videoTrack) return false;
    
    try {
        await videoTrack.applyConstraints({
            advanced: [{ zoom: nivelZoom }]
        });
        
        zoomActual = nivelZoom;
        document.getElementById('zoom-display-real').textContent = `${nivelZoom.toFixed(1)}x`;
        document.getElementById('zoom-range').value = nivelZoom;
        
        // Vibración para feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        console.log(`✅ Zoom aplicado: ${nivelZoom}x`);
        return true;
        
    } catch (error) {
        console.error('❌ Error aplicando zoom:', error);
        return false;
    }
}

// Funciones de control de zoom mejoradas
async function aplicarZoomRapido(incremento) {
    let nuevoZoom;
    
    if (incremento > 0) {
        nuevoZoom = Math.min(zoomActual + incremento, zoomMax);
    } else {
        nuevoZoom = Math.max(zoomActual + incremento, zoomMin);
    }
    
    await aplicarZoomReal(nuevoZoom);
}

// Zoom fluido con debounce (como iPhone)
function cambiarZoomFluido(valor) {
    const nuevoZoom = parseFloat(valor);
    
    // Cancelar timeout anterior si existe
    if (zoomTimeout) {
        clearTimeout(zoomTimeout);
    }
    
    // Actualizar display inmediatamente para feedback visual
    document.getElementById('zoom-display-real').textContent = `${nuevoZoom.toFixed(1)}x`;
    
    // Aplicar zoom con debounce para suavidad
    zoomTimeout = setTimeout(async () => {
        await aplicarZoomReal(nuevoZoom);
    }, 50); // 50ms de delay para suavidad
}

// Función legacy para compatibilidad
async function cambiarZoom(valor) {
    await cambiarZoomFluido(valor);
}

// Función legacy para compatibilidad  
async function aplicarZoom(direccion) {
    const incremento = direccion > 0 ? 0.5 : -0.5;
    await aplicarZoomRapido(incremento);
}

// Función para detener el scanner con limpieza completa
function detenerScanner() {
    console.log('⏹️ Deteniendo scanner de alta precisión...');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        videoTrack = null;
    }
    
    // Limpiar overlay de detección
    const overlay = document.getElementById('detection-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('stop-button-container').style.display = 'none';
    
    // Ocultar controles externos
    const externalControls = document.getElementById('external-controls');
    if (externalControls) {
        externalControls.classList.remove('active');
    }
    
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    toggleBtn.textContent = '📱 INICIAR SCANNER QR';
    toggleBtn.disabled = false;
    
    scannerActivo = false;
    actualizarEstado('🔒 Scanner detenido - Solo acepta QR SISEG', null);
}

// Función para optimización automática de imagen según condiciones
function optimizarImagenAutomaticamente(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Calcular brillo promedio de la imagen
    let totalBrillo = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brillo = (r + g + b) / 3;
        totalBrillo += brillo;
        pixelCount++;
    }
    
    const brilloPromedio = totalBrillo / pixelCount;
    console.log('💡 Brillo promedio detectado:', brilloPromedio.toFixed(1));
    
    // Crear nueva imagen optimizada
    const newData = new Uint8ClampedArray(data);
    
    // Aplicar diferentes optimizaciones según el brillo
    if (brilloPromedio < 80) {
        // Imagen muy oscura - aumentar brillo y contraste
        console.log('🌙 Aplicando filtro para poca luz...');
        for (let i = 0; i < newData.length; i += 4) {
            // Aumentar brillo
            newData[i] = Math.min(255, newData[i] * 1.5 + 30);     // R
            newData[i + 1] = Math.min(255, newData[i + 1] * 1.5 + 30); // G
            newData[i + 2] = Math.min(255, newData[i + 2] * 1.5 + 30); // B
        }
    } else if (brilloPromedio > 180) {
        // Imagen muy clara - reducir brillo y aumentar contraste
        console.log('☀️ Aplicando filtro para mucha luz...');
        for (let i = 0; i < newData.length; i += 4) {
            // Reducir brillo pero mantener contraste
            newData[i] = Math.max(0, newData[i] * 0.8 - 20);     // R
            newData[i + 1] = Math.max(0, newData[i + 1] * 0.8 - 20); // G
            newData[i + 2] = Math.max(0, newData[i + 2] * 0.8 - 20); // B
        }
    } else {
        // Iluminación normal - solo mejorar contraste
        console.log('🌤️ Aplicando mejora de contraste normal...');
        for (let i = 0; i < newData.length; i += 4) {
            // Mejorar contraste suavemente
            const factor = 1.2;
            newData[i] = Math.max(0, Math.min(255, (newData[i] - 128) * factor + 128));
            newData[i + 1] = Math.max(0, Math.min(255, (newData[i + 1] - 128) * factor + 128));
            newData[i + 2] = Math.max(0, Math.min(255, (newData[i + 2] - 128) * factor + 128));
        }
    }
    
    return new ImageData(newData, width, height);
}

// Función para aplicar filtro Gaussiano (suavizar ruido)
function aplicarFiltroGaussiano(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(data);
    
    // Kernel Gaussiano 3x3 simplificado
    const kernel = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
    ];
    const kernelSum = 16;
    
    // Aplicar filtro solo en el área central (más eficiente)
    const margin = 1;
    for (let y = margin; y < height - margin; y++) {
        for (let x = margin; x < width - margin; x++) {
            let r = 0, g = 0, b = 0;
            
            // Aplicar kernel
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                    const weight = kernel[ky + 1][kx + 1];
                    
                    r += data[pixelIndex] * weight;
                    g += data[pixelIndex + 1] * weight;
                    b += data[pixelIndex + 2] * weight;
                }
            }
            
            const currentIndex = (y * width + x) * 4;
            newData[currentIndex] = Math.round(r / kernelSum);
            newData[currentIndex + 1] = Math.round(g / kernelSum);
            newData[currentIndex + 2] = Math.round(b / kernelSum);
        }
    }
    
    return new ImageData(newData, width, height);
}

// Función para detectar códigos QR HÍBRIDA (máxima precisión + rendimiento)
function iniciarDeteccionQR() {
    if (!scannerActivo || !video || !canvas || !context) return;
    
    let intentosConsecutivos = 0;
    let ultimoCodigoDetectado = null;
    let frameSkipCounter = 0;
    let modoUltraPrecision = false;
    
    const detectar = () => {
        if (!scannerActivo) return;
        
        try {
            // SISTEMA ADAPTATIVO: Procesar más frames si no detecta
            frameSkipCounter++;
            const skipFrames = modoUltraPrecision ? 1 : 2; // Ultra precisión procesa cada frame
            
            if (frameSkipCounter % skipFrames !== 0) {
                requestAnimationFrame(detectar);
                return;
            }
            
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Configurar canvas con resolución optimizada
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Configuración premium para mejor calidad
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // ⭐ DETECCIÓN POR REGIÓN: Solo escanear dentro del cuadrado verde
                let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                // Extraer solo la región del cuadrado verde
                const regionData = extraerRegionEscaneo(imageData);
                
                // ⚠️ VALIDACIÓN SIMPLE: Si no hay región, intentar extraer manualmente
                if (!regionData) {
                    console.warn('⚠️ Creando región manual en el centro');
                    // Crear región manual en el centro (25% del tamaño)
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    const size = Math.min(canvas.width, canvas.height) * 0.25;
                    
                    const manualRegion = context.getImageData(
                        centerX - size/2, 
                        centerY - size/2, 
                        size, 
                        size
                    );
                    
                    console.log('✅ Usando región manual:', size + 'x' + size);
                    
                    // Escanear región manual
                    code = jsQR(manualRegion.data, manualRegion.width, manualRegion.height, {
                        inversionAttempts: "attemptBoth"
                    });
                    
                    if (code) {
                        console.log('🎯 QR detectado en región manual central');
                    }
                } else {
                    console.log('✅ SOLO región verde - Área:', Math.round((regionData.width * regionData.height) / (canvas.width * canvas.height) * 100) + '%');
                }
                
                // Mostrar información de la región para debug cada 30 frames
                if (frameSkipCounter % 30 === 0) {
                    console.log('🎯 ESCANEO - Región:', {
                        tamaño: `${Math.round(SCAN_REGION.width)}x${Math.round(SCAN_REGION.height)}`,
                        total: `${canvas.width}x${canvas.height}`,
                        área: Math.round((SCAN_REGION.width * SCAN_REGION.height) / (canvas.width * canvas.height) * 100) + '%'
                    });
                }
                
                let code = null;
                
                // =========== ESCANEO PRINCIPAL: SIEMPRE en la región disponible ===========
                if (regionData) {
                    // Método estándar en la región
                    code = jsQR(regionData.data, regionData.width, regionData.height, {
                        inversionAttempts: "dontInvert"
                    });
                    
                    // Con inversión si no detecta
                    if (!code) {
                        code = jsQR(regionData.data, regionData.width, regionData.height, {
                            inversionAttempts: "attemptBoth"
                        });
                    }
                    
                    if (code) {
                        console.log('🎯 QR detectado en región verde/central');
                    }
                }
                
                // =========== FASE 2: PRECISIÓN MEDIA (después de 15 intentos) ===========
                if (!code && intentosConsecutivos > 15 && regionData) {
                    // Activar modo ultra precisión
                    if (!modoUltraPrecision) {
                        modoUltraPrecision = true;
                        console.log('🎯 Activando modo ULTRA PRECISIÓN (región optimizada)');
                    }
                    
                    // Mejora de imagen optimizada en la región
                    const imagenMejorada = mejorarImagenHibrida(regionData);
                    code = jsQR(imagenMejorada.data, imagenMejorada.width, imagenMejorada.height, {
                        inversionAttempts: "attemptBoth"
                    });
                    if (code) console.log('✅ QR detectado con mejora híbrida en región');
                }
                
                // =========== FASE 3: ULTRA PRECISIÓN (después de 35 intentos) ===========
                if (!code && intentosConsecutivos > 35) {
                    console.log('🔍 Fase 3: Escalado de región verde');
                    
                    // Técnica de escalado SOLO en la región verde
                    const escalas = [1.2, 0.8, 1.5, 0.6];
                    
                    for (const escala of escalas) {
                        if (code) break;
                        
                        // Crear canvas temporal escalado
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        
                        const newWidth = Math.round(regionData.width * escala);
                        const newHeight = Math.round(regionData.height * escala);
                        
                        tempCanvas.width = newWidth;
                        tempCanvas.height = newHeight;
                        
                        // Crear imagen temporal de la región
                        const tempRegionCanvas = document.createElement('canvas');
                        const tempRegionCtx = tempRegionCanvas.getContext('2d');
                        tempRegionCanvas.width = regionData.width;
                        tempRegionCanvas.height = regionData.height;
                        tempRegionCtx.putImageData(regionData, 0, 0);
                        
                        // Escalar la región
                        tempCtx.imageSmoothingEnabled = true;
                        tempCtx.imageSmoothingQuality = 'high';
                        tempCtx.drawImage(tempRegionCanvas, 0, 0, newWidth, newHeight);
                        
                        const scaledImageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
                        const scaledMejorada = mejorarImagenHibrida(scaledImageData);
                        
                        code = jsQR(scaledMejorada.data, scaledMejorada.width, scaledMejorada.height, {
                            inversionAttempts: "attemptBoth"
                        });
                        
                        if (code) {
                            console.log(`✅ QR detectado en región verde escalada ${escala}x`);
                            break;
                        }
                    }
                }
                
                // =========== FASE 4: DETECCIÓN EXTREMA (después de 60 intentos) ===========
                if (!code && intentosConsecutivos > 60) {
                    console.log('⚡ Fase 4: Técnicas extremas en región verde');
                    
                    // Aplicar múltiples filtros a la región verde
                    const filtros = [
                        (data) => mejorarParaPantallas(data),
                        (data) => aplicarFiltroGaussiano(data),
                        (data) => optimizarImagenAutomaticamente(data)
                    ];
                    
                    for (const filtro of filtros) {
                        if (code) break;
                        
                        try {
                            const filtrada = filtro(regionData);
                            code = jsQR(filtrada.data, filtrada.width, filtrada.height, {
                                inversionAttempts: "attemptBoth"
                            });
                            
                            if (code) {
                                console.log('✅ QR detectado con filtro extremo en región verde');
                                break;
                            }
                        } catch (error) {
                            console.warn('⚠️ Error en filtro extremo:', error);
                        }
                    }
                }
                
                // =========== FASE 5: TÉCNICAS AVANZADAS (después de 90 intentos) ===========
                if (!code && intentosConsecutivos > 90) {
                    console.log('🔬 Fase 5: Técnicas avanzadas en región verde');
                    
                    // Rotaciones ligeras para QR inclinados SOLO en región verde
                    const rotaciones = [2, -2, 4, -4, 6, -6];
                    
                    for (const angulo of rotaciones) {
                        if (code) break;
                        
                        // Crear imagen temporal de la región
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCanvas.width = regionData.width;
                        tempCanvas.height = regionData.height;
                        tempCtx.putImageData(regionData, 0, 0);
                        
                        // Rotar la región
                        const rotatedCanvas = document.createElement('canvas');
                        const rotatedCtx = rotatedCanvas.getContext('2d');
                        rotatedCanvas.width = regionData.width;
                        rotatedCanvas.height = regionData.height;
                        
                        rotatedCtx.translate(regionData.width / 2, regionData.height / 2);
                        rotatedCtx.rotate((angulo * Math.PI) / 180);
                        rotatedCtx.drawImage(tempCanvas, -regionData.width / 2, -regionData.height / 2);
                        
                        const rotatedImageData = rotatedCtx.getImageData(0, 0, regionData.width, regionData.height);
                        const rotatedMejorada = mejorarImagenHibrida(rotatedImageData);
                        
                        code = jsQR(rotatedMejorada.data, rotatedMejorada.width, rotatedMejorada.height, {
                            inversionAttempts: "attemptBoth"
                        });
                        
                        if (code) {
                            console.log(`✅ QR detectado con rotación ${angulo}° en región verde`);
                            break;
                        }
                    }
                }
                
                // =========== FASE 6: TÉCNICAS ESPECIALES (después de 120 intentos) ===========
                if (!code && intentosConsecutivos > 120) {
                    console.log('⚡ Fase 6: Técnicas especiales finales en región verde');
                    
                    // Combinación de filtros en la región verde
                    try {
                        // Filtro de contraste extremo
                        const contrasteExtremo = new ImageData(
                            new Uint8ClampedArray(regionData.data),
                            regionData.width,
                            regionData.height
                        );
                        
                        // Aumentar contraste agresivamente
                        for (let i = 0; i < contrasteExtremo.data.length; i += 4) {
                            const gray = (contrasteExtremo.data[i] + contrasteExtremo.data[i + 1] + contrasteExtremo.data[i + 2]) / 3;
                            const enhanced = gray > 128 ? 255 : 0;
                            contrasteExtremo.data[i] = enhanced;
                            contrasteExtremo.data[i + 1] = enhanced;
                            contrasteExtremo.data[i + 2] = enhanced;
                        }
                        
                        code = jsQR(contrasteExtremo.data, contrasteExtremo.width, contrasteExtremo.height, {
                            inversionAttempts: "attemptBoth"
                        });
                        
                        if (code) {
                            console.log('✅ QR detectado con contraste extremo en región verde');
                        }
                    } catch (error) {
                        console.warn('⚠️ Error en técnicas especiales:', error);
                    }
                }
                
                // Actualizar indicador visual inteligente
                if (frameSkipCounter % 8 === 0) { // Menos frecuente para mejor rendimiento
                    actualizarIndicadorDeteccion(!!code, intentosConsecutivos, modoUltraPrecision);
                }
                
                if (code && code.data) {
                    console.log('🎯 Código QR detectado:', code.data);
                    
                    // Confirmación rápida
                    if (ultimoCodigoDetectado === code.data) {
                        console.log('✅ Código QR CONFIRMADO');
                        
                        // Vibración de éxito
                        if (navigator.vibrate) {
                            navigator.vibrate([100, 50, 100]);
                        }
                        
                        registrarCodigo(code.data);
                        
                        // Reset completo
                        ultimoCodigoDetectado = null;
                        intentosConsecutivos = 0;
                        frameSkipCounter = 0;
                        modoUltraPrecision = false;
                        
                        // Pausar detección
                        scannerActivo = false;
                        actualizarEstado('✅ QR procesado - Reiniciando...', true);
                        
                        setTimeout(() => {
                            if (videoStream) {
                                scannerActivo = true;
                                actualizarEstado('🔍 Escaneando QR SISEG...', null);
                                iniciarDeteccionQR();
                            }
                        }, 1500);
                        return;
                    } else {
                        // Nuevo código detectado
                        ultimoCodigoDetectado = code.data;
                        actualizarEstado('🔄 QR detectado - Confirmando...', null);
                    }
                } else {
                    // No se detectó código
                    intentosConsecutivos++;
                    
                    // Reset periódico inteligente
                    if (intentosConsecutivos > 180) {
                        ultimoCodigoDetectado = null;
                        intentosConsecutivos = 0;
                        modoUltraPrecision = false;
                        console.log('🔄 Reset automático del sistema de detección');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error en detección QR:', error);
            intentosConsecutivos++;
        }
        
        // Continuar con la detección
        requestAnimationFrame(detectar);
    };
    
    console.log('🚀 Iniciando detección QR HÍBRIDA (máxima precisión + rendimiento)...');
    actualizarEstado('🔍 Escaneando QR SISEG...', null);
    detectar();
}

// Función para mejorar imagen HÍBRIDA (máxima efectividad)
function mejorarImagenHibrida(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // ANÁLISIS INTELIGENTE: Detectar tipo de imagen
    let totalBrillo = 0;
    let contrastes = [];
    let samples = 0;
    
    // Muestrear de forma inteligente (cada 8 píxeles en patrón cruzado)
    for (let y = 4; y < height - 4; y += 8) {
        for (let x = 4; x < width - 4; x += 8) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const brillo = (r + g + b) / 3;
            totalBrillo += brillo;
            
            // Calcular contraste local (diferencia con vecinos)
            const vecino = ((y * width + x + 4) * 4);
            if (vecino < data.length - 4) {
                const brilloVecino = (data[vecino] + data[vecino + 1] + data[vecino + 2]) / 3;
                contrastes.push(Math.abs(brillo - brilloVecino));
            }
            
            samples++;
        }
    }
    
    const brilloPromedio = totalBrillo / samples;
    const contrastePromedio = contrastes.reduce((a, b) => a + b, 0) / contrastes.length;
    
    console.log(`💡 Análisis: Brillo=${brilloPromedio.toFixed(1)}, Contraste=${contrastePromedio.toFixed(1)}`);
    
    // PROCESAMIENTO ADAPTATIVO según el análisis
    let threshold = 128;
    let metodo = 'estandar';
    
    if (brilloPromedio > 180 && contrastePromedio < 30) {
        // Imagen muy brillante con poco contraste (pantalla brillante)
        threshold = 160;
        metodo = 'pantalla_brillante';
        console.log('📱 Detectada: Pantalla brillante');
    } else if (brilloPromedio < 70 && contrastePromedio < 25) {
        // Imagen oscura con poco contraste (papel en sombra)
        threshold = 90;
        metodo = 'papel_oscuro';
        console.log('📄 Detectado: Papel en sombra');
    } else if (contrastePromedio > 60) {
        // Alto contraste (QR nítido)
        threshold = brilloPromedio > 140 ? 145 : 115;
        metodo = 'alto_contraste';
        console.log('🎯 Detectado: Alto contraste');
    } else if (brilloPromedio > 140 && brilloPromedio < 180) {
        // Condiciones normales
        threshold = 130;
        metodo = 'normal';
        console.log('🌤️ Detectado: Condiciones normales');
    } else {
        // Condiciones difíciles - usar procesamiento agresivo
        threshold = brilloPromedio;
        metodo = 'agresivo';
        console.log('⚡ Detectado: Condiciones difíciles');
    }
    
    // APLICAR PROCESAMIENTO según el método detectado
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Conversión a escala de grises optimizada
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        let enhanced;
        
        switch (metodo) {
            case 'pantalla_brillante':
                // Reducir brillo excesivo y aumentar contraste
                const grayReducido = Math.max(0, gray * 0.8 - 10);
                enhanced = grayReducido > threshold ? 255 : 0;
                break;
                
            case 'papel_oscuro':
                // Aumentar brillo y contraste
                const grayAumentado = Math.min(255, gray * 1.4 + 20);
                enhanced = grayAumentado > threshold ? 255 : 0;
                break;
                
            case 'alto_contraste':
                // Umbralización simple para preservar nitidez
                enhanced = gray > threshold ? 255 : 0;
                break;
                
            case 'agresivo':
                // Umbralización adaptativa con suavizado
                const margen = 15;
                if (gray > threshold + margen) enhanced = 255;
                else if (gray < threshold - margen) enhanced = 0;
                else {
                    // Zona de transición - decidir por contexto local
                    const factor = (gray - (threshold - margen)) / (2 * margen);
                    enhanced = factor > 0.5 ? 255 : 0;
                }
                break;
                
            default: // 'normal'
                // Umbralización estándar con pequeño suavizado
                enhanced = gray > threshold ? 255 : 0;
                break;
        }
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
    }
    
    return new ImageData(data, width, height);
}

// Función para rotación rápida (solo ángulos pequeños)
function rotarImagenRapida(imageData, angulo) {
    try {
        // Solo rotar ángulos pequeños para mantener rendimiento
        if (Math.abs(angulo) > 10) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Usar tamaño original para rotaciones pequeñas
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        // Crear imagen temporal
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // Aplicar rotación desde el centro
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angulo * Math.PI) / 180);
        ctx.drawImage(tempCanvas, -imageData.width / 2, -imageData.height / 2);
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        console.error('Error en rotación rápida:', error);
        return null;
    }
}

// Función para actualizar indicador con información del modo
function actualizarIndicadorDeteccion(codigoDetectado, intentos, modoUltra = false) {
    const overlay = document.getElementById('detection-overlay');
    if (!overlay) return;
    
    // Actualización con información del modo actual
    if (codigoDetectado) {
        overlay.style.borderColor = '#10b981';
        overlay.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.8)';
    } else {
        // Cambio de color según el modo y los intentos
        if (modoUltra) {
            overlay.style.borderColor = '#dc2626'; // Rojo para ultra precisión
            overlay.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.6)';
        } else if (intentos < 30) {
            overlay.style.borderColor = '#25D366'; // Verde WhatsApp para modo normal
            overlay.style.boxShadow = '0 0 20px rgba(37, 211, 102, 0.6)';
        } else {
            overlay.style.borderColor = '#f59e0b'; // Amarillo para modo intermedio
            overlay.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.5)';
        }
    }
    
    // Añadir pulso visual para indicar que solo funciona en el cuadrado verde
    if (!codigoDetectado && intentos < 5) {
        overlay.style.animation = 'pulseGreen 2s infinite';
    } else {
        overlay.style.animation = 'none';
    }
}

// Función para mejorar imagen SIMPLE (sin trabar la página)
function mejorarImagenSimple(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Aplicar mejora básica de contraste (más rápido)
    for (let i = 0; i < data.length; i += 4) {
        // Convertir a escala de grises
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        
        // Umbralización simple
        const enhanced = gray > 128 ? 255 : 0;
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
    }
    
    return new ImageData(data, width, height);
}

// FUNCIONES ESPECIALIZADAS PARA PANTALLAS Y ULTRA PRECISIÓN

// Función para ajustar gamma específicamente para pantallas
function ajustarParaPantallas(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const gamma = 0.8; // Gamma ajustado para pantallas
    
    // Crear tabla de lookup para gamma
    const gammaTable = new Array(256);
    for (let i = 0; i < 256; i++) {
        gammaTable[i] = Math.round(255 * Math.pow(i / 255, gamma));
    }
    
    // Aplicar corrección gamma
    for (let i = 0; i < data.length; i += 4) {
        data[i] = gammaTable[data[i]];         // R
        data[i + 1] = gammaTable[data[i + 1]]; // G
        data[i + 2] = gammaTable[data[i + 2]]; // B
    }
    
    return new ImageData(data, imageData.width, imageData.height);
}

// Función para mejorar contraste específicamente para pantallas
function mejorarParaPantallas(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // PASO 1: Reducir brillo excesivo de pantallas
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Detectar píxeles muy brillantes (típicos de pantallas)
        const brillo = (r + g + b) / 3;
        
        if (brillo > 200) {
            // Reducir brillo excesivo
            const factor = 0.7;
            r = Math.round(r * factor);
            g = Math.round(g * factor);
            b = Math.round(b * factor);
        }
        
        // Convertir a escala de grises optimizada para QR
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        // Umbralización adaptativa para pantallas
        let threshold = 140; // Un poco más alto para pantallas brillantes
        
        // Ajustar umbral según el contexto local
        if (brillo > 180) threshold = 160;
        else if (brillo < 60) threshold = 100;
        
        const enhanced = gray > threshold ? 255 : 0;
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G  
        data[i + 2] = enhanced; // B
    }
    
    return new ImageData(data, width, height);
}

// Función para rotar imagen (para QR inclinados)
function rotarImagen(imageData, angulo) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const angleRad = (angulo * Math.PI) / 180;
        
        // Calcular nuevo tamaño después de rotación
        const cos = Math.abs(Math.cos(angleRad));
        const sin = Math.abs(Math.sin(angleRad));
        
        const newWidth = Math.round(imageData.width * cos + imageData.height * sin);
        const newHeight = Math.round(imageData.width * sin + imageData.height * cos);
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Crear imagen temporal
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // Aplicar rotación
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(angleRad);
        ctx.drawImage(tempCanvas, -imageData.width / 2, -imageData.height / 2);
        
        return ctx.getImageData(0, 0, newWidth, newHeight);
    } catch (error) {
        console.error('Error rotando imagen:', error);
        return null;
    }
}

// Función para filtrar efecto moiré (pantallas)
function filtrarMoire(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Filtro anti-moiré simple (promedio con vecinos)
    const newData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Obtener píxeles vecinos
            const neighbors = [
                data[idx], // Centro
                data[((y-1) * width + x) * 4], // Arriba
                data[((y+1) * width + x) * 4], // Abajo
                data[(y * width + (x-1)) * 4], // Izquierda
                data[(y * width + (x+1)) * 4]  // Derecha
            ];
            
            // Calcular mediana para reducir ruido
            neighbors.sort((a, b) => a - b);
            const median = neighbors[2]; // Mediana de 5 valores
            
            // Aplicar filtro suave
            newData[idx] = median;
            newData[idx + 1] = median;
            newData[idx + 2] = median;
        }
    }
    
    return new ImageData(newData, width, height);
}

// ============================================
// SISTEMA DE QR SEGURO SISEG
// ============================================

// Función para encriptar datos específicamente para SISEG
function encriptarParaSISEG(datos) {
    try {
        // Crear timestamp para códigos QR permanentes
        const timestamp = Date.now();
        
        // Preparar objeto REDUCIDO con menos metadatos para QR más simples
        const payload = {
            d: datos, // 'd' en lugar de 'data' para reducir tamaño
            t: timestamp, // 't' en lugar de 'timestamp'
            a: 'SISEG', // 'a' en lugar de 'app'
            v: '1.0', // 'v' en lugar de 'version'
            p: true // 'p' en lugar de 'permanent'
        };
        
        // Convertir a JSON y encriptar con AES
        const jsonPayload = JSON.stringify(payload);
        const encrypted = CryptoJS.AES.encrypt(jsonPayload, SISEG_SECRET_KEY).toString();
        
        // Agregar firma SISEG al inicio
        return SISEG_SIGNATURE + encrypted;
        
    } catch (error) {
        console.error('❌ Error en encriptación SISEG:', error);
        return null;
    }
}

// Función para desencriptar datos SISEG (para verificar que funciona)
function desencriptarDeSISEG(datosEncriptados) {
    try {
        // Verificar firma SISEG
        if (!datosEncriptados.startsWith(SISEG_SIGNATURE)) {
            throw new Error('QR no pertenece a SISEG - Acceso denegado');
        }
        
        // Remover firma y desencriptar
        const encrypted = datosEncriptados.replace(SISEG_SIGNATURE, '');
        const decrypted = CryptoJS.AES.decrypt(encrypted, SISEG_SECRET_KEY);
        const jsonPayload = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!jsonPayload) {
            throw new Error('Datos corruptos o clave incorrecta');
        }
        
        const payload = JSON.parse(jsonPayload);
        
        // Verificar que es de SISEG - Compatible con formato nuevo y viejo
        const app = payload.a || payload.app; // 'a' nuevo formato, 'app' formato viejo
        if (app !== 'SISEG') {
            throw new Error('QR no autorizado para SISEG');
        }
        
        // Verificar expiración (solo para códigos no permanentes) - Compatible con ambos formatos
        const permanent = payload.p || payload.permanent;
        const expiracion = payload.e || payload.expiracion;
        if (!permanent && expiracion && Date.now() > expiracion) {
            throw new Error('QR expirado - Genere uno nuevo');
        }
        
        // Para códigos permanentes, solo mostrar advertencia si son muy antiguos (más de 2 años)
        const timestamp = payload.t || payload.timestamp;
        if (permanent && timestamp) {
            const antiguedad = Date.now() - timestamp;
            const dosAnios = 2 * 365 * 24 * 60 * 60 * 1000;
            
            if (antiguedad > dosAnios) {
                console.warn('⚠️ QR muy antiguo pero aún válido (más de 2 años)');
            }
        }
        
        // Retornar los datos - Compatible con ambos formatos
        return payload.d || payload.data;
        
    } catch (error) {
        console.error('🚫 Error de seguridad SISEG:', error.message);
        return null;
    }
}

// Función para alternar el generador QR
function toggleGeneradorQR() {
    const container = document.getElementById('qr-generator-container');
    qrGeneratorActivo = !qrGeneratorActivo;
    
    if (qrGeneratorActivo) {
        container.style.display = 'block';
        // Desplazar hacia el generador
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        container.style.display = 'none';
        limpiarGenerador();
    }
}

// Función para crear QR personalizado con logo SISEG
async function crearQRConLogo(datos, displayArea) {
    return new Promise((resolve, reject) => {
        try {
            // Crear canvas principal para el QR
            const canvas = document.createElement('canvas');
            const size = 400; // Aumentado de 300 a 400 para mejor legibilidad
            canvas.width = size;
            canvas.height = size;
            
            // Generar QR base con QRious en color negro
            const qrTemp = new QRious({
                element: canvas,
                value: datos,
                size: size,
                background: '#ffffff',
                foreground: '#000000', // Negro como solicitaste
                level: 'L' // Nivel BAJO para menos densidad y más fácil lectura
            });
            
            const ctx = canvas.getContext('2d');
            
            // Cargar y agregar el logo
            const logo = new Image();
            logo.onload = function() {
                // Calcular posición y tamaño del logo (15% del QR)
                const logoSize = size * 0.15;
                const logoX = (size - logoSize) / 2;
                const logoY = (size - logoSize) / 2;
                
                // Crear área blanca circular para el logo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(size/2, size/2, logoSize/2 + 8, 0, 2 * Math.PI);
                ctx.fill();
                
                // Agregar borde al círculo
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Dibujar el logo circular
                ctx.save();
                ctx.beginPath();
                ctx.arc(size/2, size/2, logoSize/2, 0, 2 * Math.PI);
                ctx.clip();
                
                ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                ctx.restore();
                
                // Limpiar área de visualización
                displayArea.innerHTML = '';
                
                // Agregar el canvas final
                displayArea.appendChild(canvas);
                
                // Guardar referencia global
                window.qrActual = canvas;
                
                console.log('✅ QR con logo SISEG creado exitosamente');
                resolve(canvas);
            };
            
            logo.onerror = function() {
                console.warn('⚠️ No se pudo cargar el logo, generando QR sin logo');
                
                // Si no se puede cargar el logo, crear QR simple negro
                const qrSimple = new QRious({
                    element: canvas,
                    value: datos,
                    size: size,
                    background: '#ffffff',
                    foreground: '#000000',
                    level: 'L' // Nivel bajo para menos densidad
                });
                
                displayArea.innerHTML = '';
                displayArea.appendChild(canvas);
                window.qrActual = canvas;
                
                resolve(canvas);
            };
            
            // Intentar cargar el logo
            logo.src = '/static/images/logo-qr.jpg';
            
        } catch (error) {
            console.error('❌ Error creando QR con logo:', error);
            reject(error);
        }
    });
}

// Función para generar QR seguro
async function generarQRSeguro() {
    console.log('🔒 Iniciando generación de QR seguro...');
    
    const input = document.getElementById('qr-data-input');
    const outputSection = document.getElementById('qr-output-section');
    const displayArea = document.getElementById('qr-display-area');
    
    const datos = input.value.trim();
    if (!datos) {
        alert('❌ Por favor ingresa la información para el QR');
        return;
    }
    
    // Verificar que las librerías estén cargadas
    if (typeof CryptoJS === 'undefined') {
        console.error('❌ CryptoJS no está cargado');
        alert('❌ Error: Librería de encriptación no disponible. Recarga la página.');
        return;
    }
    
    if (typeof QRious === 'undefined') {
        console.error('❌ QRious no está cargado');
        alert('❌ Error: Librería de QR no disponible. Recarga la página.');
        return;
    }
    
    try {
        console.log('📝 Datos a encriptar:', datos);
        
        // Encriptar datos
        const datosEncriptados = encriptarParaSISEG(datos);
        if (!datosEncriptados) {
            console.error('❌ Error en encriptación');
            alert('❌ Error al encriptar los datos');
            return;
        }
        
        console.log('🔐 Datos encriptados exitosamente, longitud:', datosEncriptados.length);
        
        // Limpiar área de visualización
        displayArea.innerHTML = '<p style="color: #991b1b;">⏳ Generando QR seguro con logo...</p>';
        
        // Crear QR con logo usando la función especializada
        try {
            const canvas = await crearQRConLogo(datosEncriptados, displayArea);
            qrActual = canvas;
            
            // Mostrar sección de salida
            outputSection.style.display = 'block';
            
            // Desplazarse hacia el QR generado
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Añadir vibración de confirmación (si está disponible)
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            
            console.log('✅ QR seguro con logo generado y mostrado exitosamente');
            
        } catch (logoError) {
            console.warn('⚠️ Error con logo, generando QR simple:', logoError);
            
            // Si falla el logo, crear QR simple negro
            const canvas = document.createElement('canvas');
            
            const qr = new QRious({
                element: canvas,
                value: datosEncriptados,
                size: 400, // Aumentado para mejor legibilidad
                background: '#ffffff',
                foreground: '#000000', // Color negro
                level: 'L' // Nivel bajo para menos densidad
            });
            
            // Limpiar área de visualización
            displayArea.innerHTML = '';
            displayArea.appendChild(canvas);
            qrActual = canvas;
            
            // Mostrar sección de salida
            outputSection.style.display = 'block';
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            
            console.log('✅ QR seguro simple generado exitosamente');
        }
        
    } catch (error) {
        console.error('❌ Error general generando QR seguro:', error);
        alert('❌ Error al generar el QR seguro: ' + error.message);
        displayArea.innerHTML = '<p style="color: #dc2626;">❌ Error: ' + error.message + '</p>';
    }
}

// Función para mostrar vista previa del nombre del archivo
function mostrarVistaPreviewArchivo() {
    const inputElement = document.getElementById('qr-data-input');
    const previewElement = document.getElementById('filename-preview');
    
    if (!inputElement || !previewElement) return;
    
    const datos = inputElement.value.trim();
    if (!datos) {
        previewElement.style.display = 'none';
        return;
    }
    
    // Extraer el primer campo para el nombre del archivo
    const campos = datos.split('|');
    if (campos.length > 0 && campos[0].trim()) {
        const nombreActivo = campos[0].trim();
        const nombreLimpio = nombreActivo
            .replace(/[^\w\s-_.]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        
        if (nombreLimpio) {
            const nombreArchivo = `QR_${nombreLimpio}_[timestamp].png`;
            previewElement.innerHTML = `📄 Archivo se descargará como: <strong>${nombreArchivo}</strong>`;
            previewElement.style.display = 'block';
        } else {
            previewElement.innerHTML = `📄 Archivo se descargará como: <strong>QR_SISEG_[timestamp].png</strong>`;
            previewElement.style.display = 'block';
        }
    } else {
        previewElement.innerHTML = `📄 Archivo se descargará como: <strong>QR_SISEG_[timestamp].png</strong>`;
        previewElement.style.display = 'block';
    }
}

// Función para obtener el nombre del activo para el archivo
function obtenerNombreActivoParaArchivo() {
    const inputElement = document.getElementById('qr-data-input');
    if (!inputElement || !inputElement.value.trim()) {
        return null;
    }
    
    const datosOriginales = inputElement.value.trim();
    const campos = datosOriginales.split('|');
    
    if (campos.length > 0 && campos[0].trim()) {
        const nombreActivo = campos[0].trim();
        // Limpiar el nombre para que sea válido como nombre de archivo
        const nombreLimpio = nombreActivo
            .replace(/[^\w\s-_.]/g, '') // Eliminar caracteres especiales
            .replace(/\s+/g, '_')       // Reemplazar espacios con guiones bajos
            .substring(0, 50);          // Limitar longitud
        
        return nombreLimpio || null;
    }
    
    return null;
}

// Función para descargar el QR con nombre del activo
function descargarQR() {
    if (!qrActual) {
        alert('❌ No hay ningún QR para descargar');
        return;
    }
    
    try {
        // Obtener el nombre del activo para el archivo
        const nombreActivo = obtenerNombreActivoParaArchivo();
        
        // Generar nombre del archivo
        let nombreArchivo;
        if (nombreActivo) {
            nombreArchivo = `QR_${nombreActivo}_${Date.now()}.png`;
            console.log(`📝 Descargando con nombre personalizado: ${nombreArchivo}`);
        } else {
            nombreArchivo = `QR_SISEG_${Date.now()}.png`;
            console.log(`📝 Descargando con nombre por defecto: ${nombreArchivo}`);
        }
        
        // Crear enlace de descarga con el nombre personalizado
        const link = document.createElement('a');
        link.download = nombreArchivo;
        link.href = qrActual.toDataURL();
        
        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`💾 QR descargado exitosamente como: ${nombreArchivo}`);
        
        // Vibración de confirmación
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
    } catch (error) {
        console.error('❌ Error descargando QR:', error);
        alert('❌ Error al descargar el QR');
    }
}

// Función para limpiar el generador
function limpiarGenerador() {
    document.getElementById('qr-data-input').value = '';
    document.getElementById('qr-output-section').style.display = 'none';
    document.getElementById('qr-display-area').innerHTML = '';
    qrActual = null;
}

// Función para verificar que las librerías estén funcionando
function verificarLibrerias() {
    console.log('🔧 Verificando librerías...');
    
    const displayArea = document.getElementById('qr-display-area');
    let resultados = [];
    let todoOK = true;
    
    // Verificar CryptoJS
    if (typeof CryptoJS !== 'undefined') {
        resultados.push('✅ CryptoJS: Disponible');
        console.log('✅ CryptoJS disponible:', CryptoJS);
        
        // Probar encriptación
        try {
            const testData = 'prueba';
            const encrypted = CryptoJS.AES.encrypt(testData, 'test-key').toString();
            const decrypted = CryptoJS.AES.decrypt(encrypted, 'test-key').toString(CryptoJS.enc.Utf8);
            if (decrypted === testData) {
                resultados.push('✅ Encriptación AES: Funcionando');
            } else {
                resultados.push('❌ Encriptación AES: Error en prueba');
                todoOK = false;
            }
        } catch (error) {
            resultados.push('❌ Encriptación AES: Error - ' + error.message);
            todoOK = false;
        }
    } else {
        resultados.push('❌ CryptoJS: No disponible');
        todoOK = false;
    }
    
    // Verificar QRious
    if (typeof QRious !== 'undefined') {
        resultados.push('✅ QRious: Disponible');
        console.log('✅ QRious disponible:', QRious);
        
        // Probar generación de QR simple
        try {
            const testCanvas = document.createElement('canvas');
            const testQR = new QRious({
                element: testCanvas,
                value: 'SISEG_TEST',
                size: 100
            });
            resultados.push('✅ Generación QR: Funcionando');
            todoOK = true;
        } catch (error) {
            resultados.push('❌ Generación QR: Error - ' + error.message);
            todoOK = false;
        }
    } else {
        resultados.push('❌ QRious: No disponible');
        todoOK = false;
    }
    
    // Mostrar resultados (versión sync)
    mostrarResultadosVerificacion(resultados, todoOK);
}

// Función para mostrar los resultados de verificación
function mostrarResultadosVerificacion(resultados, todoOK) {
    const displayArea = document.getElementById('qr-display-area');
    const outputSection = document.getElementById('qr-output-section');
    
    let html = '<div style="text-align: left; padding: 20px; background: #f8fafc; border-radius: 8px;">';
    html += '<h4 style="color: #991b1b; margin-bottom: 15px;">🔧 Diagnóstico del Sistema</h4>';
    
    resultados.forEach(resultado => {
        html += '<p style="margin: 8px 0; font-size: 14px; color: #374151;">' + resultado + '</p>';
    });
    
    if (todoOK) {
        html += '<div style="margin-top: 15px; padding: 10px; background: #dcfce7; border-radius: 5px; color: #166534;">';
        html += '<strong>✅ Sistema listo para generar QR seguros</strong>';
        html += '</div>';
    } else {
        html += '<div style="margin-top: 15px; padding: 10px; background: #fee2e2; border-radius: 5px; color: #dc2626;">';
        html += '<strong>❌ Sistema no está listo. Recarga la página.</strong>';
        html += '</div>';
    }
    
    html += '</div>';
    
    displayArea.innerHTML = html;
    outputSection.style.display = 'block';
    
    // Desplazar hacia los resultados
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// FUNCIONES DE BÚSQUEDA Y FILTROS
// ============================================

// Función para generar código automático basado en ubicación
function generarCodigoPorUbicacion(ubicacion) {
    if (!ubicacion) return '';
    
    const ubicacionLower = ubicacion.toLowerCase();
    
    // Definir palabras clave y sus códigos correspondientes
    const codigosUbicacion = {
        'r.h.': 'RH',
        'rh': 'RH',
        'recursos humanos': 'RH',
        'administracion': 'ADMON',
        'administrativa': 'ADMON',
        'administrativo': 'ADMON',
        'admin': 'ADMON',
        'admon': 'ADMON',
        'cuentas por pagar': 'CRED',
        'credito': 'CRED',
        'cred': 'CRED',
        'recepcion': 'REC',
        'recepcionista': 'REC',
        'rec': 'REC',
        'almacen': 'ALM',
        'bodega': 'ALM',
        'alm': 'ALM',
        'gerencia de ventas': 'GV',
        'gerencia ventas': 'GV',
        'ger ventas': 'GV',
        'ventas': 'VEN',
        'venta': 'VEN',
        'vendedor': 'VEN',
        'ven': 'VEN',
        'mercadotecnia': 'PROY',
        'marketing': 'PROY',
        'proyectos': 'PROY',
        'proyecto': 'PROY',
        'proy': 'PROY',
        'direccion': 'DIR',
        'director': 'DIR',
        'directora': 'DIR',
        'dir': 'DIR',
        'sala de juntas': 'SJ',
        'sala juntas': 'SJ',
        'junta': 'SJ',
        'juntas': 'SJ',
        'sj': 'SJ',
        'gerencia general': 'GER',
        'gerencia gral': 'GER',
        'ger general': 'GER',
        'gerente general': 'GER',
        'ger': 'GER',
        'sistemas': 'ARC',
        'sistema': 'ARC',
        'it': 'ARC',
        'monitoreo': 'MON',
        'monitor': 'MON',
        'site': 'MON',
        'mon': 'MON',
        'cocina': 'ARC',
        'comedor': 'ARC',
        'roof garden': 'ARC',
        'roof': 'ARC',
        'garden': 'ARC',
        'azotea': 'ARC',
        'arc': 'ARC'
    };
    
    // Buscar coincidencias en orden de prioridad (más específicas primero)
    const palabrasOrdenadas = Object.keys(codigosUbicacion).sort((a, b) => b.length - a.length);
    
    for (const palabra of palabrasOrdenadas) {
        if (ubicacionLower.includes(palabra)) {
            console.log('🏷️ Código generado: ' + codigosUbicacion[palabra] + ' para ubicación: ' + ubicacion);
            return codigosUbicacion[palabra];
        }
    }
    
    // Si no encuentra coincidencia, generar código genérico
    const primeraPalabra = ubicacion.split(' ')[0].toUpperCase().substring(0, 3);
    console.log('🏷️ Código genérico generado: ' + primeraPalabra + ' para ubicación: ' + ubicacion);
    return primeraPalabra;
}

// Función para actualizar códigos de todos los activos
function actualizarCodigosActivos() {
    if (activosOriginales && activosOriginales.length > 0) {
        console.log('🔄 Actualizando códigos de activos...');
        
        activosOriginales.forEach(activo => {
            if (activo.ubicacion) {
                const codigoGenerado = generarCodigoPorUbicacion(activo.ubicacion);
                activo.codigo = codigoGenerado;
            }
        });
        
        console.log('✅ Códigos actualizados para todos los activos');
        
        // Refrescar la tabla si está visible
        const busqueda = document.getElementById('busqueda-input')?.value || '';
        const filtro = document.getElementById('filtro-select')?.value || 'todos';
        
        let activosFiltrados = activosOriginales;
        if (busqueda) {
            activosFiltrados = activosOriginales.filter(activo => {
                switch (filtro) {
                    case 'nombre':
                        return activo.nombre.toLowerCase().includes(busqueda.toLowerCase());
                    case 'ubicacion':
                        return activo.ubicacion.toLowerCase().includes(busqueda.toLowerCase());
                    case 'marca':
                        return activo.marca.toLowerCase().includes(busqueda.toLowerCase());
                    case 'modelo':
                        return activo.modelo.toLowerCase().includes(busqueda.toLowerCase());
                    case 'codigo':
                        return activo.codigo.toLowerCase().includes(busqueda.toLowerCase());
                    default: // 'todos'
                        return activo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                               activo.ubicacion.toLowerCase().includes(busqueda.toLowerCase()) ||
                               activo.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
                               activo.modelo.toLowerCase().includes(busqueda.toLowerCase()) ||
                               activo.codigo.toLowerCase().includes(busqueda.toLowerCase());
                }
            });
        }
        
        mostrarActivosFiltrados(activosFiltrados);
    }
}

// Función para filtrar activos en tiempo real
function filtrarActivos() {
    const busqueda = document.getElementById('busqueda-input').value.toLowerCase().trim();
    const filtro = document.getElementById('filtro-select').value;
    
    console.log('🔍 Filtrando: "' + busqueda + '" por ' + filtro);
    
    let activosFiltrados = activosOriginales;
    
    // Aplicar filtro de búsqueda si hay texto
    if (busqueda) {
        activosFiltrados = activosOriginales.filter(activo => {
            switch (filtro) {
                case 'nombre':
                    return activo.nombre.toLowerCase().includes(busqueda);
                case 'ubicacion':
                    return activo.ubicacion.toLowerCase().includes(busqueda);
                case 'marca':
                    return activo.marca.toLowerCase().includes(busqueda);
                case 'modelo':
                    return activo.modelo.toLowerCase().includes(busqueda);
                case 'codigo':
                    return activo.codigo.toLowerCase().includes(busqueda);
                default: // 'todos'
                    return activo.nombre.toLowerCase().includes(busqueda) ||
                           activo.ubicacion.toLowerCase().includes(busqueda) ||
                           activo.marca.toLowerCase().includes(busqueda) ||
                           activo.modelo.toLowerCase().includes(busqueda) ||
                           activo.codigo.toLowerCase().includes(busqueda);
            }
        });
    }
    
    // Mostrar los activos filtrados
    mostrarActivosFiltrados(activosFiltrados);
    
    // Actualizar contador
    document.getElementById('total-activos').textContent = activosFiltrados.length;
    document.getElementById('total-filtrados').textContent = 
        busqueda ? ` (${activosFiltrados.length} de ${activosOriginales.length})` : '';
    
    // Vibración suave para feedback
    if (navigator.vibrate && busqueda) {
        navigator.vibrate(30);
    }
}

// Función para mostrar activos filtrados
function mostrarActivosFiltrados(activos) {
    const tbody = document.getElementById('tabla-activos-body');
    tbody.innerHTML = '';
    
    if (activos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="sin-activos">🔍 No se encontraron activos con esos criterios</td></tr>';
        return;
    }
    
    activos.forEach((activo, index) => {
        // Asegurar que cada activo tenga código generado
        if (!activo.codigo && activo.ubicacion) {
            activo.codigo = generarCodigoPorUbicacion(activo.ubicacion);
        } else if (!activo.codigo) {
            activo.codigo = 'GEN';
        }
        
        const fila = document.createElement('tr');
        fila.classList.add('fila-swipe');
        
        // Verificar duplicados
        const esDuplicado = verificarDuplicado(activo, activos, index);
        if (esDuplicado) {
            fila.classList.add('activo-duplicado');
        }
        
        const esMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const busqueda = document.getElementById('busqueda-input').value.toLowerCase().trim();
        
        if (esMobile) {
            // Vista móvil con resaltado de búsqueda
            const nombreResaltado = resaltarTexto(activo.nombre, busqueda);
            const ubicacionResaltada = resaltarTexto(activo.ubicacion, busqueda);
            const codigoResaltado = resaltarTexto(activo.codigo, busqueda);
            
            fila.innerHTML = 
                '<td style="padding: 0; position: relative;">' +
                    '<div class="fila-deslizable" style="position: relative; background: white; transition: transform 0.2s ease; padding: 15px; border-bottom: 1px solid #e5e7eb;">' +
                        '<div style="margin-bottom: 8px;"><strong>🏷️ ' + codigoResaltado + '</strong></div>' +
                        '<div style="margin-bottom: 8px; font-size: 16px;">' + nombreResaltado + (esDuplicado ? ' ⚠️' : '') + '</div>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; color: #666;">' +
                            '<div>📍 ' + ubicacionResaltada + '</div>' +
                            '<div>🏷️ ' + resaltarTexto(activo.marca, busqueda) + '</div>' +
                            '<div>📦 ' + resaltarTexto(activo.modelo, busqueda) + '</div>' +
                            '<div>🔢 ' + activo.no_serie + '</div>' +
                            '<div style="grid-column: 1 / -1;">📅 ' + activo.fecha_registro + '</div>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
                '<td style="display: none;"></td>' +
                '<td style="display: none;"></td>' +
                '<td style="display: none;"></td>' +
                '<td style="display: none;"></td>' +
                '<td style="display: none;"></td>' +
                '<td style="display: none;"></td>' +
                '<td style="display: none;"></td>';
            
            configurarDeslizadoDirecto(fila, activo.id || index, activo.nombre);
        } else {
            // Vista desktop con todas las columnas
            const codigoResaltado = resaltarTexto(activo.codigo, busqueda);
            const nombreResaltado = resaltarTexto(activo.nombre, busqueda);
            const ubicacionResaltada = resaltarTexto(activo.ubicacion, busqueda);
            const marcaResaltada = resaltarTexto(activo.marca, busqueda);
            const modeloResaltado = resaltarTexto(activo.modelo, busqueda);
            
            fila.innerHTML = 
                '<td style="padding: 12px; font-weight: bold; color: #991b1b;">' + codigoResaltado + '</td>' +
                '<td style="padding: 12px;">' + nombreResaltado + (esDuplicado ? ' ⚠️' : '') + '</td>' +
                '<td style="padding: 12px;">' + ubicacionResaltada + '</td>' +
                '<td style="padding: 12px;">' + marcaResaltada + '</td>' +
                '<td style="padding: 12px;">' + modeloResaltado + '</td>' +
                '<td style="padding: 12px;">' + activo.no_serie + '</td>' +
                '<td style="padding: 12px;">' + activo.fecha_registro + '</td>' +
                '<td style="padding: 12px;">' +
                    '<button onclick="eliminarActivo(' + (activo.id || index) + ')" class="btn-eliminar" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">' +
                        '🗑️ Eliminar' +
                    '</button>' +
                '</td>';
        }
        
        tbody.appendChild(fila);
    });
}

// Función para resaltar texto en las búsquedas
function resaltarTexto(texto, busqueda) {
    if (!busqueda || !texto) return texto;
    
    const regex = new RegExp('(' + busqueda + ')', 'gi');
    return texto.replace(regex, '<mark style="background: #fef08a; padding: 1px 2px; border-radius: 2px;">$1</mark>');
}

// Función para limpiar la búsqueda
function limpiarBusqueda() {
    document.getElementById('busqueda-input').value = '';
    document.getElementById('filtro-select').value = 'todos';
    filtrarActivos();
    
    // Vibración de confirmación
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// Función para aplicar filtros rápidos
function aplicarFiltroRapido(tipo) {
    document.getElementById('filtro-select').value = tipo;
    filtrarActivos();
    
    // Feedback visual
    const botones = document.querySelectorAll('.filtro-rapido');
    botones.forEach(btn => btn.classList.remove('activo'));
    document.querySelector(`[onclick="aplicarFiltroRapido('${tipo}')"]`).classList.add('activo');
    
    if (navigator.vibrate) {
        navigator.vibrate(40);
    }
}

// Función para actualizar códigos manualmente (botón de recarga)
function actualizarCodigosManualment() {
    console.log('🔄 Actualizando códigos manualmente...');
    actualizarCodigosActivos();
    
    // Mostrar mensaje de confirmación
    const statusEl = document.getElementById('scanner-status');
    if (statusEl) {
        const mensajeOriginal = statusEl.textContent;
        statusEl.textContent = '✅ Códigos actualizados correctamente';
        statusEl.style.backgroundColor = '#dcfce7';
        statusEl.style.color = '#166534';
        
        setTimeout(() => {
            statusEl.textContent = mensajeOriginal;
            statusEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            statusEl.style.color = '#991b1b';
        }, 3000);
    }
    
    // Vibración de confirmación
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// ============================================
// FUNCIONES DE SONIDO
// ============================================

// Función para reproducir sonidos
function reproducirSonido(tipo) {
    // Crear contexto de audio si no existe
    if (!window.audioContext) {
        try {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.log('⚠️ Audio no soportado:', error);
            return;
        }
    }
    
    const ctx = window.audioContext;
    
    if (tipo === 'nuevo') {
        // Sonido para QR nuevo - Dos tonos ascendentes (exitoso)
        reproducirTonoDoble(ctx, 800, 1000, 0.1, 200);
    } else if (tipo === 'duplicado') {
        // Sonido para QR duplicado - Tono grave descendente (advertencia)
        reproducirTonoDescendente(ctx, 400, 300, 0.15, 300);
    } else if (tipo === 'error') {
        // Sonido para error - Tres tonos graves rápidos
        reproducirTonoError(ctx, 200, 0.1, 100);
    }
}

// Función para reproducir tono doble (QR nuevo)
function reproducirTonoDoble(ctx, freq1, freq2, volumen, duracion) {
    // Primer tono
    setTimeout(() => {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
        gain1.gain.setValueAtTime(0, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 0.01);
        gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion/1000);
        
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + duracion/1000);
    }, 0);
    
    // Segundo tono (más agudo)
    setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.frequency.setValueAtTime(freq2, ctx.currentTime);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 0.01);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion/1000);
        
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + duracion/1000);
    }, 100);
}

// Función para reproducir tono descendente (QR duplicado)
function reproducirTonoDescendente(ctx, freqInicio, freqFin, volumen, duracion) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(freqInicio, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(freqFin, ctx.currentTime + duracion/1000);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion/1000);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duracion/1000);
}

// Función para reproducir tono de error
function reproducirTonoError(ctx, freq, volumen, duracion) {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(volumen, ctx.currentTime + 0.01);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion/1000);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duracion/1000);
        }, i * 150);
    }
}

// ============================================
// FUNCIONES DE PROCESAMIENTO DE QR
// ============================================

// Función para registrar código QR
function registrarCodigo(codigo) {
    console.log('📝 Analizando código QR:', codigo);
    
    // VERIFICACIÓN ESTRICTA: Solo aceptar códigos QR de SISEG
    if (!codigo.startsWith(SISEG_SIGNATURE)) {
        console.error('� ACCESO DENEGADO: QR no generado por SISEG');
        showMessage('🚫 CÓDIGO RECHAZADO - Solo se aceptan códigos QR generados por SISEG', 'error');
        
        // Vibración de rechazo fuerte
        if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300, 100, 300]);
        }
        
        // Sonido de error
        reproducirSonido('error');
        return; // BLOQUEAR completamente códigos externos
    }
    
    console.log('� QR seguro de SISEG detectado, desencriptando...');
    
    // Intentar desencriptar el código SISEG
    const datosDesencriptados = desencriptarDeSISEG(codigo);
    
    if (!datosDesencriptados) {
        console.error('🚫 QR seguro no válido o corrupto');
        showMessage('🚫 QR SISEG corrupto o con clave incorrecta', 'error');
        
        // Vibración de rechazo
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500]);
        }
        
        // Sonido de error
        reproducirSonido('error');
        return; // No procesar QR corrupto
    }
    
    console.log('✅ QR seguro SISEG desencriptado exitosamente');
    
    // Vibración especial para QR seguro exitoso
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
    
    showMessage('🔓 QR Seguro SISEG verificado y aceptado', 'success');
    
    const csrftoken = getCookie('csrftoken');
    
    fetchSeguro('/registrar_qr/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ codigo_qr: datosDesencriptados })
    })
    .then(data => {
        if (!data) return; // Si hay problemas de auth, ya se manejó
        console.log('✅ Respuesta del servidor:', data);
        
        if (data.success) {
            if (data.already_registered) {
                showMessage('⚠️ ' + data.mensaje, 'warning');
                // Sonido para QR duplicado
                reproducirSonido('duplicado');
            } else {
                showMessage('✅ ' + data.mensaje, 'success');
                // Sonido para QR nuevo
                reproducirSonido('nuevo');
            }
            
            // Vibración para feedback
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            
            // Recargar activos después de un breve delay
            setTimeout(() => {
                cargarActivosEscaneados();
            }, 1000);
        } else {
            showMessage('❌ Error: ' + data.error, 'error');
            // Sonido de error
            reproducirSonido('error');
        }
    })
    .catch(error => {
        console.error('❌ Error registrando código:', error);
        showMessage('❌ Error de conexión', 'error');
    });
}

// ============================================
// GESTIÓN DE ACTIVOS
// ============================================

// Función para cargar activos escaneados
function cargarActivosEscaneados() {
    console.log('📦 Cargando activos escaneados...');
    
    const tbody = document.getElementById('tabla-activos-body');
    
    // Mostrar indicador de carga inmediatamente
    tbody.innerHTML = '<tr><td colspan="8" class="sin-activos loading-text">🔄 <span class="loading-spinner">⚙️</span> Cargando activos...</td></tr>';
    
    fetchSeguro('/obtener_activos_escaneados/')
    .then(data => {
        if (!data) return; // Si hay problemas de auth, ya se manejó
        
        console.log('📋 Datos recibidos:', data);
        
        // SIEMPRE limpiar el mensaje de carga primero
        tbody.innerHTML = '';
        
        if (data.activos && data.activos.length > 0) {
            console.log('✅ Mostrando ' + data.activos.length + ' activos');
            tbody.innerHTML = '';
            
            // GENERAR CÓDIGOS AUTOMÁTICAMENTE basados en ubicación
            data.activos.forEach(activo => {
                if (activo.ubicacion) {
                    activo.codigo = generarCodigoPorUbicacion(activo.ubicacion);
                } else {
                    activo.codigo = 'GEN'; // Código genérico si no hay ubicación
                }
            });
            
            activosEscaneados = data.activos;
            activosOriginales = [...data.activos]; // Copia para filtros
            
            console.log('🏷️ Códigos generados automáticamente para todos los activos');
            
            // Actualizar contador de activos
            document.getElementById('total-activos').textContent = data.activos.length;
            
            data.activos.forEach((activo, index) => {
                const fila = document.createElement('tr');
                fila.classList.add('fila-swipe');
                
                // Verificar si es duplicado basado en características similares
                const esDuplicado = verificarDuplicado(activo, data.activos, index);
                if (esDuplicado) {
                    fila.classList.add('activo-duplicado');
                }
                
                // Detectar si es móvil - Usar 'ontouchstart' que es más confiable
                const esMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                console.log(`📱 Detectando dispositivo: ontouchstart=${('ontouchstart' in window)}, maxTouchPoints=${navigator.maxTouchPoints}, width=${window.innerWidth}, esMobile=${esMobile}`);
                
                if (esMobile) {
                    // Para móvil: fila que se desliza COMPLETA sin botón
                    fila.innerHTML = `
                        <td style="padding: 0; position: relative;">
                            <div class="fila-deslizable" style="position: relative; background: white; transition: transform 0.2s ease; padding: 15px; border-bottom: 1px solid #e5e7eb;">
                                <div style="margin-bottom: 8px;"><strong>📋 ${activo.codigo}</strong></div>
                                <div style="margin-bottom: 8px; font-size: 16px;">${activo.nombre}${esDuplicado ? ' ⚠️' : ''}</div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; color: #666;">
                                    <div>📍 ${activo.ubicacion}</div>
                                    <div>🏷️ ${activo.marca}</div>
                                    <div>📦 ${activo.modelo}</div>
                                    <div>🔢 ${activo.no_serie}</div>
                                    <div style="grid-column: 1 / -1;">📅 ${activo.fecha_registro}</div>
                                </div>
                            </div>
                        </td>
                        <td style="display: none;"></td>
                        <td style="display: none;"></td>
                        <td style="display: none;"></td>
                        <td style="display: none;"></td>
                        <td style="display: none;"></td>
                        <td style="display: none;"></td>
                        <td style="display: none;"></td>
                    `;
                    
                    // Configurar deslizado DIRECTO de la fila
                    configurarDeslizadoDirecto(fila, activo.id || index, activo.nombre);
                } else {
                    // Estructura tradicional para desktop
                    fila.innerHTML = `
                        <td>${activo.codigo}</td>
                        <td>${activo.nombre}${esDuplicado ? ' ⚠️' : ''}</td>
                        <td>${activo.ubicacion}</td>
                        <td>${activo.marca}</td>
                        <td>${activo.modelo}</td>
                        <td>${activo.no_serie}</td>
                        <td>${activo.fecha_registro}</td>
                        <td>
                            <button class="btn-eliminar" onclick="eliminarActivo(${activo.id || index}, '${activo.nombre.replace(/'/g, "\\'")}')">
                                🗑️ Eliminar
                            </button>
                        </td>
                    `;
                }
                
                tbody.appendChild(fila);
            });
        } else {
            console.log('⚠️ No hay activos para mostrar');
            tbody.innerHTML = '<tr><td colspan="8" class="sin-activos">📦 No hay activos escaneados aún - ¡Comienza escaneando un código QR!</td></tr>';
            activosEscaneados = [];
            activosOriginales = []; // Limpiar también los originales
            
            // Actualizar contador cuando no hay activos
            document.getElementById('total-activos').textContent = '0';
            document.getElementById('total-filtrados').textContent = '';
        }
    })
    .catch(error => {
        console.error('❌ Error cargando activos:', error);
        
        // SIEMPRE limpiar el mensaje de carga en caso de error también
        tbody.innerHTML = '<tr><td colspan="8" class="sin-activos">❌ Error al cargar activos - ' + error.message + '</td></tr>';
        
        // Limpiar arrays en caso de error
        activosEscaneados = [];
        activosOriginales = [];
        
        // Actualizar contador en caso de error
        document.getElementById('total-activos').textContent = '0';
        document.getElementById('total-filtrados').textContent = '';
    });
}

// Función para actualizar la tabla de activos (refrescar después de escanear)
function actualizarTablaActivos() {
    console.log('🔄 Actualizando tabla de activos...');
    cargarActivosEscaneados();
}

// Función para actualizar el contador de activos
function actualizarContadorActivos() {
    console.log('📊 Actualizando contador de activos...');
    const totalElement = document.getElementById('total-activos');
    if (totalElement) {
        totalElement.textContent = activosEscaneados.length;
    }
    
    // También actualizar el contador filtrado si existe
    const filtradosElement = document.getElementById('total-filtrados');
    if (filtradosElement && activosEscaneados.length > 0) {
        filtradosElement.textContent = ` (${activosEscaneados.length} activos)`;
    }
}

// Función para verificar duplicados
function verificarDuplicado(activo, listaActivos, indiceActual) {
    for (let i = 0; i < listaActivos.length; i++) {
        if (i === indiceActual) continue;
        
        const otro = listaActivos[i];
        
        // Verificar similitudes en características principales
        const nombreSimilar = activo.nombre.toLowerCase().trim() === otro.nombre.toLowerCase().trim();
        const ubicacionSimilar = activo.ubicacion.toLowerCase().trim() === otro.ubicacion.toLowerCase().trim();
        const marcaSimilar = activo.marca.toLowerCase().trim() === otro.marca.toLowerCase().trim();
        const modeloSimilar = activo.modelo.toLowerCase().trim() === otro.modelo.toLowerCase().trim();
        
        if (nombreSimilar && ubicacionSimilar && marcaSimilar && modeloSimilar) {
            return true;
        }
    }
    return false;
}

// ============================================
// INTERACCIONES MÓVILES (SWIPE)
// ============================================

// Función para configurar deslizado DIRECTO de la fila (como WhatsApp)
function configurarDeslizadoDirecto(fila, activoId, activoNombre) {
    const filaDeslizable = fila.querySelector('.fila-deslizable');
    
    let inicioX = 0;
    let inicioY = 0;
    let deltaX = 0;
    let estaDeslizando = false;
    let yaEliminado = false;
    
    console.log('🔧 Configurando deslizado DIRECTO para:', activoNombre);
    
    // Inicio del toque
    fila.addEventListener('touchstart', function(e) {
        if (yaEliminado) return;
        
        inicioX = e.touches[0].clientX;
        inicioY = e.touches[0].clientY;
        deltaX = 0;
        estaDeslizando = false;
        
        // Sin transiciones durante el deslizado
        filaDeslizable.style.transition = 'none';
        
        console.log('👆 Inicio toque en fila:', activoNombre);
    }, { passive: true });
    
    // Movimiento del toque
    fila.addEventListener('touchmove', function(e) {
        if (yaEliminado) return;
        
        const actualX = e.touches[0].clientX;
        const actualY = e.touches[0].clientY;
        
        deltaX = inicioX - actualX;
        const deltaY = Math.abs(inicioY - actualY);
        
        // Solo si es más horizontal que vertical
        if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
            e.preventDefault(); // Prevenir scroll
            estaDeslizando = true;
            
            console.log('📱 Deslizando fila:', deltaX);
            
            // Mover TODA la fila hacia la izquierda (deltaX positivo = izquierda)
            if (deltaX > 0) {
                filaDeslizable.style.transform = `translateX(-${deltaX}px)`;
                
                // Cambiar color gradualmente a rojo mientras desliza
                const intensidad = Math.min(deltaX / 150, 1);
                const rojo = Math.floor(220 + (35 * intensidad)); // De 220 a 255
                const otros = Math.floor(240 - (240 * intensidad)); // De 240 a 0
                filaDeslizable.style.backgroundColor = `rgb(${rojo}, ${otros}, ${otros})`;
                
                // Vibrar cuando llegue a cierto punto
                if (deltaX >= 100 && navigator.vibrate) {
                    navigator.vibrate(30);
                }
                
                // Si desliza MUY lejos, eliminar automáticamente
                if (deltaX >= 200 && !yaEliminado) {
                    yaEliminado = true;
                    eliminarFilaDirectamente();
                }
            } else {
                // Si desliza hacia la derecha, no hacer nada
                filaDeslizable.style.transform = 'translateX(0)';
                filaDeslizable.style.backgroundColor = 'white';
            }
        }
    }, { passive: false });
    
    // Fin del toque
    fila.addEventListener('touchend', function(e) {
        if (yaEliminado) return;
        
        console.log('✋ Fin toque, deltaX final:', deltaX);
        
        // Restaurar transición
        filaDeslizable.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
        
        if (estaDeslizando && deltaX >= 80) {
            // ¡ELIMINAR! La fila se deslizó lo suficiente
            yaEliminado = true;
            eliminarFilaDirectamente();
        } else {
            // Regresar la fila a su posición
            filaDeslizable.style.transform = 'translateX(0)';
            filaDeslizable.style.backgroundColor = 'white';
        }
        
        estaDeslizando = false;
    }, { passive: true });
    
    // Función para eliminar la fila directamente
    function eliminarFilaDirectamente() {
        console.log('🗑️ ¡ELIMINANDO FILA DIRECTAMENTE!:', activoNombre);
        
        // Vibración de confirmación
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        // Animación: deslizar completamente fuera de la pantalla
        filaDeslizable.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        filaDeslizable.style.transform = 'translateX(-100vw)'; // Fuera de la pantalla
        filaDeslizable.style.opacity = '0';
        filaDeslizable.style.backgroundColor = '#dc2626';
        
        // Eliminar del servidor después de la animación
        setTimeout(() => {
            eliminarActivo(activoId, activoNombre);
        }, 400);
    }
    
    // También manejar cancelación
    fila.addEventListener('touchcancel', function() {
        if (!yaEliminado) {
            filaDeslizable.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
            filaDeslizable.style.transform = 'translateX(0)';
            filaDeslizable.style.backgroundColor = 'white';
            estaDeslizando = false;
        }
    }, { passive: true });
}

// ============================================
// FUNCIONES DE ELIMINACIÓN
// ============================================

// Función para eliminar activo
function eliminarActivo(id, nombre) {
    // No pedir confirmación porque el deslizado ya es la confirmación
    console.log('🗑️ Eliminando activo:', id, nombre);
    
    const csrftoken = getCookie('csrftoken');
    
    fetchSeguro('/eliminar_activo/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ id: id })
    })
    .then(data => {
        if (!data) return; // Si hay problemas de auth, ya se manejó
        if (data.success) {
            showMessage('✅ Activo "' + nombre + '" eliminado correctamente', 'success');
            cargarActivosEscaneados();
        } else {
            showMessage('❌ Error eliminando activo: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('❌ Error eliminando activo:', error);
        showMessage('❌ Error de conexión', 'error');
    });
}

// Función para eliminar todos los activos
function eliminarTodos() {
    if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar TODOS los activos? Esta acción no se puede deshacer.')) {
        return;
    }
    
    console.log('🗑️ Eliminando todos los activos...');
    showMessage('🗑️ Eliminando todos los activos...', 'warning');
    
    const csrftoken = getCookie('csrftoken');
    
    fetchSeguro('/eliminar_todos_activos/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({})
    })
    .then(data => {
        if (!data) return; // Si hay problemas de auth, ya se manejó
        if (data.success) {
            showMessage(`✅ ${data.message}`, 'success');
            cargarActivosEscaneados();
        } else {
            showMessage(`❌ Error: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('❌ Error eliminando todos los activos:', error);
        showMessage('❌ Error de conexión', 'error');
    });
}

// ============================================
// FUNCIONES DE EXPORTACIÓN
// ============================================

// Función para exportar a Excel
function exportarExcel() {
    console.log('📊 Exportando activos a Excel...');
    showMessage('📊 Generando archivo Excel...', 'success');
    
    // Pequeño delay para mostrar el mensaje antes de abrir la descarga
    setTimeout(() => {
        window.open('/exportar_activos_excel/', '_blank');
    }, 500);
}

// ============================================
// EVENT LISTENERS ADICIONALES
// ============================================

// Manejar cambio de tamaño de ventana para reconfigurar eventos
window.addEventListener('resize', function() {
    // Simplemente reconfigurar layout sin recargar datos
    console.log('📏 Ventana redimensionada');
});

// ============================================
// GESTIÓN AUTOMÁTICA DE SESIONES
// ============================================

// Variables para control de sesión
let tiempoInactividad;
let verificadorSesion;
let tiempoFueraDePagina = 10 * 60 * 1000; // 10 minutos fuera de la página
let usuarioFueraDePagina = false;
let tiempoSalidaPagina = null;

/**
 * Inicializar gestión automática de sesiones
 */
function inicializarGestionSesion() {
    console.log('🔐 Inicializando gestión automática de sesiones...');
    
    // Solicitar permisos de notificación
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('✅ Permisos de notificación concedidos');
            }
        });
    }
    
    // Verificar sesión cada 30 segundos SOLO para mantener conexión
    verificadorSesion = setInterval(verificarSesionActiva, 30000);
    
    // Detectar cuando el usuario sale de la pestaña/aplicación
    document.addEventListener('visibilitychange', manejarCambioVisibilidad);
    
    // Detectar cierre de ventana/pestaña - CERRAR INMEDIATAMENTE
    window.addEventListener('beforeunload', cerrarSesionAutomatico);
    window.addEventListener('unload', cerrarSesionAutomatico);
    
    // Detectar cuando pierde el foco la ventana
    window.addEventListener('blur', manejarPerdidaFoco);
    window.addEventListener('focus', manejarRecuperacionFoco);
    
    // Mensaje de bienvenida
    showMessage('🔐 Sistema de seguridad activado - Sin límite de tiempo activo', 'success');
}

/**
 * Reiniciar temporizador de inactividad (ELIMINADO - No hay límite mientras esté activo)
 */
function reiniciarTemporizadorInactividad() {
    // NO HACER NADA - El usuario puede estar todo el tiempo que quiera mientras esté en la página
    // Solo cerrar sesión si sale de la aplicación
}

/**
 * Manejar pérdida de foco de la ventana (cambio de aplicación)
 */
function manejarPerdidaFoco() {
    console.log('🚪 Usuario salió de la aplicación (perdió foco)');
    usuarioFueraDePagina = true;
    tiempoSalidaPagina = Date.now();
    
    // Iniciar temporizador para cerrar sesión si no regresa
    tiempoInactividad = setTimeout(() => {
        console.log('⏰ Usuario no regresó a la aplicación, cerrando sesión...');
        cerrarSesionPorAusencia();
    }, tiempoFueraDePagina);
    
    // Notificación de que la sesión se cerrará si no regresa
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SISEG - Sesión', {
            body: 'Tu sesión se cerrará en 10 minutos si no regresas a la aplicación.',
            icon: '/static/images/logo.png'
        });
    }
}

/**
 * Manejar recuperación de foco de la ventana (regreso a la aplicación)
 */
function manejarRecuperacionFoco() {
    if (usuarioFueraDePagina) {
        console.log('👋 Usuario regresó a la aplicación');
        usuarioFueraDePagina = false;
        
        // Cancelar el temporizador de cierre
        if (tiempoInactividad) {
            clearTimeout(tiempoInactividad);
            tiempoInactividad = null;
        }
        
        // Verificar cuánto tiempo estuvo fuera
        if (tiempoSalidaPagina) {
            const tiempoFuera = Date.now() - tiempoSalidaPagina;
            const minutosFuera = Math.floor(tiempoFuera / 60000);
            
            if (minutosFuera > 0) {
                showMessage(`👋 Bienvenido de vuelta! Estuviste ${minutosFuera} minutos fuera`, 'success');
            }
            
            tiempoSalidaPagina = null;
        }
        
        // Verificar sesión inmediatamente al regresar
        verificarSesionActiva();
    }
}

/**
 * Verificar si la sesión sigue activa en el servidor
 */
async function verificarSesionActiva() {
    try {
        const response = await fetch('/verificar_sesion/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (!data.autenticado) {
            console.log('🔒 Sesión no válida, redirigiendo al login...');
            limpiarTemporizadores();
            alert('🔒 Tu sesión ha expirado. Serás redirigido al login.');
            window.location.href = '/login/';
        } else {
            // Solo actualizar indicador de estado, NO de tiempo
            actualizarIndicadorSesion();
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
    }
}

/**
 * Actualizar indicador visual de sesión (SIN tiempo límite)
 */
function actualizarIndicadorSesion() {
    const indicador = document.getElementById('sesion-tiempo');
    if (!indicador) return;
    
    if (usuarioFueraDePagina) {
        const tiempoTranscurrido = tiempoSalidaPagina ? Math.floor((Date.now() - tiempoSalidaPagina) / 60000) : 0;
        const tiempoRestante = 10 - tiempoTranscurrido;
        
        if (tiempoRestante > 5) {
            indicador.textContent = `� Fuera: ${tiempoTranscurrido}m (${tiempoRestante}m restantes)`;
            indicador.parentElement.style.background = 'rgba(245, 158, 11, 0.1)';
            indicador.parentElement.style.color = '#d97706';
        } else if (tiempoRestante > 0) {
            indicador.textContent = `⚠️ REGRESA YA: ${tiempoRestante}m`;
            indicador.parentElement.style.background = 'rgba(239, 68, 68, 0.2)';
            indicador.parentElement.style.color = '#dc2626';
        } else {
            indicador.textContent = `🚨 SESIÓN EXPIRANDO`;
            indicador.parentElement.style.background = 'rgba(239, 68, 68, 0.3)';
            indicador.parentElement.style.color = '#dc2626';
        }
    } else {
        indicador.textContent = `� Sesión Activa - Sin límite`;
        indicador.parentElement.style.background = 'rgba(34, 197, 94, 0.1)';
        indicador.parentElement.style.color = '#16a34a';
    }
}

/**
 * Manejar cambio de visibilidad de la pestaña
 */
function manejarCambioVisibilidad() {
    if (document.hidden) {
        console.log('👁️ Usuario salió de la pestaña');
        usuarioFueraDePagina = true;
        tiempoSalidaPagina = Date.now();
        
        // Iniciar temporizador para cerrar sesión si no regresa en 10 minutos
        tiempoInactividad = setTimeout(() => {
            console.log('⏰ Usuario no regresó a la pestaña, cerrando sesión...');
            cerrarSesionPorAusencia();
        }, tiempoFueraDePagina);
        
        // Mostrar notificación de que la sesión se cerrará si no regresa
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('SISEG - Sesión', {
                body: 'Tu sesión se cerrará en 10 minutos si no regresas.',
                icon: '/static/images/logo.png'
            });
        }
    } else {
        console.log('👁️ Usuario regresó a la pestaña');
        usuarioFueraDePagina = false;
        
        // Cancelar el temporizador de cierre
        if (tiempoInactividad) {
            clearTimeout(tiempoInactividad);
            tiempoInactividad = null;
        }
        
        // Mostrar mensaje de bienvenida si estuvo fuera
        if (tiempoSalidaPagina) {
            const tiempoFuera = Date.now() - tiempoSalidaPagina;
            const minutosFuera = Math.floor(tiempoFuera / 60000);
            
            if (minutosFuera > 0) {
                showMessage(`👋 Bienvenido de vuelta! Estuviste ${minutosFuera} minutos fuera`, 'success');
            }
            
            tiempoSalidaPagina = null;
        }
        
        // Verificar sesión inmediatamente al regresar
        verificarSesionActiva();
    }
}

/**
 * Cerrar sesión automáticamente
 */
function cerrarSesionAutomatico() {
    console.log('🚪 Cerrando sesión automáticamente...');
    
    // Usar navigator.sendBeacon para envío confiable
    if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', getCookie('csrftoken'));
        navigator.sendBeacon('/logout_automatico/', formData);
    } else {
        // Fallback para navegadores que no soportan sendBeacon
        fetch('/logout_automatico/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({}),
            keepalive: true
        }).catch(e => console.log('Error cerrando sesión:', e));
    }
}

/**
 * Mostrar alerta de inactividad (ELIMINADO - No aplica más)
 */
function mostrarAlertaInactividad() {
    // Esta función ya no se usa porque no hay límite de tiempo mientras esté activo
}

/**
 * Cerrar sesión por ausencia (nueva función)
 */
function cerrarSesionPorAusencia() {
    console.log('🚪 Cerrando sesión por ausencia prolongada...');
    limpiarTemporizadores();
    
    // Intentar cerrar sesión en el servidor
    cerrarSesionAutomatico();
    
    // Mostrar mensaje y redirigir
    alert('🔒 Tu sesión se cerró porque estuviste fuera de la aplicación por más de 10 minutos.');
    window.location.href = '/login/';
}

/**
 * Mostrar alerta visual en pantalla (SIMPLIFICADO)
 */
function mostrarAlertaVisual(titulo, mensaje, critical = false) {
    // Solo mostrar si el usuario está fuera de la página
    if (!usuarioFueraDePagina) return;
    
    // Remover alerta existente si la hay
    removerAlertaVisual();
    
    const alerta = document.createElement('div');
    alerta.id = 'sesion-alerta-visual';
    alerta.className = `sesion-alerta ${critical ? 'critical' : ''}`;
    alerta.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 16px;">${titulo}</div>
        <div style="font-size: 13px; opacity: 0.9;">${mensaje}</div>
        <div style="font-size: 11px; margin-top: 5px; opacity: 0.7;">Haz clic para regresar</div>
    `;
    
    // Hacer clic para activar la ventana
    alerta.addEventListener('click', function() {
        window.focus();
        removerAlertaVisual();
    });
    
    document.body.appendChild(alerta);
}

/**
 * Remover alerta visual
 */
function removerAlertaVisual() {
    const alerta = document.getElementById('sesion-alerta-visual');
    if (alerta) {
        alerta.remove();
    }
}

/**
 * Cerrar sesión manualmente
 */
function cerrarSesionManual() {
    limpiarTemporizadores();
    alert('🔒 Tu sesión será cerrada por inactividad.');
    window.location.href = '/logout/';
}

/**
 * Limpiar todos los temporizadores
 */
function limpiarTemporizadores() {
    if (tiempoInactividad) {
        clearTimeout(tiempoInactividad);
    }
    if (verificadorSesion) {
        clearInterval(verificadorSesion);
    }
}

// ============================================
// 💰 SISTEMA DE PRECIOS Y CATÁLOGOS
// ============================================

/**
 * Mostrar modal de dashboard de precios
 */
function mostrarDashboardPrecios() {
    const modal = document.getElementById('modal-precios');
    const loading = document.getElementById('loading-precios');
    
    if (!modal) {
        console.error('❌ Modal de precios no encontrado');
        return;
    }
    
    modal.style.display = 'block';
    loading.style.display = 'block';
    
    console.log('💰 Abriendo dashboard de precios...');
    
    // Obtener datos del inventario y generar reporte
    generarReportePrecios();
}

/**
 * Cerrar modal de precios
 */
function cerrarModalPrecios() {
    const modal = document.getElementById('modal-precios');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Generar reporte de precios del inventario
 */
async function generarReportePrecios() {
    const loading = document.getElementById('loading-precios');
    const estadisticas = document.getElementById('estadisticas-generales');
    
    try {
        // Obtener activos actuales
        const activos = await obtenerActivosParaPrecios();
        
        if (activos.length === 0) {
            mostrarNoHayActivos();
            return;
        }
        
        console.log(`🔍 Obteniendo precios para ${activos.length} activos...`);
        
        // Generar reporte usando la API
        const response = await fetch('/api/inventario/reporte/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                activos: activos
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            mostrarDatosReporte(data.data);
            loading.style.display = 'none';
        } else {
            throw new Error(data.error || 'Error generando reporte');
        }
        
    } catch (error) {
        console.error('❌ Error generando reporte de precios:', error);
        loading.style.display = 'none';
        mostrarErrorPrecios(error.message);
    }
}

/**
 * Obtener activos actuales para consulta de precios
 */
async function obtenerActivosParaPrecios() {
    try {
        const response = await fetch('/obtener_activos_escaneados/');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.activos) {
            return data.activos.map(activo => {
                // Parsear datos del QR
                const datosQR = activo.datos_qr.split('|');
                return {
                    id: activo.id,
                    nombre: datosQR[0] || 'Sin nombre',
                    marca: datosQR[3] || 'Sin marca',
                    modelo: datosQR[1] || 'Sin modelo',
                    ubicacion: datosQR[2] || 'Sin ubicación'
                };
            });
        }
        
        return [];
        
    } catch (error) {
        console.error('❌ Error obteniendo activos:', error);
        return [];
    }
}

/**
 * Mostrar datos del reporte en el modal
 */
function mostrarDatosReporte(reporte) {
    // Llenar estadísticas generales
    llenarEstadisticasGenerales(reporte);
    
    // Llenar contenido de pestañas
    llenarContenidoResumen(reporte);
    llenarContenidoDetalle(reporte);
    llenarContenidoMarcas(reporte);
    
    console.log('✅ Reporte de precios mostrado correctamente');
}

/**
 * Llenar estadísticas generales
 */
function llenarEstadisticasGenerales(reporte) {
    const container = document.getElementById('estadisticas-generales');
    
    const estadisticas = [
        {
            titulo: '📊 Total Activos',
            valor: reporte.total_activos,
            descripcion: 'Activos registrados'
        },
        {
            titulo: '💰 Valor Estimado',
            valor: `$${reporte.valor_total_estimado.toLocaleString()} USD`,
            descripcion: 'Valor total del inventario'
        },
        {
            titulo: '📈 Rango de Valor',
            valor: `$${reporte.valor_total_min.toLocaleString()} - $${reporte.valor_total_max.toLocaleString()}`,
            descripcion: 'Rango mínimo-máximo'
        },
        {
            titulo: '📊 Promedio por Activo',
            valor: `$${reporte.resumen_estadisticas.promedio_valor_activo.toLocaleString()} USD`,
            descripcion: 'Valor promedio'
        }
    ];
    
    container.innerHTML = estadisticas.map(stat => `
        <div style="background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 15px; border-radius: 10px; border-left: 4px solid #991b1b;">
            <h4 style="margin: 0 0 5px 0; color: #991b1b; font-size: 0.9em;">${stat.titulo}</h4>
            <div style="font-size: 1.2em; font-weight: bold; color: #374151; margin-bottom: 5px;">${stat.valor}</div>
            <div style="font-size: 0.8em; color: #6b7280;">${stat.descripcion}</div>
        </div>
    `).join('');
}

/**
 * Llenar contenido de resumen
 */
function llenarContenidoResumen(reporte) {
    const graficoValor = document.getElementById('grafico-valor');
    const graficoCategorias = document.getElementById('grafico-categorias');
    
    // Resumen de valores
    graficoValor.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 2em; color: #059669; font-weight: bold; margin-bottom: 10px;">
                $${reporte.valor_total_estimado.toLocaleString()} USD
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <div>
                    <div style="color: #6b7280; font-size: 0.9em;">Mínimo</div>
                    <div style="color: #991b1b; font-weight: bold;">$${reporte.valor_total_min.toLocaleString()}</div>
                </div>
                <div>
                    <div style="color: #6b7280; font-size: 0.9em;">Máximo</div>
                    <div style="color: #059669; font-weight: bold;">$${reporte.valor_total_max.toLocaleString()}</div>
                </div>
            </div>
        </div>
    `;
    
    // Categorías
    const categorias = Object.entries(reporte.activos_por_categoria)
        .sort((a, b) => b[1].valor_total - a[1].valor_total);
    
    graficoCategorias.innerHTML = categorias.map(([categoria, datos]) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <div>
                <div style="font-weight: bold; color: #374151;">${categoria.toUpperCase()}</div>
                <div style="font-size: 0.8em; color: #6b7280;">${datos.cantidad} activos</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: #059669;">$${datos.valor_total.toLocaleString()}</div>
                <div style="font-size: 0.8em; color: #6b7280;">${datos.porcentaje}%</div>
            </div>
        </div>
    `).join('');
}

/**
 * Llenar contenido de detalle
 */
function llenarContenidoDetalle(reporte) {
    const tbody = document.getElementById('body-tabla-detalle');
    
    tbody.innerHTML = reporte.activos_detallados.map(activo => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px;">${activo.nombre}</td>
            <td style="padding: 10px;">${activo.marca}</td>
            <td style="padding: 10px;">${activo.modelo}</td>
            <td style="padding: 10px;">
                <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; color: #374151;">
                    ${activo.tipo.toUpperCase()}
                </span>
            </td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #059669;">
                $${activo.valor_estimado.toLocaleString()}
            </td>
            <td style="padding: 10px; text-align: right; font-size: 0.9em; color: #6b7280;">
                $${activo.valor_min.toLocaleString()} - $${activo.valor_max.toLocaleString()}
            </td>
            <td style="padding: 10px; text-align: center;">
                <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 8px; font-size: 0.8em;">
                    ${activo.fuente}
                </span>
            </td>
        </tr>
    `).join('');
}

/**
 * Llenar contenido de marcas
 */
function llenarContenidoMarcas(reporte) {
    const container = document.getElementById('resumen-marcas');
    
    const marcas = Object.entries(reporte.activos_por_marca)
        .sort((a, b) => b[1].valor_total - a[1].valor_total);
    
    container.innerHTML = marcas.map(([marca, datos]) => `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: #991b1b; font-size: 1.1em;">${marca}</h4>
                <span style="background: #991b1b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">
                    ${datos.cantidad} activos
                </span>
            </div>
            <div style="font-size: 1.3em; font-weight: bold; color: #059669; margin-bottom: 5px;">
                $${datos.valor_total.toLocaleString()} USD
            </div>
            <div style="font-size: 0.9em; color: #6b7280;">
                ${datos.porcentaje}% del inventario total
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;">
                <button onclick="verCatalogoMarca('${marca}')" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8em;">
                    📖 Ver Catálogo
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Cambiar pestaña en el modal de precios
 */
function cambiarPestanaPrecios(pestana) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.contenido-pestana').forEach(content => {
        content.style.display = 'none';
    });
    
    // Resetear estilos de pestañas
    document.querySelectorAll('.pestana-precio').forEach(tab => {
        tab.style.background = '#e5e7eb';
        tab.style.color = '#374151';
    });
    
    // Mostrar contenido seleccionado
    const contenido = document.getElementById(`contenido-${pestana}`);
    if (contenido) {
        contenido.style.display = 'block';
    }
    
    // Activar pestaña seleccionada
    const pestanaElement = document.querySelector(`.pestana-precio[data-tab="${pestana}"]`);
    if (pestanaElement) {
        pestanaElement.style.background = '#991b1b';
        pestanaElement.style.color = 'white';
    }
}

/**
 * Ver catálogo de una marca específica
 */
async function verCatalogoMarca(marca) {
    try {
        const response = await fetch(`/api/catalogo/marca/${encodeURIComponent(marca)}/`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            mostrarModalCatalogo(marca, data.data);
        } else {
            throw new Error(data.error || 'Error obteniendo catálogo');
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo catálogo:', error);
        alert(`Error obteniendo catálogo de ${marca}: ${error.message}`);
    }
}

/**
 * Mostrar modal de catálogo de marca
 */
function mostrarModalCatalogo(marca, catalogo) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; padding: 20px; 
        box-sizing: border-box; overflow-y: auto; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; max-width: 600px; width: 100%; padding: 25px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
                <h2 style="margin: 0; color: #991b1b;">📖 Catálogo: ${catalogo.nombre_completo}</h2>
                <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer;">❌</button>
            </div>
            
            <div style="display: grid; gap: 15px;">
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">🏭 Información General</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                        <div><strong>País de Origen:</strong> ${catalogo.pais_origen}</div>
                        <div><strong>Segmento:</strong> ${catalogo.segmento}</div>
                        <div><strong>Garantía Típica:</strong> ${catalogo.garantia_tipica}</div>
                        <div><strong>Confiabilidad:</strong> ${catalogo.confiabilidad}</div>
                    </div>
                </div>
                
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">⭐ Especialidades</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${catalogo.especialidades.map(esp => `
                            <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 0.8em;">${esp}</span>
                        `).join('')}
                    </div>
                </div>
                
                ${Object.keys(catalogo.series_populares).length > 0 ? `
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">📱 Series Populares</h4>
                    ${Object.entries(catalogo.series_populares).map(([tipo, series]) => `
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #991b1b;">${tipo.toUpperCase()}:</strong>
                            <span style="color: #6b7280;">${series.join(', ')}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${Object.keys(catalogo.rango_precios).length > 0 ? `
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #374151;">💰 Rangos de Precios</h4>
                    ${Object.entries(catalogo.rango_precios).map(([tipo, rango]) => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="font-weight: bold; color: #374151;">${tipo.toUpperCase()}</span>
                            <span style="color: #059669;">$${rango.min.toLocaleString()} - $${rango.max.toLocaleString()} USD</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Actualizar precios de forma masiva
 */
async function actualizarPreciosMasivo() {
    if (!confirm('¿Deseas actualizar los precios de todos los activos? Esto puede tomar unos minutos.')) {
        return;
    }
    
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading-masivo';
    loadingElement.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
                <div style="color: #991b1b; font-size: 1.3em; margin-bottom: 15px;">
                    <span style="animation: spin 1s linear infinite; display: inline-block;">⚙️</span>
                    Actualizando precios...
                </div>
                <div id="progreso-masivo" style="color: #6b7280;">Iniciando...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(loadingElement);
    
    try {
        // Obtener activos
        const activos = await obtenerActivosParaPrecios();
        
        if (activos.length === 0) {
            throw new Error('No hay activos para actualizar');
        }
        
        document.getElementById('progreso-masivo').textContent = `Procesando ${activos.length} activos...`;
        
        // Actualizar precios
        const response = await fetch('/api/actualizar-precios/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                activos: activos
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        document.body.removeChild(loadingElement);
        
        if (data.success) {
            alert(`✅ Actualización completada:\n- ${data.data.total_procesados} activos actualizados\n- ${data.data.total_errores} errores`);
            
            // Recargar dashboard si está abierto
            const modal = document.getElementById('modal-precios');
            if (modal && modal.style.display !== 'none') {
                generarReportePrecios();
            }
        } else {
            throw new Error(data.error || 'Error en actualización masiva');
        }
        
    } catch (error) {
        console.error('❌ Error en actualización masiva:', error);
        document.body.removeChild(loadingElement);
        alert(`Error actualizando precios: ${error.message}`);
    }
}

/**
 * Exportar reporte de precios
 */
function exportarReportePrecios() {
    // Esta función se puede extender para generar un Excel con los datos de precios
    alert('📊 Función de exportación de reporte de precios en desarrollo');
}

/**
 * Actualizar todos los precios (alias para actualizarPreciosMasivo)
 */
function actualizarTodosLosPrecios() {
    actualizarPreciosMasivo();
}

/**
 * Mostrar mensaje cuando no hay activos
 */
function mostrarNoHayActivos() {
    const loading = document.getElementById('loading-precios');
    const estadisticas = document.getElementById('estadisticas-generales');
    
    loading.style.display = 'none';
    
    estadisticas.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
            <div style="font-size: 3em; margin-bottom: 15px;">📦</div>
            <h3 style="color: #374151; margin-bottom: 10px;">No hay activos registrados</h3>
            <p>Escanea algunos códigos QR para comenzar a ver información de precios</p>
        </div>
    `;
}

/**
 * Mostrar error en el modal de precios
 */
function mostrarErrorPrecios(mensaje) {
    const estadisticas = document.getElementById('estadisticas-generales');
    
    estadisticas.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #dc2626;">
            <div style="font-size: 3em; margin-bottom: 15px;">❌</div>
            <h3 style="color: #dc2626; margin-bottom: 10px;">Error obteniendo precios</h3>
            <p style="color: #6b7280;">${mensaje}</p>
            <button onclick="generarReportePrecios()" style="background: #991b1b; color: white; border: none; padding: 10px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer;">
                🔄 Reintentar
            </button>
        </div>
    `;
}

// ============================================
// FUNCIÓN PARA PROCESAR CÓDIGOS QR DETECTADOS
// ============================================

// Función para procesar el código QR detectado con ULTRA PRECISIÓN
async function procesarCodigoQR(codigoQR) {
    try {
        console.log('🔍 Procesando código QR con ULTRA PRECISIÓN:', codigoQR);
        
        // Mostrar feedback visual inmediato
        actualizarEstado('✅ ¡Código QR detectado con ULTRA PRECISIÓN! Procesando...', true);
        
        // VALIDACIÓN ESPECÍFICA PARA QR DE SISEG
        if (codigoQR.includes('SISEG') || codigoQR.startsWith(SISEG_SIGNATURE)) {
            console.log('🔐 QR OFICIAL DE SISEG detectado con máxima precisión');
            return await procesarQRSisegOficial(codigoQR);
        }
        
        // DETECCIÓN INTELIGENTE DE FORMATO
        let datosExtraidos = extraerDatosQRInteligente(codigoQR);
        
        // VALIDACIÓN ANTI-DUPLICADOS ULTRA PRECISA
        const yaExiste = activosEscaneados.some(activo => {
            const tiempoTranscurrido = Date.now() - new Date(activo.fecha).getTime();
            return (activo.codigo === datosExtraidos.codigo && tiempoTranscurrido < 3000) ||
                   (activo.nombre === datosExtraidos.nombre && tiempoTranscurrido < 2000);
        });
        
        if (yaExiste) {
            actualizarEstado('⚠️ Código ya escaneado recientemente - Esperando...', false);
            return;
        }
        
        // GUARDAR CON MÁXIMA PRECISIÓN usando la API correcta del sistema
        const response = await fetch('/registrar_qr/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                codigo_qr: codigoQR,  // El campo correcto que espera el backend
                usuario: 'Escáner Ultra Preciso',
                ubicacion: 'Escáner Web Ultra'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Usar la información del activo que devuelve el backend
            const activoInfo = data.activo;
            
            // Agregar a la lista local con la estructura correcta
            activosEscaneados.unshift({
                id: activoInfo.id,
                codigo: activoInfo.codigo,
                nombre: activoInfo.nombre,
                ubicacion: activoInfo.ubicacion,
                marca: activoInfo.marca,
                modelo: activoInfo.modelo,
                numero_serie: activoInfo.no_serie,
                fecha: activoInfo.fecha_registro || new Date().toISOString(),
                precision: 'Ultra',
                ya_registrado: data.already_registered || false
            });
            
            // Actualizar interfaz
            actualizarTablaActivos();
            actualizarContadorActivos();
            
            if (data.already_registered) {
                actualizarEstado(`⚠️ ${activoInfo.nombre} ya estaba registrado`, true);
            } else {
                actualizarEstado(`✅ ${activoInfo.nombre} guardado con ULTRA PRECISIÓN`, true);
            }
            
            // Feedback mejorado
            mostrarFeedbackUltraPreciso(activoInfo);
            
        } else {
            throw new Error(data.error || 'Error guardando activo');
        }
        
    } catch (error) {
        console.error('❌ Error procesando QR:', error);
        actualizarEstado(`❌ Error: ${error.message}`, false);
    }
}

// Función específica para QR oficiales de SISEG
async function procesarQRSisegOficial(codigoQR) {
    try {
        console.log('🏢 Procesando QR OFICIAL de SISEG...');
        
        // Extraer datos del QR de SISEG
        let datosDecifrados;
        
        if (codigoQR.startsWith(SISEG_SIGNATURE)) {
            // QR encriptado de SISEG
            const codigoEncriptado = codigoQR.replace(SISEG_SIGNATURE, '');
            datosDecifrados = descifrarQRSiseg(codigoEncriptado);
        } else {
            // QR de SISEG con formato estándar
            datosDecifrados = extraerDatosSiseg(codigoQR);
        }
        
        // Validación específica para SISEG
        if (!datosDecifrados.codigo) {
            datosDecifrados.codigo = 'SISEG-' + Date.now();
        }
        
        // Marcar como oficial de SISEG
        datosDecifrados.es_siseg_oficial = true;
        datosDecifrados.nivel_seguridad = 'Alto';
        
        // Guardar con prioridad alta usando la API correcta
        const response = await fetch('/registrar_qr/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                codigo_qr: codigoQR,  // Enviar el código QR original completo
                usuario: 'SISEG Oficial Ultra Preciso',
                ubicacion: 'SISEG Sistema Oficial'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const activoInfo = data.activo;
            
            activosEscaneados.unshift({
                id: activoInfo.id,
                codigo: activoInfo.codigo,
                nombre: activoInfo.nombre,
                ubicacion: activoInfo.ubicacion,
                marca: activoInfo.marca,
                modelo: activoInfo.modelo,
                numero_serie: activoInfo.no_serie,
                fecha: activoInfo.fecha_registro || new Date().toISOString(),
                tipo: 'SISEG_Oficial',
                ya_registrado: data.already_registered || false
            });
            
            actualizarTablaActivos();
            actualizarContadorActivos();
            
            if (data.already_registered) {
                actualizarEstado(`🏢 QR OFICIAL SISEG ya registrado: ${activoInfo.nombre}`, true);
            } else {
                actualizarEstado(`🏢 QR OFICIAL SISEG procesado: ${activoInfo.nombre}`, true);
            }
            
            mostrarFeedbackSisegOficial(activoInfo);
        }
        
    } catch (error) {
        console.error('❌ Error procesando QR oficial SISEG:', error);
        actualizarEstado(`❌ Error en QR SISEG: ${error.message}`, false);
    }
}

// Función para extraer datos de QR con INTELIGENCIA ARTIFICIAL
function extraerDatosQRInteligente(codigoQR) {
    console.log('🧠 Analizando QR con inteligencia artificial...');
    
    // MÉTODO 1: Separadores comunes
    const separadores = ['|', '\n', ';', ',', '\t', ' - ', ' : ', ' / '];
    
    for (const sep of separadores) {
        if (codigoQR.includes(sep)) {
            const partes = codigoQR.split(sep).map(p => p.trim()).filter(p => p.length > 0);
            
            if (partes.length >= 2) {
                return {
                    codigo: partes[0] || 'QR-' + Date.now(),
                    nombre: partes[1] || 'Activo Escaneado',
                    ubicacion: partes[2] || 'Sin ubicación',
                    marca: partes[3] || 'Sin marca',
                    modelo: partes[4] || 'Sin modelo',
                    numero_serie: partes[5] || 'N/A',
                    descripcion: partes[6] || 'Escaneado con Ultra Precisión'
                };
            }
        }
    }
    
    // MÉTODO 2: Análisis por patrones
    if (codigoQR.match(/^[A-Z0-9-]+\s+.+/)) {
        // Formato: CÓDIGO Descripción
        const match = codigoQR.match(/^([A-Z0-9-]+)\s+(.+)/);
        return {
            codigo: match[1],
            nombre: match[2],
            ubicacion: 'Detectado automáticamente',
            marca: 'Sin especificar',
            modelo: 'QR Code',
            numero_serie: 'N/A'
        };
    }
    
    // MÉTODO 3: URL o texto largo
    if (codigoQR.includes('http') || codigoQR.length > 50) {
        return {
            codigo: 'WEB-' + Date.now(),
            nombre: 'Contenido Web/Texto',
            ubicacion: 'Digital',
            marca: 'Web',
            modelo: 'URL/Texto',
            numero_serie: codigoQR.substring(0, 20) + '...'
        };
    }
    
    // MÉTODO 4: Código simple
    return {
        codigo: codigoQR.substring(0, 30) || 'QR-' + Date.now(),
        nombre: 'Activo QR Ultra Preciso',
        ubicacion: 'Escaneado',
        marca: 'Ultra Scan',
        modelo: 'QR Code',
        numero_serie: 'N/A',
        contenido_original: codigoQR
    };
}

// Función para extraer datos específicos de SISEG
function extraerDatosSiseg(codigoQR) {
    // Patrones específicos de SISEG
    const patronesSiseg = [
        /SISEG[_-](\w+)[_-](.+)/i,
        /ACTIVO[_-](\w+)[_-](.+)/i,
        /EQUIPO[_-](\w+)[_-](.+)/i
    ];
    
    for (const patron of patronesSiseg) {
        const match = codigoQR.match(patron);
        if (match) {
            return {
                codigo: match[1],
                nombre: match[2].replace(/[_-]/g, ' '),
                ubicacion: 'SISEG - Sistema Oficial',
                marca: 'SISEG',
                modelo: 'Activo Registrado',
                numero_serie: match[1]
            };
        }
    }
    
    // Si contiene SISEG pero no coincide con patrones, extraer información básica
    if (codigoQR.toLowerCase().includes('siseg')) {
        return {
            codigo: 'SISEG-' + Date.now(),
            nombre: codigoQR.replace(/siseg/gi, 'SISEG').substring(0, 50),
            ubicacion: 'SISEG - Sistema',
            marca: 'SISEG',
            modelo: 'Registro Oficial',
            numero_serie: 'SISEG-' + Date.now().toString().slice(-6)
        };
    }
    
    return null;
}

// Función para descifrar QR encriptado de SISEG
function descifrarQRSiseg(codigoEncriptado) {
    try {
        // Simulación de descifrado (aquí iría el algoritmo real)
        console.log('🔓 Descifrando QR seguro de SISEG...');
        
        // Por ahora, decodificar base64 si es posible
        try {
            const decodificado = atob(codigoEncriptado);
            const partes = decodificado.split('|');
            
            return {
                codigo: partes[0] || 'SISEG-DESC-' + Date.now(),
                nombre: partes[1] || 'Activo SISEG Descifrado',
                ubicacion: partes[2] || 'SISEG - Ubicación Segura',
                marca: partes[3] || 'SISEG',
                modelo: partes[4] || 'Seguro',
                numero_serie: partes[5] || 'ENC-' + Date.now().toString().slice(-6)
            };
        } catch (b64Error) {
            // Si no es base64, tratar como texto normal
            return {
                codigo: 'SISEG-SEC-' + Date.now(),
                nombre: 'Activo SISEG Seguro',
                ubicacion: 'SISEG - Sistema Encriptado',
                marca: 'SISEG',
                modelo: 'Seguridad Alta',
                numero_serie: codigoEncriptado.substring(0, 10)
            };
        }
    } catch (error) {
        console.error('Error descifrando QR SISEG:', error);
        return {
            codigo: 'SISEG-ERR-' + Date.now(),
            nombre: 'QR SISEG (Error Descifrado)',
            ubicacion: 'SISEG - Sistema',
            marca: 'SISEG',
            modelo: 'Error Descifrado',
            numero_serie: 'ERR-' + Date.now().toString().slice(-6)
        };
    }
}

// Función para mostrar feedback ultra preciso
function mostrarFeedbackUltraPreciso(datos) {
    // Crear elemento de feedback especializado
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px 25px;
        border-radius: 12px;
        font-weight: bold;
        z-index: 10000;
        animation: slideInRight 0.4s ease-out;
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 300px;
    `;
    
    feedback.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 1.2em; margin-right: 8px;">🎯</span>
            <strong>ULTRA PRECISIÓN</strong>
        </div>
        <div style="font-size: 0.9em; opacity: 0.9;">
            ${datos.nombre}<br>
            <span style="font-size: 0.8em;">Código: ${datos.codigo}</span>
        </div>
    `;
    
    document.body.appendChild(feedback);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.remove();
        }
    }, 3000);
    
    // Vibración específica para ultra precisión
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 150]);
    }
}

// Función para mostrar feedback específico de SISEG
function mostrarFeedbackSisegOficial(datos) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #991b1b, #dc2626);
        color: white;
        padding: 20px 25px;
        border-radius: 12px;
        font-weight: bold;
        z-index: 10000;
        animation: slideInRight 0.4s ease-out;
        box-shadow: 0 6px 20px rgba(153, 27, 27, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.3);
        max-width: 320px;
    `;
    
    feedback.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 1.2em; margin-right: 8px;">🏢</span>
            <strong>QR OFICIAL SISEG</strong>
        </div>
        <div style="font-size: 0.9em; opacity: 0.9;">
            ${datos.nombre}<br>
            <span style="font-size: 0.8em;">Seguridad: ${datos.nivel_seguridad || 'Alta'}</span>
        </div>
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.remove();
        }
    }, 4000);
    
    // Vibración especial para SISEG
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
    }
}

// Función para extraer datos del código QR
function extraerDatosQR(codigoQR) {
    // Intentar diferentes formatos de QR
    if (codigoQR.includes('|')) {
        // Formato separado por |
        const partes = codigoQR.split('|');
        return {
            codigo: partes[0] || 'QR-' + Date.now(),
            nombre: partes[1] || 'Activo Escaneado',
            ubicacion: partes[2] || 'Sin ubicación',
            marca: partes[3] || 'Sin marca',
            modelo: partes[4] || 'Sin modelo',
            numero_serie: partes[5] || 'N/A'
        };
    } else if (codigoQR.includes('\n')) {
        // Formato separado por saltos de línea
        const lineas = codigoQR.split('\n');
        return {
            codigo: lineas[0] || 'QR-' + Date.now(),
            nombre: lineas[1] || 'Activo Escaneado',
            ubicacion: lineas[2] || 'Sin ubicación',
            marca: lineas[3] || 'Sin marca',
            modelo: lineas[4] || 'Sin modelo',
            numero_serie: lineas[5] || 'N/A'
        };
    } else {
        // Código simple - crear datos básicos
        return {
            codigo: codigoQR,
            nombre: 'Activo QR',
            ubicacion: 'Escaneado',
            marca: 'Sin especificar',
            modelo: 'QR Code',
            numero_serie: 'N/A'
        };
    }
}

// Función para mostrar feedback de éxito
function mostrarFeedbackExito() {
    // Crear elemento de feedback temporal
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    `;
    feedback.textContent = '✅ ¡Activo guardado!';
    
    document.body.appendChild(feedback);
    
    // Remover después de 2 segundos
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.remove();
        }
    }, 2000);
    
    // Vibración en móviles
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Función para obtener cookie CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

// Inicializar gestión de sesión cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si no estamos en la página de login
    if (!window.location.pathname.includes('/login/')) {
        inicializarGestionSesion();
    }
});

// Mensaje final de carga
console.log('✅ JavaScript cargado completamente - SISEG Sistema de Activos con Gestión de Sesiones y APIs de Precios');
console.log('🚀 SISEG - Sistema de escáner QR simplificado cargado exitosamente');
