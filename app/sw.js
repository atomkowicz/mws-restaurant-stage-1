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
  '/styles/styles.css',
  '/scripts/main.js',
  '/scripts/restaurant_info.js',
  '/scripts/serverHelper.js',
  '/scripts/db.js',
  'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
];

// Images are not put into cache instantly. 
// During first visit on the website
// sw checks if they can be get from the sw cache 'resto-reviews-content-imgs'
// If they are not available they are fetched from the network.
// after fetch sw saves images in cache, see servePhoto function

self.addEventListener('install', function (event) {
  console.log('Service worker installing…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function (event) {
  console.log('Service worker ready');
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
    if (requestUrl.pathname.startsWith('/restaurant.html')) {
      event.respondWith(caches.match('/restaurant.html'));
      return;
    }
    if (requestUrl.pathname === '/css/styles.css') {
      event.respondWith(caches.match('/css/styles.css'));
      return;
    }
    // Special handling for photos
    // Return images from the "restaurants-content-imgs" cache
    // if they're in there. But afterwards, update the entry 
    // in the cache from the network.
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(servePhoto(event.request));
      return;
    }
    if (requestUrl.pathname.startsWith('/js/main.js')) {
      event.respondWith(caches.match('/js/main.js'));
      return;
    }
    if (requestUrl.pathname.startsWith('/js/restaurant_info.js')) {
      event.respondWith(caches.match('/js/restaurant_info.js'));
      return;
    }
    if (requestUrl.pathname.startsWith('/data/restaurants.json')) {
      event.respondWith(caches.match('/data/restaurants.json'));
      return;
    }
    event.respondWith(
      caches.match(event.request).then(function (response) {
        return response || fetch(event.request);
      }).catch(err => console.log(err, event.request))
    );
  }
});


function servePhoto(request) {
  // Return images from the "restaurants-content-imgs" cache
  // if they're in there. But afterwards, update the entry 
  // in the cache from the network.
  var storageUrl = request.url;

  return caches.open(IMG_CACHE_NAME).then(function (cache) {
    return cache.match(storageUrl).then(function (response) {
      if (response) {
        return response;
      }

      return fetch(request).then(function (networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

self.addEventListener('message', function (event) {
  console.log('Skip waiting for install');

  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
