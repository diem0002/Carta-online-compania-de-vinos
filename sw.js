// Service Worker optimizado para GitHub Pages
const CACHE_NAME = 'vinos-app-github-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './assets/logoweb.webp',
  './manifest.json',
  './404.html'
];

self.addEventListener('install', function(event) {
  console.log('🟢 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Cacheando archivos esenciales');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('❌ Error cacheando:', error);
      })
  );
  self.skipWaiting();
});

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
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Excluir la API de Google Sheets y solicitudes externas
  if (event.request.url.includes('google.com') || 
      event.request.url.includes('fonts.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Devuelve el cache o busca en network
        if (response) {
          return response;
        }
        
        return fetch(event.request).catch(function() {
          // Si falla la red y es una ruta de la app, devuelve index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});