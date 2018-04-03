var CACHE_NAME = 'resto-reviews-cache-v1';
const IMG_CACHE_NAME = 'resto-reviews-content-imgs';
const allCaches = [
  CACHE_NAME,
  IMG_CACHE_NAME
];
var urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/data/restaurants.json',
  'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
];

self.addEventListener('install', function(event) {
  console.log('V2 installing…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function (event) {
  console.log('V2 now ready to handle fetches!');
  // this part is for future version of service worker
  // delete any caches that starts with 'restaurants' phrase
  // will get rid of 'restaurants-cache-vx'
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName.startsWith('resto-reviews-') &&
            !allCaches.includes(cacheName);
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  var requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/index.html'));
      return;
    }
    if (requestUrl.pathname === '/css/styles.css') {
      event.respondWith(caches.match('/css/styles.css'));
      return;
    }
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(servePhoto(event.request));
      return;
    }
    if (requestUrl.pathname.startsWith('/js/main.js')) {
      event.respondWith(caches.match('/js/main.js'));
      return;
    }
    if (requestUrl.pathname.startsWith('/data/restaurants.json')) {
      event.respondWith(caches.match('/data/restaurants.json'));
      return;
    }
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});

function servePhoto(request) {
  // Return images from the "restaurants-content-imgs" cache
  // if they're in there. But afterwards, go to the network
  // to update the entry in the cache.
  var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');

  return caches.open(IMG_CACHE_NAME).then(function (cache) {
    return cache.match(storageUrl).then(function (response) {
      if (response) return response;

      return fetch(request).then(function (networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

self.addEventListener('message', function (event) {
  console.log('V2 skip waiting for install');

  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
