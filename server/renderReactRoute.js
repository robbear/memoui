const h = require('preact').h;
const shared = require('../build/server');
const AppShell = shared.AppShell;
const routesToComponentsMap = shared.routes;
const render = require('preact-render-to-string');
const Route = require('route-parser');
const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const readFileAsync = promisify(fs.readFile);


/*
 * Return a promise to render an HTML response for the given Express request.
 *
 * See if that route can be handled by one of our React components and, if so,
 * use the component to render the HTML response. If the request can't be
 * handled, return null.
 *
 */
function renderReactRoute(request) {

  const page = matchRoute(request);
  if (!page) {
    // Route wasn't found.
    return Promise.resolve(null);
  }

  // Construct the properties that will be used to initially instantiated the
  // component. This includes the request object. Also, our pages generally want
  // to have the URL (and, occasionally, base URL) available in fully qualified
  // form. Finally, give the component a means to load files from the rest of
  // the site.
  const baseUrl = `${request.protocol}://${request.get('host')}`;
  
  //
  // Since we need to JSON.stringify the props to pass them as parameters
  // to web components, make sure we trim request so that we have only what
  // we need and that it's not circular
  //
  const req = {
    app: request.app
  };
  
  const initialProps = {
    baseUrl: baseUrl,
    request: req,
    url: `${baseUrl}${request.url}`
  };

  // Instantiate the component for the page.
  const instance = new page(initialProps);

  // Now that the component knows what's being asked of it, evaluate its async
  // properties (if any).
  const promise = instance.asyncProperties || Promise.resolve();
  return promise.then(asyncProps => {

    // Combine the async properties with the initial properties and render.
    const props = Object.assign({}, initialProps, asyncProps);
    const pageContent = instance.render(props);
    
    // Render the shell for the HTML page.
    // The shell needs some properties from the page instance.
    const shellProps = Object.assign({}, initialProps, {
      title: instance.title,
      titleBar: instance.titleBar
    });
    const rendered = render(h(AppShell, shellProps, pageContent));

    // Prepend DOCTYPE processing instruction, which React can't render.
    const html = `<!DOCTYPE html>${rendered}`;
    return html;
  });

}


function readLocalFile(relativePath) {
  const absolutePath = path.join(__dirname, '..', relativePath);
  return readFileAsync(absolutePath, 'utf-8');
}


/*
 * See if we have a route that matches the given request.
 *
 * If found, destructively update the request's params object with the
 * substitutions necessary to make the route match, then return the component
 * that should be used to render that route.
 *
 * If no route matches, return null.
 */
function matchRoute(request) {
  const url = request.url;
  for (let routePath in routesToComponentsMap) {
    const route = new Route(routePath);
    const params = route.match(url);
    if (params) {
      Object.assign(request.params, params);
      const component = routesToComponentsMap[routePath];
      return component;
    }
  }
  return null;
}


module.exports = renderReactRoute;
