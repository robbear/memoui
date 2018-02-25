/*
 * Express web server.
 */

const path = require('path');
const express = require('express');
const compression = require('compression');
const app = express();
const port = process.env.PORT || 5000;
const version = require('./version.js');
const logger = require('./logger.js').logger('memoui');

const renderReactRoute = require('./renderReactRoute');

// Log all requests
function logRequest(req, res, next) {
  logger.info({req: req}, 'REQUEST');
  next();
}

app.use(compression());
app.use(logRequest);

//
// Redirect http to https under Heroku
//
app.get('*', (request, response, next) => {
  if (request.headers['x-forwarded-proto'] && request.headers['x-forwarded-proto'] !== 'https') {
    response.redirect(301, `https://${request.hostname}${request.url}`);
  } else {
    next(); // Continue to other routes if we're not redirecting
  }
});

// Headers shared by responses served by Express.
app.use((request, response, next) => {
  response.set({
    // Enable CORS
    // From http://enable-cors.org/server_expressjs.html
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Requested-With'
  });
  next();
});


// Given textual content to return, infer its Content-Type.
function inferContentType(content) {
  if (content.startsWith('<!DOCTYPE html>')) {
    return 'text/html';
  } else if (content.startsWith('<?xml')) {
    return 'text/xml';
  } else if (content.startsWith('{')) {
    return 'application/json';
  } else {
    return 'text/plain';
  }
}

//
// General route handler for pages that can be rendered by React components.
//
app.get('*', (request, response, next) => {
  
  let renderPromise;
  try {
    renderPromise = renderReactRoute(request);
  } catch(exception) {
    // Catch exceptions during creation of the promise.
    logException(exception);
    request.url = '/error';
    next();
    return;
  }

  renderPromise.then(content => {
    if (content) {
      response.set({
        'Content-Type': inferContentType(content),
        'Cache-Control': 'no-cache'
      });
      response.send(content);
    } else {
      // We didn't have a React component for this route.
      next();
    }
  })
  .catch(exception => {
    // Catch exceptions during resolution of the promise.
    logException(exception);
    request.url = '/error';
    next();
  });

});

app.use(
  '/elix',
  express.static(path.join(__dirname, '../node_modules/elix'),
  {
    setHeaders: function(res, path, stat) {
      res.set({'Cache-Control': 'no-cache'});
    }
  })
);

app.use(
  '/polyfills',
  express.static(path.join(__dirname, '../node_modules/@webcomponents/webcomponentsjs'),
  {
    setHeaders: function(res, path, stat) {
      res.set({'Cache-Control': 'no-cache'});
    }
  })
);

// Error handler.
app.get('/error', (request, response, next) => {
  renderReactRoute(request)
  .then(html => {
    if (html) {
      response.set({
        'Content-Type': 'text/html'
      });
      response.status(500);
      response.send(html);
    }
  });
  // Don't catch exceptions.
});

// Log an error message.
function logException(exception) {
  logger.info(`*** Exception: ${exception}`);
}


// Cache the app's version and build for display in the version page
version.getVersionInfo()
.then(versionInfo => {
  // Store version info for use in constructing responses.
  app.locals.build = versionInfo.build;
  app.locals.version = versionInfo.version;
  return versionInfo;
})
.then(versionInfo => {
  // Tell Express to serve up static content.
  // If we're running against public/src on a local test, then set no max-age, 
  // otherwise 365 days
  const logicalPath = `/static/${versionInfo.build}`;
  const filePath = `../public/${versionInfo.build}`;
  const staticCacheTime = versionInfo.build === 'src' ?
          0 :
          1000*60*60*24*365;
  app.use(logicalPath, express.static(path.join(__dirname, filePath), {maxAge: `${staticCacheTime}`}));
})
.then(() => {
  //
  // Start the server
  //
  app.listen(port, () => {
    logger.info(`Server listening on http://localhost:${port}, version ${app.locals.version}, build ${app.locals.build}`);
  });
});
