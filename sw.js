/* Money Is a Tool — offline cache. Pages are fetched fresh and fall back to
   the cache when there is no connection, so the calculators keep working
   offline without ever showing a returning visitor a stale copy of the site. */
const CACHE = "moneyisatool-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg"];

/* The book's QR codes point at permanent redirect pages (/budget, /borrow,
   /savings, /tax). Those must always come from the network and are never
   cached, so that changing a redirect's destination takes effect on the very
   next scan instead of after a stale cached copy has been served once. */
const REDIRECT_PAGE = /\/(budget|borrow|savings|tax)\/?(index\.html)?$/;
const isRedirectPage = (req) => REDIRECT_PAGE.test(new URL(req.url).pathname);

/* Pages come from the network first, with the cached copy as the fallback when
   there is no connection. Serving the cache first would show a returning
   visitor the previous version of the site once, before the new one replaced
   it in the background. Static assets below stay cache-first, which is what
   keeps the calculators usable offline. */
const isPage = (req) =>
  req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

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

  const keep = (res) => {
    if (res && res.ok && new URL(e.request.url).origin === location.origin) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy)));
    }
    return res;
  };

  if (isPage(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then(keep)
        .catch(() =>
          caches.match(e.request, { ignoreSearch: true })
            .then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(e.request).then(keep).catch(() => hit);
      return hit || refresh;
    })
  );
});
