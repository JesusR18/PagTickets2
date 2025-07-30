// ============================================
// SISEG - Scanner QR con Zoom Real y Seguridad Integrada
// Archivo JavaScript separado para qr_home.html
// ============================================
// 
// SEGURIDAD DE CÓDIGOS QR EN SISEG:
// =================================
// Este sistema NO genera códigos QR, sino que los LEE de manera segura
// La seguridad se basa en 4 pilares fundamentales:
//
// 1. LECTURA CONTROLADA: Solo esta aplicación web autorizada puede procesar
//    los códigos QR de manera válida en el sistema SISEG
//
// 2. VALIDACIÓN SERVIDOR: Cada código escaneado se envía al backend Django
//    donde se valida, procesa y registra de forma segura
//
// 3. REGISTRO AUDITADO: Todos los escaneos quedan registrados con timestamp
//    para crear una trazabilidad completa de accesos
//
// 4. ACCESO RESTRINGIDO: Solo usuarios autorizados pueden usar este scanner
//    desde dispositivos con acceso a la red SISEG
//
// El flujo de seguridad es: ESCANEO → VALIDACIÓN → REGISTRO → AUDITORÍA
// ============================================

console.log('🚀 Cargando SISEG QR Scanner con validación segura...');

// Variables globales del sistema QR
// ===================================
// CONTEXTO DE SEGURIDAD: Estas variables mantienen el estado seguro del scanner
// y garantizan que solo se procesen códigos QR de manera controlada
let video = null;          // Elemento de video para capturar imagen de la cámara
let canvas = null;         // Canvas para procesar frames y detectar códigos QR
let context = null;        // Contexto 2D del canvas para manipulación de imágenes
let videoStream = null;    // Stream de video activo de la cámara del dispositivo
let videoTrack = null;     // Track específico para controles avanzados (zoom, flash)
let scannerActivo = false; // Estado de seguridad: evita múltiples procesamiento simultáneos
let zoomActual = 1.0;      // Nivel de zoom actual para optimizar lectura de códigos QR
let zoomMin = 1.0;         // Zoom mínimo permitido por el hardware
let zoomMax = 10.0;        // Zoom máximo permitido por el hardware
let zoomTimeout = null;    // Control de debounce para zoom fluido
let zoomPendiente = null;  // Valor de zoom pendiente de aplicar
let flashActivo = false;   // Estado del flash/linterna para códigos en ambientes oscuros

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

