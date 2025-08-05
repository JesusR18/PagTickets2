// Service Worker para SISEG PWA - VERSIÓN COMPLETA OFFLINE
// Versión del caché - cambiar cuando actualices la app
const CACHE_NAME = 'siseg-v2.1.0-offline-production';
const OFFLINE_URL = '/offline/';
const API_CACHE = 'siseg-api-v2.1.0';
const IMAGES_CACHE = 'siseg-images-v2.1.0';

// Detectar si estamos en producción
const isProduction = location.hostname.includes('railway.app') || location.hostname.includes('up.railway.app');
const baseURL = isProduction ? location.origin : '';

// Archivos que se cachearán para uso offline COMPLETO
const urlsToCache = [
  '/',
  '/login/',
  '/static/js/siseg-activos.js',
  '/static/images/logo.png',
  '/static/images/siseg-logo.jpg',
  '/static/manifest.json',
  '/static/sw.js',
  // Páginas importantes para offline
  baseURL + '/',
  baseURL + '/login/',
  // APIs críticas para prefetch
  '/obtener_activos_escaneados/',
  '/verificar_sesion/',
  // Librerías externas críticas - Versiones específicas para cache
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

// Instalar Service Worker - VERSIÓN MÓVIL OFFLINE
self.addEventListener('install', event => {
  console.log('🔧 SISEG PWA: Service Worker instalando para móvil...');
  
  event.waitUntil(
    Promise.all([
      // Cache principal
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 SISEG PWA: Cacheando archivos principales...');
        return cache.addAll(urlsToCache);
      }),
      // Cache de APIs para offline
      caches.open(API_CACHE).then(cache => {
        console.log('💾 SISEG PWA: Preparando cache offline...');
        // Pre-cachear respuestas offline
        return cache.put('/offline-data/activos', new Response(JSON.stringify([])));
      }),
      // Pre-fetch datos si está online
      fetch('/obtener_activos_escaneados/')
        .then(response => response.json())
        .then(data => {
          return caches.open(API_CACHE).then(cache => {
            return cache.put('/offline-data/activos', new Response(JSON.stringify(data)));
          });
        })
        .catch(() => {
          console.log('📱 SISEG PWA: Sin datos iniciales, funcionará offline vacío');
        })
    ]).then(() => {
      console.log('✅ SISEG PWA: Instalación móvil completa - LISTO PARA OFFLINE');
      return self.skipWaiting();
    }).catch(error => {
      console.error('❌ SISEG PWA: Error instalando para móvil:', error);
    })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 SISEG PWA: Service Worker activando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE && cacheName !== IMAGES_CACHE) {
            console.log('🗑️ SISEG PWA: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ SISEG PWA: Service Worker activado');
      return self.clients.claim();
    })
  );
});

// Interceptar peticiones de red - VERSIÓN OFFLINE COMPLETA
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // No manejar peticiones a extensiones del navegador
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // Manejar peticiones POST/API offline
  if (event.request.method !== 'GET') {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }

  // Estrategia Cache First para recursos estáticos
  if (url.pathname.includes('/static/') || url.pathname.includes('/images/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Estrategia StaleWhileRevalidate para páginas HTML (mejor para offline)
  event.respondWith(staleWhileRevalidate(event.request));
});

