// ともしびの美術館 — 最小構成のサービスワーカー
// 方針: 通常時はネットワーク優先で現行サイトと同一挙動。
// 同一オリジンの静的ファイルだけをキャッシュし、オフライン時のみフォールバックする。
// API（美術館データ・中継）や POST は一切さわらない。
const CACHE = 'tomoshibi-v1';
const STATIC_RE = /\.(?:png|jpe?g|webp|gif|svg|css|js|woff2?|ttf|mp4|webm|json)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部API等は素通し
  if (!STATIC_RE.test(url.pathname)) return;        // HTML等は素通し（常に最新）

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
