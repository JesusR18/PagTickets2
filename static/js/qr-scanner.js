// ============================================
// SISEG - Scanner QR con Zoom Real
// Archivo JavaScript separado para qr_home.html
// ============================================

console.log('🚀 Cargando SISEG QR Scanner...');

// Variables globales
let video = null;
let canvas = null;
let context = null;
let videoStream = null;
let videoTrack = null;
let scannerActivo = false;
let zoomActual = 1.0;
let zoomMin = 1.0;
let zoomMax = 10.0;
let zoomTimeout = null;
let zoomPendiente = null;

// Función para manejar emojis de forma segura
function setEmojiContent(element, content) {
    if (element) {
        // Usar innerHTML para mejor compatibilidad con emojis
        element.innerHTML = content;
        // Forzar re-renderización si es necesario
        element.style.display = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.display = '';
    }
}

// Función para mostrar mensajes de estado
function actualizarEstado(mensaje, tipo) {
    const statusDiv = document.getElementById('status-message');
    setEmojiContent(statusDiv, mensaje);
    statusDiv.style.display = 'block';
    
    if (tipo === 'error') {
        statusDiv.style.background = 'rgba(239, 68, 68, 0.9)';
        statusDiv.style.color = 'white';
    } else if (tipo === 'success') {
        statusDiv.style.background = 'rgba(16, 185, 129, 0.9)';
        statusDiv.style.color = 'white';
    } else {
        statusDiv.style.background = 'rgba(255, 255, 255, 0.9)';
        statusDiv.style.color = '#991b1b';
    }
}

// Función principal para iniciar el scanner
async function iniciarScanner() {
    try {
        console.log('📹 Iniciando scanner QR...');
        actualizarEstado('🔄 Iniciando cámara...', null);
        
        document.getElementById('init-btn').disabled = true;
        
        // Configuración optimizada para móviles
        const constraints = {
            video: {
                facingMode: 'environment', // Cámara trasera preferida
                width: { ideal: 640 },
                height: { ideal: 480 },
                aspectRatio: { ideal: 4/3 }
            }
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoTrack = videoStream.getVideoTracks()[0];
        
        // Verificar capacidades de zoom
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.zoom) {
            zoomMin = capabilities.zoom.min || 1.0;
            zoomMax = capabilities.zoom.max || 10.0;
            console.log(`📐 Zoom disponible: ${zoomMin}x - ${zoomMax}x`);
        }
        
        // Configurar elementos de video
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        
        video.srcObject = videoStream;
        
        video.onloadedmetadata = async () => {
            document.getElementById('camera-container').style.display = 'block';
            document.getElementById('init-btn').style.display = 'none';
            
            scannerActivo = true;
            actualizarEstado('✅ Cámara iniciada. Enfoca un código QR', 'success');
            
            // Aplicar zoom inicial
            if (capabilities.zoom) {
                await aplicarZoomReal(zoomActual);
            }
            
            iniciarDeteccionQR();
        };
        
    } catch (error) {
        console.error('❌ Error accediendo a la cámara:', error);
        actualizarEstado('❌ Error: No se pudo acceder a la cámara', 'error');
        document.getElementById('init-btn').disabled = false;
    }
}

// Función mejorada para aplicar zoom fluido
async function aplicarZoomReal(nivelZoom) {
    if (!videoTrack) return false;
    
    try {
        const constraints = {
            advanced: [{ 
                zoom: nivelZoom,
                focusMode: 'continuous',
                exposureMode: 'continuous'
            }]
        };
        
        await videoTrack.applyConstraints(constraints);
        
        zoomActual = nivelZoom;
        
        // Actualizar UI de forma eficiente
        requestAnimationFrame(() => {
            const zoomDisplay = document.getElementById('zoom-display-real');
            const zoomRange = document.getElementById('zoom-range');
            
            if (zoomDisplay) setEmojiContent(zoomDisplay, `${nivelZoom.toFixed(1)}x`);
            if (zoomRange) zoomRange.value = nivelZoom;
        });
        
        // Vibración sutil para feedback
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        console.log(`✅ Zoom fluido aplicado: ${nivelZoom}x`);
        return true;
        
    } catch (error) {
        console.error('❌ Error aplicando zoom:', error);
        // Fallback a zoom básico
        try {
            await videoTrack.applyConstraints({ zoom: nivelZoom });
            zoomActual = nivelZoom;
            return true;
        } catch (fallbackError) {
            console.warn('⚠️ Zoom no soportado en este dispositivo');
            return false;
        }
    }
}

