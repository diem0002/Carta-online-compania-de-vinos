// Service Worker corregido para GitHub Pages
const CACHE_NAME = 'vinos-app-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './assets/logoweb.webp',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  console.log('🟢 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔥 Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
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

self.addEventListener('fetch', (event) => {
  // Para la API de Google Sheets, siempre fetch
  if (event.request.url.includes('google.com/spreadsheets')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para todo lo demás, cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});