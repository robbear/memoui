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
    // BUGBUG - get an account for memoui.com
    const analyticsScript = `
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
          
            ga('create', 'UA-97553012-1-PLACEHOLDER', 'auto');
            ga('send', 'pageview');`;

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
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
          <title>{titleBar}</title>
          <script dangerouslySetInnerHTML={{__html: polyfillLoader}} charSet="UTF-8"/>
          <link rel="shortcut icon" href={`${staticPath}/images/favicon.ico`}/>
          <link rel="stylesheet" href={`${staticPath}/main.css`}/>
          <link rel="manifest" href={`${staticPath}/manifest.json`} />
          <script src={`${staticPath}/build/${clientFile}`}></script>
        </head>
        <body>
          <div id="root">
            {props.children}
          </div>
          <script dangerouslySetInnerHTML={{__html: serviceWorkerScript}} charSet="UTF-8"/>
          <script dangerouslySetInnerHTML={{__html: analyticsScript}} charSet="UTF-8"/>
        </body>
      </html>
    );
  }

}
