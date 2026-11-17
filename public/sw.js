// 轻打卡极速秒开 Service Worker（缓存优先 + 后台静默更新）
const CACHE_NAME = '__CACHE_VERSION__'
const PRECACHE_ASSETS = __PRECACHE_ASSETS__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // 缓存优先：命中本地缓存立刻毫秒级返回，同时后台静默拉取最新版本更新缓存
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      const networkPromise = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            cache.put(event.request, res.clone())
          }
          return res
        })
        .catch(() => cached)

      return cached || networkPromise
    })
  )
})
