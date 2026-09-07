/* Money Is a Tool — offline cache. Cache-first for the app shell so the
   calculators keep working without a connection. */
const CACHE = "moneyisatool-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg"];

/* The book's QR codes point at permanent redirect pages (/budget, /borrow,
   /savings, /tax). Those must always come from the network and are never
   cached, so that changing a redirect's destination takes effect on the very
   next scan instead of after a stale cached copy has been served once. */
const REDIRECT_PAGE = /\/(budget|borrow|savings|tax)\/?(index\.html)?$/;
const isRedirectPage = (req) => REDIRECT_PAGE.test(new URL(req.url).pathname);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (isRedirectPage(e.request)) return; // let the browser fetch it normally, uncached
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res && res.ok && new URL(e.request.url).origin === location.origin) {
            const copy = res.clone();
            e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy)));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
