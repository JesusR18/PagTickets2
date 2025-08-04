// Service Worker para SISEG PWA
// Versión del caché - cambiar cuando actualices la app
const CACHE_NAME = 'siseg-v1.0.0';
const OFFLINE_URL = '/offline/';

// Archivos que se cachearán para uso offline
const urlsToCache = [
  '/',
  '/static/css/styles.css',
  '/static/js/siseg-activos.js',
  '/static/images/logo.png',
  '/static/images/siseg-logo.jpg',
  '/login/',
  // Librerías externas críticas
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('🔧 SISEG PWA: Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SISEG PWA: Cacheando archivos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ SISEG PWA: Service Worker instalado exitosamente');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ SISEG PWA: Error instalando Service Worker:', error);
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
          if (cacheName !== CACHE_NAME) {
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

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo
        if (response) {
          return response;
        }

        // Si no está en caché, intentar descargar
        return fetch(event.request).then(response => {
          // Verificar si es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          // Agregar al caché para futuras peticiones
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Si falla la red y es una navegación, mostrar página offline
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Manejar mensajes desde la aplicación
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
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
    // Aquí puedes implementar lógica para enviar datos guardados offline
    const pendingData = await getStoredOfflineData();
    
    for (const data of pendingData) {
      await fetch('/registrar_qr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
    }
    
    // Limpiar datos sincronizados
    await clearStoredOfflineData();
    
    // Notificar a los clientes que los datos se sincronizaron
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DATA_SYNCED',
        message: 'Datos sincronizados exitosamente'
      });
    });
    
  } catch (error) {
    console.error('Error sincronizando datos:', error);
  }
}

// Funciones auxiliares para manejo de datos offline
async function getStoredOfflineData() {
  // Implementar lógica para obtener datos almacenados offline
  return [];
}

async function clearStoredOfflineData() {
  // Implementar lógica para limpiar datos sincronizados
}

// Manejar notificaciones push
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de SISEG',
    icon: '/static/images/logo.png',
    badge: '/static/images/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  event.waitUntil(
    self.registration.showNotification('SISEG - Control de Activos', options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('📱 Click en notificación:', event.notification.tag);
  
  event.notification.close();

  event.waitUntil(
    clients.matchAll().then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('🚀 SISEG PWA Service Worker cargado exitosamente');
