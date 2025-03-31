const CACHE_NAME = "gastos-app-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icons/wallet.svg",
  "/icons/income.svg",
  "/icons/expense.svg",
  "/icons/balance.svg",
  "/icons/chart.svg",
  "/icons/add.svg",
  "/icons/delete.svg",
  "/icons/notification.svg",
  "/icons/excel.svg",
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache abierto");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {
  // Ignorar peticiones de extensiones de Chrome
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si la respuesta está en caché, la devolvemos
      if (response) {
        return response;
      }

      // Si no está en caché, hacemos la petición
      return fetch(event.request)
        .then((response) => {
          // Verificar si la respuesta es válida
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          // Guardar en caché
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Si falla la petición, intentamos devolver una página offline
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
