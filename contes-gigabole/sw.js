const CACHE_NAME = 'gigabole-reader-shell-v16';
const SHELL = ['./connexion.html', './abonnement.html', './profil.html', './styles.css', './app.js', './manifest.webmanifest', './js/auth.js', './js/profile.js', './js/profile-page.js', './js/stories.js', './js/story-format.js', './js/subscription.js', './js/analytics-config.js', './js/cookie-consent-core.js', './js/cookie-consent.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Les parcours d'inscription et d'activation manipulent des données personnelles ou des
  // jetons Auth : ils restent systématiquement réseau et ne peuvent pas rejoindre le shell.
  if (['/inscription.html', '/activation.html', '/paiement-retour.html'].some((path) => url.pathname.endsWith(path))) return;
  // Les requêtes Supabase, Storage et médias signés ne sont jamais mis en cache.
  if (url.hostname.endsWith('.supabase.co') || url.pathname.includes('/storage/v1/')) return;
  if (url.origin !== self.location.origin) return;
  // Le shell reste disponible hors ligne, mais la version réseau prévaut afin
  // qu'une correction ne reste jamais bloquée derrière un ancien cache PWA.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
