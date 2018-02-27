// DO NOT MODIFY THE FOLLOWING LINE
const SW_CACHE_VERSION = '0';

const preCachedResources = [];  // [ '/', '/version' ];

/* global URL */
/* global fetch */
/* global caches */

class Logger {
  constructor(showOutput = true) {
    this.showOutput = showOutput;
  }

  log(message, override = false) {
    if (override || this.showOutput) {
      console.log(message);
    }
  }

  dir(message, override = false) {
    if (override || this.showOutput) {
      console.dir(message);
    }
  }
}
let logger = new Logger(false); // Turn log messages off

// This only happens once, when the browser sees this
// version of the ServiceWorker for the first time.
self.addEventListener('install', event => {
  logger.log('SW: Install event in progress', true);

  if (caches === undefined || caches == null) {
    logger.log('Install event: Service Worker API found, but Cache API is not, so bailing', true);
    return;
  }

  event.waitUntil(
    caches.open(SW_CACHE_VERSION)
    .then(cache => {
      return cache.addAll(preCachedResources);
    })
    .then(() => {
      logger.log('SW: precache filled. Install event complete.', true);
    })
  );
});

self.addEventListener('activate', event => {
  logger.log('SW: activate event in progress.', true);

  if (caches === undefined || caches == null) {
    logger.log('Activate event: Service Worker API found, but Cache API is not, so bailing', true);
    return;
  }

  event.waitUntil(
    caches.keys()
    .then(keys => {
      return Promise.all(
        keys.filter(key => {
          // Filter by keys that don't start with the latest version prefix.
          return !key.startsWith(SW_CACHE_VERSION);
        })
        .map(key => {
          // Return a promise that's fulfilled
          // when each outdated cache is deleted.
          logger.log(`SW: deleting cache with key ${key}`);
          return caches.delete(key);
        })
      );
    })
    .then(() => {
      logger.log('SW: activate completed.', true);
    })
  );
});

self.addEventListener('fetch', event => {
  logger.log(`SW: fetch event in progress for ${event.request.url}`);

  function addToCache(request, response) {
    if (response.ok) {
      let copy = response.clone();
      caches.open(SW_CACHE_VERSION).then(cache => {
        cache.put(request, copy);
      });
    }
    return response;
  }

  function fetchFromCache(event) {
    return caches.match(event.request).then(response => {
      if (!response) {
        throw Error(`${event.request.url} not found in cache`);
      }

      return response;
    });
  }

  function offlineResponse(error) {
    logger.log(`SW: fetch request failed in both cache and network: ${error}`);

    // Here we're creating a response programmatically. The first parameter is the
    // response body, and the second one defines the options for the response.
    return new Response('<h1>Service Unavailable</h1>', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    });
  }

  function shouldHandleFetch(event) {
    let request = event.request;
    let url = new URL(request.url);
    let isFromOrigin = url.origin === self.location.origin;
    let isGETRequest = request.method === 'GET';

    return (isFromOrigin && isGETRequest);
  }

  function onFetch(event) {
    let request = event.request;

    event.respondWith(
      fetch(request)
      .then(response => addToCache(request, response))
      .catch(() => fetchFromCache(event))
      .catch((error) => offlineResponse(error))
    );
  }

  if (shouldHandleFetch(event)) {
    onFetch(event);
  }
});

self.addEventListener('message', event => {
  logger.log(`SW: message received:`);
  logger.dir(event);

  if (event === undefined || event == null || event.data === undefined || event.data == null) {
    return;
  }

  switch (event.data.action) {
    case 'GET_VERSION':
      event.ports[0].postMessage(SW_CACHE_VERSION);
      return;

    default:
      return;
  }
});