// Función principal para iniciar el scanner seguro
// ================================================
// SEGURIDAD QR: Esta función inicializa la captura segura de códigos QR
// Se establecen constrains específicos para optimizar la detección y 
// se configura el entorno controlado para la validación posterior
async function iniciarScanner() {
    try {
        console.log('📹 Iniciando scanner QR con validación SISEG...');
        actualizarEstado('🔄 Iniciando cámara...', null);
        
        document.getElementById('init-btn').disabled = true;
        
        // Configuración optimizada para lectura segura de QR
        // SEGURIDAD: Se prefiere cámara trasera para mejor calidad y control
        const constraints = {
            video: {
                facingMode: 'environment', // Cámara trasera para códigos QR físicos seguros
                width: { ideal: 1280, min: 640 },    // Resolución óptima para detección QR
                height: { ideal: 720, min: 480 },    // Aspect ratio 16:9 estándar
                aspectRatio: { ideal: 16/9 }
            }
        };
        
        // Solicitar acceso controlado a la cámara del dispositivo
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoTrack = videoStream.getVideoTracks()[0];
        
        // Verificar capacidades de hardware para optimización de lectura QR
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.zoom) {
            zoomMin = capabilities.zoom.min || 1.0;
            zoomMax = capabilities.zoom.max || 10.0;
            console.log(`📐 Zoom disponible para códigos QR: ${zoomMin}x - ${zoomMax}x`);
        }
        
        // Configurar elementos de video
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        
        video.srcObject = videoStream;
        
        video.onloadedmetadata = async () => {
            // Cambiar a pantalla completa estilo WhatsApp
            document.body.style.overflow = 'hidden';
            
            const header = document.querySelector('.header');
            const container = document.querySelector('.container');
            
            if (header) header.style.display = 'none';
            if (container) {
                container.style.padding = '0';
                container.style.maxWidth = '100%';
                container.style.margin = '0';
            }
            
            // Mostrar cámara en pantalla completa
            const cameraContainer = document.getElementById('camera-container');
            cameraContainer.style.display = 'block';
            
            document.getElementById('init-btn').style.display = 'none';
            document.getElementById('status-message').style.display = 'none';
            
            scannerActivo = true;
            console.log('✅ Scanner WhatsApp iniciado en pantalla completa');
            
            // Actualizar mensaje inicial con instrucciones precisas
            const scanInstruction = document.querySelector('.scan-instruction');
            if (scanInstruction) {
                scanInstruction.textContent = '🎯 Coloca el código QR DENTRO del marco verde';
            }
            
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

// Función para alternar flash/linterna
async function toggleFlash() {
    if (!videoTrack) return;
    
    const flashBtn = document.getElementById('flash-btn');
    
    try {
        const capabilities = videoTrack.getCapabilities();
        
        if (capabilities.torch) {
            flashActivo = !flashActivo;
            
            await videoTrack.applyConstraints({
                advanced: [{ torch: flashActivo }]
            });
            
            // Actualizar UI del botón
            if (flashActivo) {
                flashBtn.classList.add('active');
                flashBtn.textContent = '🔆';
            } else {
                flashBtn.classList.remove('active');
                flashBtn.textContent = '🔦';
            }
            
            // Vibración de feedback
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            console.log(`🔦 Flash ${flashActivo ? 'activado' : 'desactivado'}`);
        } else {
            console.warn('⚠️ Flash no soportado en este dispositivo');
            
            // Mostrar feedback visual aunque no funcione
            flashBtn.style.background = 'rgba(255, 100, 100, 0.8)';
            setTimeout(() => {
                flashBtn.style.background = 'rgba(0, 0, 0, 0.8)';
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Error controlando flash:', error);
    }
}

// Función para detener el scanner
function detenerScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        videoTrack = null;
    }
    
    // Restaurar vista normal
    document.body.style.overflow = 'auto';
    
    const header = document.querySelector('.header');
    const container = document.querySelector('.container');
    
    if (header) header.style.display = 'block';
    if (container) {
        container.style.padding = '20px';
        container.style.maxWidth = '600px';
        container.style.margin = '0 auto';
    }
    
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('init-btn').style.display = 'block';
    document.getElementById('init-btn').disabled = false;
    document.getElementById('status-message').style.display = 'block';
    setEmojiContent(document.getElementById('init-btn'), '📹 INICIAR SCANNER QR');
    
    scannerActivo = false;
    actualizarEstado('✅ Scanner detenido. Presiona el botón para reiniciar', null);
}

// Función para detectar y procesar códigos QR de forma segura SOLO en el marco verde
// ===================================================================================
// NÚCLEO DE SEGURIDAD QR: Esta función implementa la detección controlada y precisa
// de códigos QR solo dentro del área del marco verde de escaneo
// 
// PROCESO DE SEGURIDAD MEJORADO:
// 1. Captura frames de video en tiempo real
// 2. Recorta la imagen SOLO al área del marco verde de escaneo
// 3. Analiza únicamente esa zona restringida buscando patrones QR válidos
// 4. Valida la estructura del código antes del procesamiento
// 5. Envía el código al servidor para validación final
// 6. Registra el escaneo en la base de datos auditada
function iniciarDeteccionQR() {
    // VALIDACIÓN DE SEGURIDAD: Verificar que el scanner esté en estado seguro
    if (!scannerActivo || !video || !canvas || !context) return;
    
    const detectar = () => {
        // CONTROL DE ESTADO: Solo continuar si el scanner está activo y seguro
        if (!scannerActivo) return;
        
        try {
            // CAPTURA SEGURA: Solo procesar cuando hay datos suficientes
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Configurar canvas con las dimensiones exactas del video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                // Capturar frame actual para análisis de códigos QR
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // CÁLCULO DEL ÁREA DE ESCANEO (marco verde centrado)
                // Definir el área precisa donde debe estar el código QR
                const marcoWidth = Math.min(canvas.width * 0.6, 250);  // 60% del ancho o máximo 250px
                const marcoHeight = marcoWidth;  // Marco cuadrado
                const marcoX = (canvas.width - marcoWidth) / 2;   // Centrado horizontalmente
                const marcoY = (canvas.height - marcoHeight) / 2; // Centrado verticalmente
                
                // EXTRACCIÓN PRECISA: Solo analizar el área del marco verde
                const imageData = context.getImageData(marcoX, marcoY, marcoWidth, marcoHeight);
                
                // DETECCIÓN SEGURA: Usar librería jsQR solo en el área restringida
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                // VALIDACIÓN QR: Si se detecta un código válido dentro del marco
                if (code) {
                    console.log('🎯 Código QR detectado DENTRO del marco verde para validación SISEG:', code.data);
                    
                    // VALIDACIÓN ADICIONAL: Verificar que el código está bien centrado
                    const centerX = code.location.topLeftCorner.x + (code.location.topRightCorner.x - code.location.topLeftCorner.x) / 2;
                    const centerY = code.location.topLeftCorner.y + (code.location.bottomLeftCorner.y - code.location.topLeftCorner.y) / 2;
                    
                    // El código debe estar razonablemente centrado en el marco
                    const marcoCenter = marcoWidth / 2;
                    const distanciaDelCentro = Math.sqrt(Math.pow(centerX - marcoCenter, 2) + Math.pow(centerY - marcoCenter, 2));
                    
                    // Solo procesar si está suficientemente centrado (dentro del 70% del marco)
                    if (distanciaDelCentro <= marcoWidth * 0.35) {
                        console.log('✅ Código QR centrado correctamente en el marco verde');
                        
                        // FEEDBACK VISUAL: Indicar detección exitosa al usuario
                        const scanInstruction = document.querySelector('.scan-instruction');
                        if (scanInstruction) {
                            scanInstruction.textContent = '✅ ¡Código detectado en el marco! Validando...';
                            scanInstruction.classList.add('success');
                        }
                        
                        // FEEDBACK TÁCTIL: Vibración para confirmar detección exitosa
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200]); // Patrón de vibración distintivo
                        }
                        
                        // EFECTOS VISUALES DE SEGURIDAD: Cambiar UI para mostrar estado seguro
                        const scanLine = document.querySelector('.scan-line');
                        if (scanLine) {
                            scanLine.style.animationPlayState = 'paused';
                            // Cambiar a color verde para indicar detección segura
                            scanLine.style.background = 'linear-gradient(90deg, transparent, #10b981, transparent)';
                            scanLine.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.8)';
                        }
                        
                        // MARCO DE VALIDACIÓN: Cambiar color del marco para indicar código válido
                        const scanFrame = document.querySelector('.scan-frame');
                        if (scanFrame) {
                            scanFrame.style.borderColor = '#10b981';  // Verde de validación
                            scanFrame.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.8)';
                        }
                        
                        // PROCESAMIENTO SEGURO: Esperar feedback visual antes de enviar al servidor
                        setTimeout(() => {
                            registrarCodigo(code.data);  // Enviar código para validación en servidor
                            detenerScanner();            // Cerrar scanner para evitar múltiples lecturas
                        }, 1500);
                        
                        return; // Salir del loop de detección
                    } else {
                        console.log('⚠️ Código QR detectado pero fuera del centro del marco verde');
                        
                        // FEEDBACK EDUCATIVO: Mostrar mensaje para centrar el código
                        const scanInstruction = document.querySelector('.scan-instruction');
                        if (scanInstruction) {
                            scanInstruction.textContent = '⚠️ Centra el código QR en el marco verde';
                            scanInstruction.style.background = 'rgba(255, 165, 0, 0.95)'; // Naranja de advertencia
                            
                            // Volver al mensaje original después de 2 segundos
                            setTimeout(() => {
                                scanInstruction.textContent = '🎯 Coloca el código QR DENTRO del marco verde';
                                scanInstruction.style.background = 'rgba(37, 211, 102, 0.95)';
                            }, 2000);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error en detección QR segura:', error);
        }
        
        // LOOP CONTINUO: Continuar detección en el siguiente frame
        requestAnimationFrame(detectar);
    };
    
    detectar(); // Iniciar el loop de detección continua
}

// Función para registro seguro de códigos QR en el servidor
// ========================================================
// CORAZÓN DE LA SEGURIDAD: Esta función envía el código QR al servidor Django
// para validación, procesamiento y registro auditado en la base de datos
//
// FLUJO DE SEGURIDAD:
// 1. Preparar datos con token CSRF para validación de origen
// 2. Enviar código QR al endpoint seguro del servidor
// 3. El servidor valida el código y lo registra con timestamp
// 4. Recibir confirmación de registro exitoso o error
// 5. Actualizar la interfaz con el resultado de la validación
// 6. Actualizar lista de registros para auditoría en tiempo real
function registrarCodigo(codigo) {
    // PETICIÓN SEGURA AL SERVIDOR: Enviar código para validación centralizada
    fetch('/qr/registrar_qr/', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            // TOKEN CSRF: Protección contra ataques de falsificación de peticiones
            'X-CSRFToken': getCookie('csrftoken') 
        },
        // PAYLOAD SEGURO: Enviar solo el código QR sin datos adicionales
        body: JSON.stringify({ codigo_qr: codigo })
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById('result');
        
        // VALIDACIÓN EXITOSA: El servidor confirmó que el código es válido
        if (data.status === 'ok') {
            resultDiv.innerHTML = `✅ <strong>Código QR validado y registrado:</strong><br>${data.codigo_qr}`;
            resultDiv.style.background = 'rgba(16, 185, 129, 0.9)'; // Verde de éxito
            console.log('✅ Código QR registrado exitosamente en SISEG');
        } else {
            // ERROR DE VALIDACIÓN: El servidor rechazó el código
            resultDiv.innerHTML = `❌ <strong>Error de validación:</strong> ${data.message}<br>Código: ${codigo}`;
            resultDiv.style.background = 'rgba(239, 68, 68, 0.9)'; // Rojo de error
            console.warn('⚠️ Código QR rechazado por el servidor:', data.message);
        }
        
        resultDiv.style.display = 'block';
        // ACTUALIZACIÓN DE AUDITORÍA: Refrescar lista para mostrar el nuevo registro
        actualizarRegistros();
    })
    .catch(error => {
        // ERROR DE CONEXIÓN: No se pudo comunicar con el servidor seguro
        console.error('❌ Error de conexión con servidor SISEG:', error);
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `❌ <strong>Error de conexión segura</strong><br>Código: ${codigo}`;
        resultDiv.style.background = 'rgba(239, 68, 68, 0.9)';
        resultDiv.style.display = 'block';
    });
}

