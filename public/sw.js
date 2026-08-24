const CACHE = 'labofpdf-shell-v1'
const SHELL = ['/', '/tools', '/manifest.webmanifest', '/favicon-32-v2.png', '/logo-google.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('labofpdf-shell-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/release.json') return
  const isDocument = request.mode === 'navigate'
  event.respondWith((isDocument ? fetch(request).then((response) => {
    const copy = response.clone()
    void caches.open(CACHE).then((cache) => cache.put(request, copy))
    return response
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))) : caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone()
      void caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }))))
})
