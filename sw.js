const CACHE_NAME = 'vinos-app-v10'; // Saltamos a la v10 para asegurar limpieza

self.addEventListener('install', (event) => {
    console.log('📦 Instalando nuevo Service Worker...');
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    console.log('🗑️ Limpiando caché viejo...');
    event.waitUntil(
        caches.keys().then((keys) => {
          // Esto borra ABSOLUTAMENTE TODO el caché viejo guardado en los celulares
          return Promise.all(keys.map((key) => caches.delete(key))); 
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Si la petición es para Google Sheets, ignoramos el caché por completo
    if (url.includes('docs.google.com') || url.includes('gviz')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para los demás archivos (CSS, JS, Imágenes), intentamos red primero
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});