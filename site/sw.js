// Service worker: a small script the browser keeps running in the background
// for this site. It sits between the page and the network, so it can hand back
// saved copies of files when the phone is offline.
//
// Strategy: "network first". Always try to get a fresh copy; save it; if the
// network fails, use the last saved copy. Simple, and never shows stale data
// when you're online.

const CACHE = "pool-lanes-v1";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/favicon-32.png",
];

// When first installed, save the app's files so it can open offline.
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();  // start using this version straight away
});

// Delete caches left by older versions of this file.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
