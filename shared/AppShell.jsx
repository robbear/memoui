import { Component, h } from 'preact'; // jshint ignore:line


export default class AppShell extends Component {

  render(props) {
    //
    // For testing purposes, set minify and/or useSW to false
    //
    const minify = true;
    const useSW = true;
    
    const clientFile = minify ? 'client.min.js' : 'client.js';

    const titleBar =
      props.titleBar ||
      (props.title && `${props.title} - Memoui`) ||
      'Memoui';
      
    const staticPath = `/static/${props.request.app.locals.build}`;


    // Google analytics script
    const analyticsScript = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'UA-1383268-3');`;

    // Conditional polyfill logic taken from webcomponents-loader
    // https://github.com/webcomponents/webcomponentsjs/blob/master/webcomponents-loader.js
    const polyfillLoader = `
      if (!('attachShadow' in Element.prototype && 'getRootNode' in Element.prototype) ||
          (window.ShadyDOM && window.ShadyDOM.force) ||
        (!window.customElements || window.customElements.forcePolyfill)) {

        document.write('<script src="/polyfills/webcomponents-lite.js"><\\/script>');
      }`;
      
    const serviceWorkerScript = useSW ? `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js', {scope: '/'});
        });
      }` : '';
      
    return (
      <html lang="en">
        <head>
          <script async src="https://www.googletagmanager.com/gtag/js?id=UA-1383268-3"></script>
          <script dangerouslySetInnerHTML={{__html: analyticsScript}} charSet="UTF-8"/>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
          <meta name="theme-color" content="#eeeeee"/>
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
          <meta name="description" content="Memoui is an offline-capable scratch pad progressive web application using Elix.org web components."/>
          <title>{titleBar}</title>
          <script dangerouslySetInnerHTML={{__html: polyfillLoader}} charSet="UTF-8"/>
          <link rel="shortcut icon" href={`${staticPath}/images/favicon.ico`}/>
          <link rel="stylesheet" href={`${staticPath}/main.css`}/>
          <link rel="manifest" href={`${staticPath}/manifest.json`} />
          <script src={`${staticPath}/build/${clientFile}`}></script>
        </head>
        <body>
          <noscript>
            This application requires JavaScript in order to run on your
            browser. Please configure your browser to allow JavaScript.
          </noscript>
          <div id="root">
            {props.children}
          </div>
          <script dangerouslySetInnerHTML={{__html: serviceWorkerScript}} charSet="UTF-8"/>
        </body>
      </html>
    );
  }

}
