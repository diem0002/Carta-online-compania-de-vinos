// Service Worker para Compañía de Vino
const CACHE_NAME = 'vinos-app-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/assets/logoweb.webp',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap'
];

// Instalación
self.addEventListener('install', function(event) {
  console.log('🟢 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación y limpieza de caches viejos
self.addEventListener('activate', function(event) {
  console.log('🔥 Service Worker activado');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia: Cache First, luego Network
self.addEventListener('fetch', function(event) {
  // Excluir la API de Google Sheets del cache
  if (event.request.url.includes('google.com/spreadsheets')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Devuelve la respuesta cacheada o busca en network
        return response || fetch(event.request);
      }
    )
  );
});