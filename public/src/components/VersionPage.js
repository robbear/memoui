import ElementBase from 'elix/src/ElementBase.js';
import * as symbols from 'elix/src/symbols.js';
import { merge } from 'elix/src/updates.js';

/* global navigator */
/* global MessageChannel */

class VersionPage extends ElementBase {

  componentDidMount() {
    if (super.componentDidMount) { super.componentDidMount(); }
    
    getServiceWorkerVersion(this);
  }
 
  get defaultState() {
    return Object.assign({}, super.defaultState, {
      build: '',
      version: '',
      serviceWorkerVersion: ''
    });
  }

  // Handle props from the hosting jsx
  get props() {
    return {};
  }
  set props(jsonString) {
    let json = {};
    
    try {
      json = JSON.parse(jsonString);
    }
    catch(error) {}
    
    this.setState({
      build: json.build,
      version: json.version
    });
  }
  
  get serviceWorkerVersion() {
    return this.state.serviceWorkerVersion;
  }
  set serviceWorkerVersion(serviceWorkerVersion) {
    this.setState({serviceWorkerVersion});
  }

  get updates() {
    return merge(super.updates, {
      $: {
        build: {
          innerHTML: `Build: ${this.state.build}`
        },
        version: {
          innerHTML: `Version: ${this.state.version}`
        },
        swVersion: {
          innerHTML: `Service Worker Version: <span>${this.state.serviceWorkerVersion}</span>`
        }
      }
    });
  }
  
  get [symbols.template]() {
    return `
      <style>
        a {
          text-decoration: none;
          color: #888;
        }
        #container {
          margin-top: 40px;
          text-align: center;
        }
        #link {
          margin-top: 40px;
        }
      </style>
      <div id="container">
        <h3>Memoui</h3>
        <div id="build"></div>
        <div id="version"></div>
        <div id="swVersion"></div>
        <div id="link">
          <a href="/">Back</a>
        </div>
      </div>
    `;
  }
}

function getServiceWorkerVersion(elem) {
  if (!('serviceWorker' in navigator)) {
    return elem.serviceWorkerVersion = '';
  }
  
  let messageChannel = new MessageChannel();
  messageChannel.port1.onmessage = function(event) {
    var versionString = event.data;
    if (versionString.indexOf('v') === 0) {
      versionString = versionString.substring(1);
    }
    
    elem.serviceWorkerVersion = versionString;
  };
  
  if (navigator.serviceWorker.controller === undefined || navigator.serviceWorker.controller == null) {
    console.log('Service worker controller not defined, so no message sent back to client');
    return;
  }
  else {
    navigator.serviceWorker.controller.postMessage({action: 'GET_VERSION'}, [messageChannel.port2]);
  }
}


window.customElements.define('memoui-version-page', VersionPage);
export default VersionPage;
