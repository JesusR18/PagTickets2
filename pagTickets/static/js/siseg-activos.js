/**
 * SISEG - Sistema de Control de Activos
 * JavaScript Principal
 * Fecha: 26 de Julio, 2025
 */

console.log('🚀 Iniciando aplicación SISEG - Sistema de Activos...');

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

// Variables para el scanner QR con zoom real
let videoStream = null;
let videoTrack = null;
let zoomActual = 1;
let zoomMin = 1;
let zoomMax = 10;
let scannerActivo = false;
let video = null;
let canvas = null;
let context = null;
let activosEscaneados = [];
let zoomTimeout = null; // Para hacer el zoom más fluido

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
        console.warn('⚠️ No se pudo calcular la región de escaneo, usando imagen completa');
        return imageData;
    }
    
    const sourceWidth = imageData.width;
    const sourceHeight = imageData.height;
    const sourceData = imageData.data;
    
    // Coordenadas de la región (redondeadas)
    const x = Math.round(SCAN_REGION.left);
    const y = Math.round(SCAN_REGION.top);
    const width = Math.round(SCAN_REGION.width);
    const height = Math.round(SCAN_REGION.height);
    
    // Crear nueva imagen solo con la región del cuadrado verde
    const regionData = new Uint8ClampedArray(width * height * 4);
    
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const sourceIndex = ((y + row) * sourceWidth + (x + col)) * 4;
            const targetIndex = (row * width + col) * 4;
            
            // Verificar que no estemos fuera de los límites
            if (sourceIndex < sourceData.length - 3 && targetIndex < regionData.length - 3) {
                regionData[targetIndex] = sourceData[sourceIndex];         // R
                regionData[targetIndex + 1] = sourceData[sourceIndex + 1]; // G
                regionData[targetIndex + 2] = sourceData[sourceIndex + 2]; // B
                regionData[targetIndex + 3] = sourceData[sourceIndex + 3]; // A
            }
        }
    }
    
    return new ImageData(regionData, width, height);
}

// Función para alternar el escáner (iniciar/detener)
function toggleScanner() {
    console.log('🎯 Toggle scanner, estado actual:', scannerActivo);
    
    if (!scannerActivo) {
        iniciarScanner();
    } else {
        detenerScanner();
    }
}

// Función para iniciar la cámara OPTIMIZADA (calidad + rendimiento)
async function iniciarScanner() {
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    const cameraContainer = document.getElementById('camera-container');
    
    try {
        toggleBtn.disabled = true;
        toggleBtn.textContent = '⏳ INICIANDO...';
        actualizarEstado('🚀 Configurando cámara optimizada...', null);
        
        // Configuración PREMIUM: Máxima calidad sin trabar
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920, min: 1280 }, // Máxima resolución disponible
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, min: 20 }, // FPS altos para mejor detección
                // Configuraciones avanzadas para calidad premium
                advanced: [
                    { focusMode: 'continuous' }, // Enfoque continuo
                    { exposureMode: 'continuous' }, // Exposición automática
                    { whiteBalanceMode: 'continuous' } // Balance automático
                ]
            }
        };
        
        // Obtener stream de video
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
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
                
                // Mostrar información de la región para debug
                if (intentosConsecutivos === 0) {
                    console.log('🎯 Escaneando solo en región verde:', {
                        region: `${Math.round(SCAN_REGION.width)}x${Math.round(SCAN_REGION.height)}`,
                        total: `${canvas.width}x${canvas.height}`,
                        porcentaje: Math.round((SCAN_REGION.width * SCAN_REGION.height) / (canvas.width * canvas.height) * 100) + '%'
                    });
                }
                
                let code = null;
                
                // =========== FASE 1: DETECCIÓN RÁPIDA (SOLO EN REGIÓN VERDE) ===========
                // Método estándar solo en la región del cuadrado verde
                code = jsQR(regionData.data, regionData.width, regionData.height, {
                    inversionAttempts: "dontInvert"
                });
                
                // Con inversión si no detecta (solo en región verde)
                if (!code) {
                    code = jsQR(regionData.data, regionData.width, regionData.height, {
                        inversionAttempts: "attemptBoth"
                    });
                }
                
                // =========== FASE 2: PRECISIÓN MEDIA (después de 15 intentos) ===========
                if (!code && intentosConsecutivos > 15) {
                    // Activar modo ultra precisión
                    if (!modoUltraPrecision) {
                        modoUltraPrecision = true;
                        console.log('🎯 Activando modo ULTRA PRECISIÓN (solo región verde)');
                    }
                    
                    // Mejora de imagen optimizada SOLO en la región verde
                    const imagenMejorada = mejorarImagenHibrida(regionData);
                    code = jsQR(imagenMejorada.data, imagenMejorada.width, imagenMejorada.height, {
                        inversionAttempts: "attemptBoth"
                    });
                    if (code) console.log('✅ QR detectado con mejora híbrida en región verde');
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
console.log('✅ JavaScript cargado completamente - SISEG Sistema de Activos con Gestión de Sesiones');
