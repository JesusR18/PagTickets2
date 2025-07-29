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
                statusDiv.innerHTML = 'Presiona el botón para iniciar la cámara con zoom de hardware';
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

// Función para iniciar la cámara con zoom
async function iniciarScanner() {
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    const cameraContainer = document.getElementById('camera-container');
    
    try {
        toggleBtn.disabled = true;
        toggleBtn.textContent = '⏳ INICIANDO...';
        actualizarEstado('🚀 Solicitando acceso a la cámara...', null);
        
        // Configuración avanzada para solicitar zoom
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                // Solicitar explícitamente capacidades de zoom
                advanced: [
                    { zoom: { min: 1, max: 10 } },
                    { focusMode: 'continuous' }
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
        
        // Verificar capacidades de zoom
        if (videoTrack.getCapabilities) {
            const capabilities = videoTrack.getCapabilities();
            console.log('📱 Capacidades de la cámara:', capabilities);
            
            if (capabilities.zoom) {
                zoomMin = capabilities.zoom.min || 1;
                zoomMax = capabilities.zoom.max || 10;
                zoomActual = zoomMin;
                
                // Configurar slider
                const zoomRange = document.getElementById('zoom-range');
                zoomRange.min = zoomMin;
                zoomRange.max = zoomMax;
                zoomRange.value = zoomActual;
                zoomRange.step = (zoomMax - zoomMin) / 20;
                
                actualizarEstado(`✅ Cámara iniciada con ZOOM REAL: ${zoomMin}x - ${zoomMax}x`, true);
                
                // Aplicar zoom inicial
                await aplicarZoomReal(zoomActual);
            } else {
                actualizarEstado('⚠️ Cámara iniciada - Zoom no soportado por el dispositivo', false);
            }
        } else {
            actualizarEstado('⚠️ Cámara iniciada - API de zoom no disponible', false);
        }
        
        // Mostrar interfaz de cámara y botón detener
        cameraContainer.style.display = 'block';
        document.getElementById('stop-button-container').style.display = 'block';
        toggleBtn.textContent = '⏸️ SCANNER PAUSADO';
        toggleBtn.disabled = true;
        scannerActivo = true;
        
        // Iniciar detección de QR
        iniciarDeteccionQR();
        
    } catch (error) {
        console.error('❌ Error iniciando cámara:', error);
        actualizarEstado(`❌ Error: ${error.message}`, false);
        toggleBtn.disabled = false;
        toggleBtn.textContent = '📱 INICIAR SCANNER QR';
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

// Función para detener el scanner
function detenerScanner() {
    console.log('⏹️ Deteniendo scanner...');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        videoTrack = null;
    }
    
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('stop-button-container').style.display = 'none';
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    toggleBtn.textContent = '📱 INICIAR SCANNER QR';
    toggleBtn.disabled = false;
    
    scannerActivo = false;
    actualizarEstado('Scanner detenido. Presiona el botón para reiniciar', null);
}

// Función para detectar códigos QR
function iniciarDeteccionQR() {
    if (!scannerActivo || !video || !canvas || !context) return;
    
    const detectar = () => {
        if (!scannerActivo) return;
        
        try {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    console.log('🎯 Código QR detectado:', code.data);
                    registrarCodigo(code.data);
                    
                    // Pausar detección por 3 segundos para evitar registros múltiples
                    scannerActivo = false;
                    setTimeout(() => {
                        if (videoStream) { // Solo reactivar si el stream sigue activo
                            scannerActivo = true;
                            iniciarDeteccionQR();
                        }
                    }, 3000);
                    return;
                }
            }
        } catch (error) {
            console.error('Error en detección QR:', error);
        }
        
        requestAnimationFrame(detectar);
    };
    
    detectar();
}

// ============================================
// SISTEMA DE QR SEGURO SISEG
// ============================================

