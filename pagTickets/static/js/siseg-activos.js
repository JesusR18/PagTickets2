/**
 * SISEG - Sistema de Control de Activos
 * JavaScript Principal
 * Fecha: 26 de Julio, 2025
 */

console.log('🚀 Iniciando aplicación SISEG - Sistema de Activos...');

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

// Función para alternar el escáner (iniciar/detener)
function toggleScanner() {
    console.log('🎯 Toggle scanner, estado actual:', scannerActivo);
    
    if (!scannerActivo) {
        iniciarScanner();
    } else {
        detenerScanner();
    }
}

// Función para iniciar la cámara con zoom y configuración de ALTA PRECISIÓN
async function iniciarScanner() {
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    const cameraContainer = document.getElementById('camera-container');
    
    try {
        toggleBtn.disabled = true;
        toggleBtn.textContent = '⏳ INICIANDO...';
        actualizarEstado('🚀 Configurando cámara de alta precisión...', null);
        
        // Configuración AVANZADA para máxima calidad de detección
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920, min: 1280 }, // Resolución más alta
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, min: 15 }, // FPS consistente
                // Configuraciones avanzadas para mejor calidad
                advanced: [
                    { zoom: { min: 1, max: 10 } },
                    { focusMode: 'continuous' }, // Enfoque continuo
                    { exposureMode: 'continuous' }, // Exposición automática
                    { whiteBalanceMode: 'continuous' }, // Balance de blancos automático
                    { torch: false } // Flash apagado por defecto
                ]
            }
        };
        
        // Obtener stream de video con configuración optimizada
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoTrack = videoStream.getVideoTracks()[0];
        
        // Configurar elementos de video
        video = document.getElementById('camera-video');
        canvas = document.getElementById('qr-canvas');
        context = canvas.getContext('2d');
        
        video.srcObject = videoStream;
        
        // Configurar video para máxima calidad
        video.setAttribute('playsinline', true);
        video.setAttribute('autoplay', true);
        video.setAttribute('muted', true);
        
        // Esperar a que el video esté listo
        await new Promise(resolve => {
            video.onloadedmetadata = () => {
                console.log('📹 Video cargado:', video.videoWidth + 'x' + video.videoHeight);
                resolve();
            };
        });
        
        // Configurar capacidades avanzadas de la cámara
        if (videoTrack.getCapabilities) {
            const capabilities = videoTrack.getCapabilities();
            console.log('🎥 Capacidades completas de la cámara:', capabilities);
            
            // Configurar zoom si está disponible
            if (capabilities.zoom) {
                zoomMin = capabilities.zoom.min || 1;
                zoomMax = capabilities.zoom.max || 10;
                zoomActual = Math.min(2, zoomMax); // Iniciar con zoom 2x si es posible
                
                const zoomRange = document.getElementById('zoom-range');
                zoomRange.min = zoomMin;
                zoomRange.max = zoomMax;
                zoomRange.value = zoomActual;
                zoomRange.step = (zoomMax - zoomMin) / 20;
                
                await aplicarZoomReal(zoomActual);
                actualizarEstado(`✅ Cámara HD iniciada - Zoom: ${zoomMin}x a ${zoomMax}x`, true);
            }
            
            // Configurar enfoque si está disponible
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                await videoTrack.applyConstraints({
                    advanced: [{ focusMode: 'continuous' }]
                });
                console.log('🎯 Enfoque continuo activado');
            }
            
            // Configurar exposición automática si está disponible
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
                await videoTrack.applyConstraints({
                    advanced: [{ exposureMode: 'continuous' }]
                });
                console.log('☀️ Exposición automática activada');
            }
        }
        
        // Mostrar interfaz de cámara
        cameraContainer.style.display = 'block';
        document.getElementById('stop-button-container').style.display = 'block';
        toggleBtn.textContent = '⏸️ SCANNER ACTIVO';
        toggleBtn.disabled = true;
        scannerActivo = true;
        
        // Iniciar detección de QR de alta precisión
        iniciarDeteccionQR();
        
        // Configurar indicador visual de detección
        mostrarIndicadorDeteccion();
        
    } catch (error) {
        console.error('❌ Error iniciando cámara HD:', error);
        actualizarEstado(`❌ Error: ${error.message}`, false);
        toggleBtn.disabled = false;
        toggleBtn.textContent = '📱 INICIAR SCANNER QR';
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
            border: 3px solid #10b981;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
            pointer-events: none;
            z-index: 10;
            animation: pulse-scanner 2s infinite;
        `;
        
        // Agregar animación CSS si no existe
        if (!document.getElementById('scanner-styles')) {
            const style = document.createElement('style');
            style.id = 'scanner-styles';
            style.textContent = `
                @keyframes pulse-scanner {
                    0% { 
                        border-color: #10b981; 
                        box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
                    }
                    50% { 
                        border-color: #059669; 
                        box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
                    }
                    100% { 
                        border-color: #10b981; 
                        box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        cameraContainer.appendChild(overlay);
    }
    
    overlay.style.display = 'block';
}

// Función para actualizar indicador visual de detección
function actualizarIndicadorDeteccion(codigoDetectado, intentos) {
    const overlay = document.getElementById('detection-overlay');
    if (!overlay) return;
    
    if (codigoDetectado) {
        // QR detectado - color verde brillante
        overlay.style.borderColor = '#10b981';
        overlay.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.8)';
        overlay.style.animation = 'pulse-scanner-success 1s infinite';
        
        // Agregar animación de éxito si no existe
        if (!document.getElementById('success-animation')) {
            const style = document.createElement('style');
            style.id = 'success-animation';
            style.textContent = `
                @keyframes pulse-scanner-success {
                    0% { 
                        border-color: #10b981; 
                        box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
                        transform: translate(-50%, -50%) scale(1);
                    }
                    50% { 
                        border-color: #059669; 
                        box-shadow: 0 0 40px rgba(16, 185, 129, 1);
                        transform: translate(-50%, -50%) scale(1.05);
                    }
                    100% { 
                        border-color: #10b981; 
                        box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        // Sin detección - cambiar color según intentos
        if (intentos < 30) {
            // Primeros intentos - azul
            overlay.style.borderColor = '#3b82f6';
            overlay.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
        } else if (intentos < 120) {
            // Más intentos - amarillo (precaución)
            overlay.style.borderColor = '#f59e0b';
            overlay.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
        } else {
            // Muchos intentos - rojo (advertencia)
            overlay.style.borderColor = '#ef4444';
            overlay.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        }
        overlay.style.animation = 'pulse-scanner 2s infinite';
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

// Función para detectar códigos QR con MÁXIMA PRECISIÓN
function iniciarDeteccionQR() {
    if (!scannerActivo || !video || !canvas || !context) return;
    
    let intentosConsecutivos = 0;
    let ultimoCodigoDetectado = null;
    let contadorConfirmacion = 0;
    
    const detectar = () => {
        if (!scannerActivo) return;
        
        try {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Configurar canvas con alta resolución
                const scale = 2; // Factor de escala para mejor calidad
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                
                // Configurar contexto para máxima calidad de imagen
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                
                // Dibujar imagen escalada
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // TÉCNICA 1: Detección en imagen original
                let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                let code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert", // Más rápido
                });
                
                // TÉCNICA 2: Si no detecta, intentar con inversión completa
                if (!code) {
                    code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "attemptBoth", // Probar imagen normal e invertida
                    });
                }
                
                // TÉCNICA 3: Si aún no detecta, aplicar filtros de mejora
                if (!code) {
                    // Aplicar filtro de contraste y brillo
                    const imageDataMejorada = mejorarImagenParaQR(imageData);
                    code = jsQR(imageDataMejorada.data, imageDataMejorada.width, imageDataMejorada.height, {
                        inversionAttempts: "attemptBoth",
                    });
                }
                
                // TÉCNICA 4: Detección en área central (más probable)
                if (!code) {
                    const centerSize = Math.min(canvas.width, canvas.height) * 0.8;
                    const centerX = (canvas.width - centerSize) / 2;
                    const centerY = (canvas.height - centerSize) / 2;
                    
                    const centerImageData = context.getImageData(centerX, centerY, centerSize, centerSize);
                    code = jsQR(centerImageData.data, centerImageData.width, centerImageData.height, {
                        inversionAttempts: "attemptBoth",
                    });
                }
                
                // TÉCNICA 5: Múltiples intentos con diferentes configuraciones de jsQR
                if (!code) {
                    // Intentar con diferentes configuraciones de jsQR
                    const configuraciones = [
                        { inversionAttempts: "onlyInvert" },
                        { inversionAttempts: "invertFirst" },
                        { inversionAttempts: "dontInvert" }
                    ];
                    
                    for (const config of configuraciones) {
                        code = jsQR(imageData.data, imageData.width, imageData.height, config);
                        if (code && code.data) {
                            console.log('✅ QR detectado con configuración:', config);
                            break;
                        }
                    }
                }
                
                // TÉCNICA 6: Detección en múltiples escalas
                if (!code) {
                    // Probar con imagen más pequeña (a veces funciona mejor)
                    const smallScale = 0.5;
                    const smallCanvas = document.createElement('canvas');
                    const smallContext = smallCanvas.getContext('2d');
                    
                    smallCanvas.width = canvas.width * smallScale;
                    smallCanvas.height = canvas.height * smallScale;
                    
                    smallContext.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
                    const smallImageData = smallContext.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
                    
                    code = jsQR(smallImageData.data, smallImageData.width, smallImageData.height, {
                        inversionAttempts: "attemptBoth",
                    });
                    
                    if (code) {
                        console.log('✅ QR detectado en escala reducida');
                    }
                }
                
                // Actualizar indicador visual de detección
                actualizarIndicadorDeteccion(!!code, intentosConsecutivos);
                
                if (code && code.data) {
                    console.log('🎯 Código QR detectado (intento ' + intentosConsecutivos + '):', code.data);
                    
                    // VERIFICACIÓN DE CONSISTENCIA: Confirmar el mismo código 2 veces seguidas
                    if (ultimoCodigoDetectado === code.data) {
                        contadorConfirmacion++;
                        
                        if (contadorConfirmacion >= 2) {
                            // Código confirmado, procesar
                            console.log('✅ Código QR CONFIRMADO después de ' + contadorConfirmacion + ' detecciones');
                            
                            // Vibración de éxito
                            if (navigator.vibrate) {
                                navigator.vibrate([100, 50, 100]);
                            }
                            
                            registrarCodigo(code.data);
                            
                            // Reset variables
                            ultimoCodigoDetectado = null;
                            contadorConfirmacion = 0;
                            intentosConsecutivos = 0;
                            
                            // Pausar detección por 3 segundos
                            scannerActivo = false;
                            actualizarEstado('✅ QR procesado exitosamente - Reiniciando en 3s...', true);
                            
                            setTimeout(() => {
                                if (videoStream) {
                                    scannerActivo = true;
                                    actualizarEstado('🔍 Escaneando códigos QR SISEG...', null);
                                    iniciarDeteccionQR();
                                }
                            }, 3000);
                            return;
                        }
                    } else {
                        // Nuevo código detectado
                        ultimoCodigoDetectado = code.data;
                        contadorConfirmacion = 1;
                        console.log('🔄 Nuevo código detectado, esperando confirmación...');
                        
                        // Feedback visual sutil
                        actualizarEstado('🔄 QR detectado, confirmando...', null);
                    }
                } else {
                    // No se detectó código
                    intentosConsecutivos++;
                    
                    // Reset si no hay detección por mucho tiempo
                    if (intentosConsecutivos % 60 === 0) { // Cada 2 segundos aprox
                        ultimoCodigoDetectado = null;
                        contadorConfirmacion = 0;
                        console.log('🔄 Reset detector después de ' + intentosConsecutivos + ' intentos');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error en detección QR:', error);
            intentosConsecutivos++;
        }
        
        // Continuar detección más frecuente para mayor precisión
        requestAnimationFrame(detectar);
    };
    
    console.log('🚀 Iniciando detección QR de ALTA PRECISIÓN...');
    actualizarEstado('🔍 Escaneando códigos QR SISEG con alta precisión...', null);
    detectar();
}

// Función para mejorar imagen antes de detección QR (versión avanzada)
function mejorarImagenParaQR(imageData) {
    console.log('🔧 Aplicando mejoras avanzadas de imagen...');
    
    // PASO 1: Optimización automática según condiciones de luz
    let imagenMejorada = optimizarImagenAutomaticamente(imageData);
    
    // PASO 2: Aplicar filtro Gaussiano para reducir ruido (solo si es necesario)
    imagenMejorada = aplicarFiltroGaussiano(imagenMejorada);
    
    // PASO 3: Umbralización adaptativa mejorada
    const data = imagenMejorada.data;
    const width = imagenMejorada.width;
    const height = imagenMejorada.height;
    const finalData = new Uint8ClampedArray(data);
    
    // Calcular umbral adaptativo por regiones
    const blockSize = 16; // Tamaño de bloque para análisis local
    
    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            // Calcular brillo promedio del bloque local
            let sumaLocal = 0;
            let contadorLocal = 0;
            
            for (let by = y; by < Math.min(y + blockSize, height); by++) {
                for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
                    const pixelIndex = (by * width + bx) * 4;
                    const gray = Math.round(0.299 * data[pixelIndex] + 0.587 * data[pixelIndex + 1] + 0.114 * data[pixelIndex + 2]);
                    sumaLocal += gray;
                    contadorLocal++;
                }
            }
            
            const umbralLocal = sumaLocal / contadorLocal;
            
            // Aplicar umbralización al bloque
            for (let by = y; by < Math.min(y + blockSize, height); by++) {
                for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
                    const pixelIndex = (by * width + bx) * 4;
                    const r = data[pixelIndex];
                    const g = data[pixelIndex + 1];
                    const b = data[pixelIndex + 2];
                    
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    
                    // Umbralización con margen adaptativo
                    const margen = 20; // Margen para evitar pérdida de detalles
                    const valorFinal = gray > (umbralLocal - margen) ? 255 : 0;
                    
                    finalData[pixelIndex] = valorFinal;     // R
                    finalData[pixelIndex + 1] = valorFinal; // G
                    finalData[pixelIndex + 2] = valorFinal; // B
                    // Alpha permanece igual
                }
            }
        }
    }
    
    console.log('✅ Imagen mejorada con técnicas avanzadas');
    return new ImageData(finalData, width, height);
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

// Función para descargar el QR
function descargarQR() {
    if (!qrActual) {
        alert('❌ No hay ningún QR para descargar');
        return;
    }
    
    try {
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.download = `QR_SISEG_${Date.now()}.png`;
        link.href = qrActual.toDataURL();
        
        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('💾 QR descargado exitosamente');
        
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

// Función para filtrar activos en tiempo real
function filtrarActivos() {
    const busqueda = document.getElementById('busqueda-input').value.toLowerCase().trim();
    const filtro = document.getElementById('filtro-select').value;
    
    console.log(`🔍 Filtrando: "${busqueda}" por ${filtro}`);
    
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
        const fila = document.createElement('tr');
        fila.classList.add('fila-swipe');
        
        // Verificar duplicados
        const esDuplicado = verificarDuplicado(activo, activos, index);
        if (esDuplicado) {
            fila.classList.add('activo-duplicado');
        }
        
        const esMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (esMobile) {
            // Vista móvil con resaltado de búsqueda
            const busqueda = document.getElementById('busqueda-input').value.toLowerCase().trim();
            const nombreResaltado = resaltarTexto(activo.nombre, busqueda);
            const ubicacionResaltada = resaltarTexto(activo.ubicacion, busqueda);
            
            fila.innerHTML = `
                <td style="padding: 0; position: relative;">
                    <div class="fila-deslizable" style="position: relative; background: white; transition: transform 0.2s ease; padding: 15px; border-bottom: 1px solid #e5e7eb;">
                        <div style="margin-bottom: 8px;"><strong>📋 ${resaltarTexto(activo.codigo, busqueda)}</strong></div>
                        <div style="margin-bottom: 8px; font-size: 16px;">${nombreResaltado}${esDuplicado ? ' ⚠️' : ''}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; color: #666;">
                            <div>📍 ${ubicacionResaltada}</div>
                            <div>🏷️ ${resaltarTexto(activo.marca, busqueda)}</div>
                            <div>📦 ${resaltarTexto(activo.modelo, busqueda)}</div>
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
            
            configurarDeslizadoDirecto(fila, activo.id || index, activo.nombre);
        } else {
            // Vista desktop
            const busqueda = document.getElementById('busqueda-input').value.toLowerCase().trim();
            fila.innerHTML = `
                <td>${resaltarTexto(activo.codigo, busqueda)}</td>
                <td>${resaltarTexto(activo.nombre, busqueda)}${esDuplicado ? ' ⚠️' : ''}</td>
                <td>${resaltarTexto(activo.ubicacion, busqueda)}</td>
                <td>${resaltarTexto(activo.marca, busqueda)}</td>
                <td>${resaltarTexto(activo.modelo, busqueda)}</td>
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
}

// Función para resaltar texto en las búsquedas
function resaltarTexto(texto, busqueda) {
    if (!busqueda || !texto) return texto;
    
    const regex = new RegExp(`(${busqueda})`, 'gi');
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

// Función para filtros rápidos
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
    
    fetch('/registrar_qr/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ codigo_qr: datosDesencriptados })
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Respuesta del servidor:', data);
        
        if (data.success) {
            if (data.already_registered) {
                showMessage(`⚠️ ${data.mensaje}`, 'warning');
                // Sonido para QR duplicado
                reproducirSonido('duplicado');
            } else {
                showMessage(`✅ ${data.mensaje}`, 'success');
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
            showMessage(`❌ Error: ${data.error}`, 'error');
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
    
    fetch('/obtener_activos_escaneados/')
    .then(response => {
        console.log('📡 Respuesta recibida:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('📋 Datos recibidos:', data);
        const tbody = document.getElementById('tabla-activos-body');
        
        if (data.activos && data.activos.length > 0) {
            console.log(`✅ Mostrando ${data.activos.length} activos`);
            tbody.innerHTML = '';
            activosEscaneados = data.activos;
            activosOriginales = [...data.activos]; // Copia para filtros
            
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
        document.getElementById('tabla-activos-body').innerHTML = 
            '<tr><td colspan="8" class="sin-activos">❌ Error al cargar activos</td></tr>';
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
    
    fetch('/eliminar_activo/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ id: id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage(`✅ Activo "${nombre}" eliminado correctamente`, 'success');
            cargarActivosEscaneados();
        } else {
            showMessage(`❌ Error eliminando activo: ${data.error}`, 'error');
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
    
    fetch('/eliminar_todos_activos/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
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

// Mensaje final de carga
console.log('✅ JavaScript cargado completamente - SISEG Sistema de Activos');
