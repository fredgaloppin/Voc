const CACHE_NAME = "vokabel-trainer-v1-2";
const APP_FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./css/app.css", "./js/vocabulary.js", "./js/app.js", "./icons/icon.svg"
];
self.addEventListener("install", event => {
  const requests = APP_FILES.map(path => new Request(path, { cache: "reload" }));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("vokabel-trainer-") && k !== CACHE_NAME).map(k => caches.delete(k))
  )));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.status === 200 && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match("./index.html"));
  }));
});