// Funciones de control de zoom mejoradas
async function aplicarZoom(direccion) {
    const incremento = 0.3;
    let nuevoZoom;
    
    if (direccion > 0) {
        nuevoZoom = Math.min(zoomActual + incremento, zoomMax);
    } else {
        nuevoZoom = Math.max(zoomActual - incremento, zoomMin);
    }
    
    await aplicarZoomReal(nuevoZoom);
}

// Función de zoom con debounce para slider fluido
async function cambiarZoom(valor) {
    const nuevoZoom = parseFloat(valor);
    zoomPendiente = nuevoZoom;
    
    // Cancelar zoom anterior si existe
    if (zoomTimeout) {
        clearTimeout(zoomTimeout);
    }
    
    // Aplicar zoom inmediatamente para respuesta visual
    requestAnimationFrame(() => {
        const zoomDisplay = document.getElementById('zoom-display-real');
        if (zoomDisplay) setEmojiContent(zoomDisplay, `${nuevoZoom.toFixed(1)}x`);
    });
    
    // Aplicar zoom real con debounce
    zoomTimeout = setTimeout(async () => {
        if (zoomPendiente === nuevoZoom) {
            await aplicarZoomReal(nuevoZoom);
            zoomPendiente = null;
        }
        zoomTimeout = null;
    }, 100);
}

// Función para detener el scanner
function detenerScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        videoTrack = null;
    }
    
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('init-btn').style.display = 'block';
    document.getElementById('init-btn').disabled = false;
    setEmojiContent(document.getElementById('init-btn'), '📹 INICIAR SCANNER QR');
    
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
                    actualizarEstado('✅ ¡Código detectado! Registrando...', 'success');
                    
                    registrarCodigo(code.data);
                    detenerScanner();
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Error en detección:', error);
        }
        
        requestAnimationFrame(detectar);
    };
    
    detectar();
}

// Función para registrar código QR
function registrarCodigo(codigo) {
    fetch('/registrar_qr/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_qr: codigo })
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById('result');
        if (data.success) {
            resultDiv.innerHTML = `✅ <strong>Código registrado:</strong><br>${data.codigo_qr}`;
            resultDiv.style.background = 'rgba(16, 185, 129, 0.9)';
        } else {
            resultDiv.innerHTML = `⚠️ <strong>${data.message}</strong><br>Código: ${codigo}`;
            resultDiv.style.background = 'rgba(245, 158, 11, 0.9)';
        }
        resultDiv.style.display = 'block';
        actualizarRegistros();
    })
    .catch(error => {
        console.error('❌ Error registrando código:', error);
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `❌ <strong>Error de conexión</strong><br>Código: ${codigo}`;
        resultDiv.style.background = 'rgba(239, 68, 68, 0.9)';
        resultDiv.style.display = 'block';
    });
}

// Función para actualizar la lista de registros
function actualizarRegistros() {
    fetch('/qr/')
    .then(response => response.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nuevaLista = doc.getElementById('lista-registros');
        if (nuevaLista) {
            document.getElementById('lista-registros').innerHTML = nuevaLista.innerHTML;
        }
    })
    .catch(error => console.error('❌ Error actualizando registros:', error));
}

// Asegurar que los emojis se mantengan al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const initBtn = document.getElementById('init-btn');
    if (initBtn && !initBtn.innerHTML.includes('📹')) {
        setEmojiContent(initBtn, '📹 INICIAR SCANNER QR');
    }
});

console.log('✅ JavaScript cargado - SISEG Scanner QR');
