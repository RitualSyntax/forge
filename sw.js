// offline cache - bump V when files change
const V = 'forge-5'
const FILES = ['./','index.html','styles.css','data.js','calc.js','app.js','food.js','train.js','body.js','plan.js','checkin.js','photos.js','health.js',
  'manifest.webmanifest','fonts/redaction50.woff2','fonts/spectral.woff2','fonts/spectral-600.woff2','fonts/plexmono.woff2','fonts/plexmono-600.woff2','icons/icon-192.png','icons/icon-512.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
// own files: network first (skip http cache) so updates land, cache if offline. other sites: leave alone
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url)
  if (u.origin !== location.origin || e.request.method !== 'GET') return
  e.respondWith(
    fetch(new Request(e.request.url, {cache:'no-cache'})).then(r => { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); return r })
      .catch(() => caches.match(e.request, {ignoreSearch:true}))
  )
})