// Nueva estrategia: Stale While Revalidate (mejor para offline)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Si hay caché, devolverlo inmediatamente
  if (cachedResponse) {
    // Intentar actualizar en segundo plano
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Error de red, pero ya tenemos caché
      console.log('🔄 SISEG PWA: Usando caché, sin conexión para actualizar');
    });
    
    return cachedResponse;
  }
  
  // Si no hay caché, intentar red
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // Sin red y sin caché, mostrar página offline básica
    console.log('❌ SISEG PWA: Sin conexión y sin caché para:', request.url);
    
    // Devolver página principal desde caché si existe
    const mainPage = await cache.match('/');
    if (mainPage) {
      return mainPage;
    }
    
    // Página offline de emergencia
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SISEG - Sin Conexión</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .offline-container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
          .offline-icon { font-size: 60px; margin-bottom: 20px; }
          h1 { color: #991b1b; margin-bottom: 20px; }
          p { color: #666; margin-bottom: 20px; }
          .retry-btn { background: #991b1b; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
          .retry-btn:hover { background: #7f1d1d; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📡</div>
          <h1>SISEG - Sin Conexión</h1>
          <p>No hay conexión a internet, pero SISEG puede funcionar offline.</p>
          <p>Conecta a internet para sincronizar datos.</p>
          <button class="retry-btn" onclick="window.location.reload()">🔄 Reintentar</button>
        </div>
        <script>
          // Recargar automáticamente cuando regrese la conexión
          window.addEventListener('online', () => {
            window.location.reload();
          });
        </script>
      </body>
      </html>
    `, { 
      status: 200, 
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Estrategia Cache First (recursos estáticos)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.log('📱 SISEG PWA: Recurso no disponible offline:', request.url);
    return new Response('Offline', { status: 200 });
  }
}

// Estrategia Network First (páginas)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay caché, devolver página offline
    return cache.match('/');
  }
}

// Manejar peticiones de API offline
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Intentar petición de red primero
    const networkResponse = await fetch(request);
    
    // Si es exitosa, sincronizar datos
    if (networkResponse.ok && url.pathname.includes('/obtener_activos_escaneados/')) {
      const data = await networkResponse.clone().json();
      await saveOfflineData('activos', data);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔄 SISEG PWA: API offline para:', url.pathname);
    
    // Manejar APIs específicas offline
    switch (url.pathname) {
      case '/obtener_activos_escaneados/':
        return handleGetActivos();
      
      case '/registrar_qr/':
        return handleRegistrarQR(request);
      
      case '/eliminar_activo/':
        return handleEliminarActivo(request);
      
      case '/eliminar_todos_activos/':
        return handleEliminarTodos();
      
      case '/verificar_sesion/':
        return handleVerificarSesion();
      
      default:
        return new Response(JSON.stringify({
          success: false,
          message: 'Función no disponible offline'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  }
}

// ============================================
// FUNCIONES OFFLINE ESPECÍFICAS
// ============================================

async function handleGetActivos() {
  const data = await getOfflineData('activos') || [];
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRegistrarQR(request) {
  try {
    const formData = await request.formData();
    const newActivo = {
      id: Date.now(),
      codigo: formData.get('codigo') || '',
      nombre: formData.get('nombre') || '',
      ubicacion: formData.get('ubicacion') || '',
      marca: formData.get('marca') || '',
      modelo: formData.get('modelo') || '',
      numero_serie: formData.get('numero_serie') || '',
      fecha_registro: new Date().toISOString(),
      offline: true
    };
    
    // Guardar en storage offline
    const activos = await getOfflineData('activos') || [];
    activos.push(newActivo);
    await saveOfflineData('activos', activos);
    
    // Agregar a operaciones pendientes
    await addPendingOperation('create', newActivo);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Activo guardado offline - Se sincronizará cuando regrese la conexión'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error guardando offline: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleEliminarActivo(request) {
  try {
    const formData = await request.formData();
    const activoId = formData.get('activo_id');
    
    // Eliminar de storage offline
    const activos = await getOfflineData('activos') || [];
    const nuevosActivos = activos.filter(activo => activo.id != activoId);
    await saveOfflineData('activos', nuevosActivos);
    
    // Agregar a operaciones pendientes
    await addPendingOperation('delete', { id: activoId });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Activo eliminado offline'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error eliminando offline: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleEliminarTodos() {
  try {
    await saveOfflineData('activos', []);
    await addPendingOperation('deleteAll', {});
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Todos los activos eliminados offline'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error eliminando todos offline: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleVerificarSesion() {
  // En modo offline, simular sesión activa para permitir uso de la app
  return new Response(JSON.stringify({
    sesion_activa: true,
    tiempo_restante: 86400, // 24 horas en modo offline
    offline_mode: true,
    usuario: 'Usuario Offline',
    mensaje: 'Funcionando sin conexión'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================
// FUNCIONES DE STORAGE OFFLINE
// ============================================

async function saveOfflineData(key, data) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = new Response(JSON.stringify(data));
    await cache.put(new Request(`/offline-data/${key}`), response);
    console.log('💾 SISEG PWA: Datos guardados offline:', key);
  } catch (error) {
    console.error('❌ SISEG PWA: Error guardando offline:', error);
  }
}

async function getOfflineData(key) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = await cache.match(`/offline-data/${key}`);
    if (response) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('❌ SISEG PWA: Error leyendo offline:', error);
    return null;
  }
}

async function addPendingOperation(type, data) {
  try {
    const pending = await getOfflineData('pendingOperations') || [];
    pending.push({
      type: type,
      data: data,
      timestamp: Date.now()
    });
    await saveOfflineData('pendingOperations', pending);
  } catch (error) {
    console.error('❌ SISEG PWA: Error agregando operación pendiente:', error);
  }
}

// ============================================
// SINCRONIZACIÓN
// ============================================

// Manejar mensajes desde la aplicación (SIMPLIFICADO)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'SYNC_DATA') {
    syncPendingData();
  }
});

// Sincronización en segundo plano (cuando regrese la conexión)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 SISEG PWA: Sincronización en segundo plano');
    event.waitUntil(syncPendingData());
  }
});

// Función para sincronizar datos pendientes
async function syncPendingData() {
  try {
    const pendingOperations = await getOfflineData('pendingOperations') || [];
    
    if (pendingOperations.length === 0) {
      console.log('✅ SISEG PWA: No hay operaciones pendientes');
      return;
    }
    
    console.log('🔄 SISEG PWA: Sincronizando', pendingOperations.length, 'operaciones');
    
    for (const operation of pendingOperations) {
      try {
        await syncOperation(operation);
      } catch (error) {
        console.error('❌ SISEG PWA: Error sincronizando operación:', error);
      }
    }
    
    // Limpiar operaciones completadas
    await saveOfflineData('pendingOperations', []);
    console.log('✅ SISEG PWA: Sincronización completada');
    
  } catch (error) {
    console.error('❌ SISEG PWA: Error en sincronización:', error);
  }
}

async function syncOperation(operation) {
  const { type, data } = operation;
  
  switch (type) {
    case 'create':
      await syncCreateActivo(data);
      break;
    case 'delete':
      await syncDeleteActivo(data.id);
      break;
    case 'deleteAll':
      await syncDeleteAllActivos();
      break;
  }
}

async function syncCreateActivo(activoData) {
  const formData = new FormData();
  Object.keys(activoData).forEach(key => {
    if (key !== 'id' && key !== 'offline') {
      formData.append(key, activoData[key]);
    }
  });
  
  const response = await fetch('/registrar_qr/', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Error sincronizando activo creado');
  }
}

async function syncDeleteActivo(activoId) {
  const formData = new FormData();
  formData.append('activo_id', activoId);
  
  const response = await fetch('/eliminar_activo/', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Error sincronizando activo eliminado');
  }
}

async function syncDeleteAllActivos() {
  const response = await fetch('/eliminar_todos_activos/', {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error('Error sincronizando eliminación masiva');
  }
}

console.log('🚀 SISEG PWA: Service Worker v2.0.0 cargado con funcionalidad offline completa');