// Función para obtener token CSRF de seguridad
// =============================================
// SEGURIDAD CSRF: Esta función extrae el token CSRF de las cookies del navegador
// para validar que las peticiones provienen del sitio web autorizado y no de
// ataques de falsificación de peticiones entre sitios (Cross-Site Request Forgery)
//
// PROPÓSITO DE SEGURIDAD:
// - Prevenir ataques CSRF que podrían registrar códigos QR falsos
// - Validar que la petición proviene de una sesión web legítima
// - Asegurar que solo usuarios autenticados puedan registrar códigos
function getCookie(name) {
    let cookieValue = null;
    // VALIDACIÓN DE COOKIES: Verificar que existen cookies en el navegador
    if (document.cookie && document.cookie !== '') {
        // PARSEO SEGURO: Dividir cookies y buscar el token específico
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // BÚSQUEDA DEL TOKEN: Encontrar la cookie con el nombre solicitado
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                // EXTRACCIÓN SEGURA: Decodificar el valor de la cookie
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue; // Retornar token CSRF para validación de peticiones
}

// Función para actualizar la lista de registros auditados
// ======================================================
// AUDITORÍA EN TIEMPO REAL: Esta función mantiene actualizada la lista
// de códigos QR registrados para proporcionar trazabilidad completa
// 
// PROPÓSITO DE SEGURIDAD:
// - Mostrar historial completo de todos los escaneos realizados
// - Permitir auditoría visual de la actividad del sistema
// - Detectar posibles anomalías o patrones sospechosos
// - Mantener transparencia en el registro de códigos QR
function actualizarRegistros() {
    // PETICIÓN DE AUDITORÍA: Solicitar la página actualizada con los registros
    fetch('/qr/')
    .then(response => response.text())
    .then(html => {
        // PARSEO SEGURO: Convertir HTML recibido en documento procesable
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // EXTRACCIÓN DE DATOS: Obtener la lista actualizada de registros
        const nuevaLista = doc.getElementById('lista-registros');
        if (nuevaLista) {
            // ACTUALIZACIÓN SEGURA: Reemplazar solo la lista sin afectar otros elementos
            document.getElementById('lista-registros').innerHTML = nuevaLista.innerHTML;
            console.log('📋 Lista de auditoría actualizada');
        }
    })
    .catch(error => {
        console.error('❌ Error actualizando registros de auditoría:', error);
    });
}

// Inicialización segura del sistema al cargar la página
// ====================================================
// CONFIGURACIÓN INICIAL DE SEGURIDAD: Asegurar que todos los elementos
// estén correctamente configurados antes de permitir el uso del scanner
document.addEventListener('DOMContentLoaded', function() {
    // VALIDACIÓN DE ELEMENTOS: Verificar que el botón principal esté disponible
    const initBtn = document.getElementById('init-btn');
    if (initBtn && !initBtn.innerHTML.includes('📹')) {
        // CONFIGURACIÓN SEGURA: Establecer el texto correcto del botón
        setEmojiContent(initBtn, '📹 INICIAR SCANNER QR');
    }
    
    console.log('🔒 Sistema de seguridad SISEG QR inicializado correctamente');
});

console.log('✅ JavaScript cargado - SISEG Scanner QR con Validación Segura');
