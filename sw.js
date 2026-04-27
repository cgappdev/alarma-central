const CACHE_NAME = 'alarma-lg-v4.6.2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './firebase-config.js',
    './initial-data.js',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js'
];

// Instalar y Cachear recursos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Cache Opened');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activar y Limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Estrategia: Network-first falling back to cache (para asegurar frescura si hay red)
self.addEventListener('fetch', (event) => {
    // Si es una petición a Firebase u otro dominio externo de datos, intentamos red primero.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Opcional: clonar y guardar en cache si es un recurso estático
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