// Función para encriptar datos específicamente para SISEG
function encriptarParaSISEG(datos) {
    try {
        // Crear timestamp para códigos QR permanentes
        const timestamp = Date.now();
        const expiracion = timestamp + (365 * 24 * 60 * 60 * 1000); // 365 días (1 año) - Prácticamente permanente
        
        // Preparar objeto con datos y metadatos de seguridad
        const payload = {
            data: datos,
            timestamp: timestamp,
            expiracion: expiracion,
            app: 'SISEG',
            version: '1.0',
            permanent: true // Marcar como permanente
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
        
        // Verificar que es de SISEG
        if (payload.app !== 'SISEG') {
            throw new Error('QR no autorizado para SISEG');
        }
        
        // Verificar expiración (solo para códigos no permanentes)
        if (!payload.permanent && Date.now() > payload.expiracion) {
            throw new Error('QR expirado - Genere uno nuevo');
        }
        
        // Para códigos permanentes, solo mostrar advertencia si son muy antiguos (más de 2 años)
        if (payload.permanent && payload.timestamp) {
            const antiguedad = Date.now() - payload.timestamp;
            const dosAnios = 2 * 365 * 24 * 60 * 60 * 1000;
            
            if (antiguedad > dosAnios) {
                console.warn('⚠️ QR muy antiguo pero aún válido (más de 2 años)');
            }
        }
        
        return payload.data;
        
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
            const size = 300;
            canvas.width = size;
            canvas.height = size;
            
            // Crear canvas temporal para generar el QR
            const tempCanvas = document.createElement('canvas');
            
            // Generar QR base en canvas temporal SIN BORDES
            const qrTemp = new QRious({
                element: tempCanvas,
                value: datos,
                size: 200, // Tamaño temporal más pequeño
                background: '#ffffff',
                foreground: '#000000',
                level: 'H',
                padding: 0  // CLAVE: Sin padding para eliminar bordes
            });
            
            const ctx = canvas.getContext('2d');
            
            // Llenar todo el canvas final de blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            
            // CLAVE: Escalar el QR temporal para llenar TODO el canvas final
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, size, size);
            
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
                
                // El QR ya está escalado en el canvas final desde el tempCanvas
                // No necesitamos hacer nada más, ya ocupa todo el espacio
                
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
            
            // Si falla el logo, crear QR simple negro que ocupe TODO el espacio
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 300;
            
            // Crear canvas temporal para el QR
            const tempCanvas = document.createElement('canvas');
            
            const qr = new QRious({
                element: tempCanvas,
                value: datosEncriptados,
                size: 200, // Tamaño temporal
                background: '#ffffff',
                foreground: '#000000',
                level: 'M',
                padding: 0
            });
            
            const ctx = canvas.getContext('2d');
            
            // Llenar de blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 300, 300);
            
            // Escalar QR para ocupar TODO el canvas
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, 300, 300);
            
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
// FUNCIONES DE PROCESAMIENTO DE QR
// ============================================

// Función para registrar código QR
function registrarCodigo(codigo) {
    console.log('📝 Registrando código:', codigo);
    
    // Intentar desencriptar si es un QR seguro de SISEG
    let codigoFinal = codigo;
    
    if (codigo.startsWith(SISEG_SIGNATURE)) {
        console.log('🔐 QR seguro de SISEG detectado, desencriptando...');
        
        const datosDesencriptados = desencriptarDeSISEG(codigo);
        
        if (datosDesencriptados) {
            console.log('✅ QR seguro desencriptado exitosamente');
            codigoFinal = datosDesencriptados;
            
            // Vibración especial para QR seguro exitoso
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 100]);
            }
            
            showMessage('🔓 QR Seguro SISEG verificado', 'success');
        } else {
            console.error('🚫 QR seguro no válido o corrupto');
            showMessage('🚫 QR no válido o corrupto - Solo QR seguros de SISEG permitidos', 'error');
            
            // Vibración de rechazo
            if (navigator.vibrate) {
                navigator.vibrate([500, 200, 500]);
            }
            return; // No procesar QR no válido
        }
    } else {
        // QR normal, mostrar advertencia si no es de SISEG
        console.log('⚠️ QR estándar detectado (no encriptado)');
        showMessage('⚠️ QR estándar - Recomendamos usar QR seguros de SISEG', 'warning');
    }
    
    const csrftoken = getCookie('csrftoken');
    
    fetch('/registrar_qr/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ codigo_qr: codigoFinal })
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Respuesta del servidor:', data);
        
        if (data.success) {
            if (data.already_registered) {
                showMessage(`⚠️ ${data.mensaje}`, 'warning');
            } else {
                showMessage(`✅ ${data.mensaje}`, 'success');
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
            
            // Actualizar contador cuando no hay activos
            document.getElementById('total-activos').textContent = '0';
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
