// Service Worker corregido para Google Sheets
const CACHE_NAME = 'vinos-app-v5';
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
        console.log('📦 Cacheando archivos esenciales');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('⚠️ Error cacheando:', error);
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
  const url = event.request.url;
  
  // EXCLUIR específicamente la API de Google Sheets
  if (url.includes('docs.google.com/spreadsheets') || 
      url.includes('googleapis.com/spreadsheets') ||
      url.includes('/gviz/')) {
    console.log('📊 Excluyendo Google Sheets del cache:', url);
    event.respondWith(fetch(event.request));
    return;
  }
  
  // EXCLUIR otras APIs externas
  if (url.includes('googleapis.com') || url.includes('gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para todo lo demás, usar cache primero
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }
        
        // Si no está en cache, hacer fetch
        return fetch(event.request)
          .then((fetchResponse) => {
            // Opcional: cachear nuevas requests
            if (fetchResponse && fetchResponse.status === 200) {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return fetchResponse;
          })
          .catch((error) => {
            console.log('❌ Fetch failed:', error);
            // Si es una navegación y falla, devolver index.html
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});