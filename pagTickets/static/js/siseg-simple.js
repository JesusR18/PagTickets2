/**
 * SISEG - Versión Simple para Testing
 * JavaScript Principal - Sin Template Literals
 */

console.log('🚀 Iniciando aplicación SISEG - Versión Simple...');

// Variables globales básicas
let activosEscaneados = [];
let activosOriginales = [];

// Función de inicialización básica
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 DOM cargado, iniciando aplicación simple...');
    
    // Inicializar reloj
    updateClock();
    
    // Cargar activos
    cargarActivosEscaneados();
    
    // Configurar búsqueda con Enter
    const busquedaInput = document.getElementById('busqueda-input');
    if (busquedaInput) {
        busquedaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filtrarActivos();
                busquedaInput.blur();
            }
        });
    }
    
    console.log('✅ Aplicación inicializada correctamente');
});

// Función para actualizar el reloj
function updateClock() {
    try {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timeString = hours + ':' + minutes + ':' + seconds;
        
        const clockElement = document.getElementById('clock');
        if (clockElement) {
            clockElement.textContent = timeString;
        }
    } catch (error) {
        console.error('Error actualizando reloj:', error);
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

// Función para mostrar mensajes
function showMessage(message, type) {
    console.log('Mensaje: ' + message + ' (Tipo: ' + type + ')');
    
    const statusElement = document.getElementById('scanner-status');
    if (statusElement) {
        statusElement.textContent = message;
        
        if (type === 'success') {
            statusElement.style.backgroundColor = '#dcfce7';
            statusElement.style.color = '#166534';
        } else if (type === 'error') {
            statusElement.style.backgroundColor = '#fee2e2';
            statusElement.style.color = '#dc2626';
        } else {
            statusElement.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            statusElement.style.color = '#991b1b';
        }
    }
}

// Función para cargar activos escaneados
function cargarActivosEscaneados() {
    console.log('📦 Cargando activos escaneados...');
    
    const tbody = document.getElementById('tabla-activos-body');
    if (!tbody) {
        console.error('No se encontró tabla-activos-body');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="8" class="sin-activos loading-text">🔄 Cargando activos...</td></tr>';
    
    fetch('/obtener_activos_escaneados/')
    .then(response => {
        console.log('📡 Respuesta recibida:', response.status);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('📋 Datos recibidos:', data);
        tbody.innerHTML = '';
        
        if (data.activos && data.activos.length > 0) {
            console.log('✅ Mostrando ' + data.activos.length + ' activos');
            
            activosEscaneados = data.activos;
            activosOriginales = data.activos.slice(); // Copia simple
            
            // Actualizar contador
            const totalElement = document.getElementById('total-activos');
            if (totalElement) {
                totalElement.textContent = data.activos.length;
            }
            
            // Mostrar activos de forma simple
            data.activos.forEach((activo, index) => {
                const fila = document.createElement('tr');
                
                fila.innerHTML = 
                    '<td>' + (activo.codigo || 'N/A') + '</td>' +
                    '<td>' + (activo.nombre || 'N/A') + '</td>' +
                    '<td>' + (activo.ubicacion || 'N/A') + '</td>' +
                    '<td>' + (activo.marca || 'N/A') + '</td>' +
                    '<td>' + (activo.modelo || 'N/A') + '</td>' +
                    '<td>' + (activo.no_serie || 'N/A') + '</td>' +
                    '<td>' + (activo.fecha_registro || 'N/A') + '</td>' +
                    '<td><button onclick="eliminarActivo(' + index + ')" class="btn-eliminar">🗑️</button></td>';
                
                tbody.appendChild(fila);
            });
        } else {
            console.log('⚠️ No hay activos para mostrar');
            tbody.innerHTML = '<tr><td colspan="8" class="sin-activos">📦 No hay activos escaneados</td></tr>';
            
            const totalElement = document.getElementById('total-activos');
            if (totalElement) {
                totalElement.textContent = '0';
            }
        }
    })
    .catch(error => {
        console.error('❌ Error cargando activos:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="sin-activos">❌ Error al cargar activos</td></tr>';
    });
}

// Función simple para filtrar activos
function filtrarActivos() {
    const busquedaInput = document.getElementById('busqueda-input');
    const busqueda = busquedaInput ? busquedaInput.value.toLowerCase().trim() : '';
    
    console.log('🔍 Filtrando: "' + busqueda + '"');
    
    let activosFiltrados = activosOriginales;
    
    if (busqueda) {
        activosFiltrados = activosOriginales.filter(function(activo) {
            return (activo.nombre && activo.nombre.toLowerCase().includes(busqueda)) ||
                   (activo.ubicacion && activo.ubicacion.toLowerCase().includes(busqueda)) ||
                   (activo.marca && activo.marca.toLowerCase().includes(busqueda)) ||
                   (activo.modelo && activo.modelo.toLowerCase().includes(busqueda));
        });
    }
    
    // Mostrar resultados filtrados de forma simple
    const tbody = document.getElementById('tabla-activos-body');
    if (tbody) {
        tbody.innerHTML = '';
        
        if (activosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="sin-activos">🔍 No se encontraron activos</td></tr>';
        } else {
            activosFiltrados.forEach((activo, index) => {
                const fila = document.createElement('tr');
                
                fila.innerHTML = 
                    '<td>' + (activo.codigo || 'N/A') + '</td>' +
                    '<td>' + (activo.nombre || 'N/A') + '</td>' +
                    '<td>' + (activo.ubicacion || 'N/A') + '</td>' +
                    '<td>' + (activo.marca || 'N/A') + '</td>' +
                    '<td>' + (activo.modelo || 'N/A') + '</td>' +
                    '<td>' + (activo.no_serie || 'N/A') + '</td>' +
                    '<td>' + (activo.fecha_registro || 'N/A') + '</td>' +
                    '<td><button onclick="eliminarActivo(' + index + ')" class="btn-eliminar">🗑️</button></td>';
                
                tbody.appendChild(fila);
            });
        }
    }
}

// Función dummy para eliminar activo
function eliminarActivo(index) {
    console.log('Eliminando activo:', index);
    alert('Función de eliminar aún no implementada en versión simple');
}

// Función dummy para scanner
function toggleScanner() {
    console.log('Toggle scanner');
    alert('Scanner aún no implementado en versión simple');
}

// Inicializar reloj cada segundo
setInterval(updateClock, 1000);

console.log('✅ JavaScript simple cargado completamente');
