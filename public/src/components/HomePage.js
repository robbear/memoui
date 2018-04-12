import ReactiveElement from 'elix/src/ReactiveElement.js';
import 'elix/src/Drawer.js';
import 'elix/src/Tabs.js';
import * as symbols from 'elix/src/symbols.js';
import { merge } from 'elix/src/updates.js';
import Database from '../utilities/Database.js';
import SlideShowJSON from '../utilities/SlideShowJSON.js';
import uuidv4 from '../utilities/Uuidv4.js';

const SSJ_VERSION = 1;
const SAVE_INTERVAL = 2000; // 2 seconds
const VERSION_STRING_LENGTH = 7;
const DESKTOP_MEDIA = 'screen and (min-width: 800px)'

/**
 * Set to false to turn off diagnostics output
 */
const D = false;


class HomePage extends ReactiveElement {

  constructor() {
    super();
    
    this._settings = null;
    this._ssj = null;
    this._database = null;
    this._dirty = false;
    this._staticPath = '';
  }
  
  get defaultState() {
    return Object.assign({}, super.defaultState, {
      appReady: false,
      currentTabIndex: 0,
      tabTitles: ['Home', 'Work', 'Misc'],
      build: '',
      version: '',
      serviceWorkerVersion: ''
    });
  }
  
  componentDidMount() {
    if (super.componentDidMount) { super.componentDidMount(); }

    getServiceWorkerVersion(this);

    this.initializeFromDatabase()
    .catch(error => {
      console.error(`Call from initializeFromDatabase leaked error: ${error}`);
      this.appReady = false;
    });
    
    this.$.menu.addEventListener('click', event => {
      this.$.drawer.open();
      event.stopPropagation();
    });
    
    this.$.share.addEventListener('click', event => {
      const text = this._ssj.getSlideJSONByIndex(this.currentTabIndex).text;
      
      if (text && text.length > 0 && window.navigator.share) {
  
        window.navigator.share({
          title: 'A note from Memoui',
          text: text,
          url: 'https://memoui.com'
        })
        .catch((error) => {
          console.error(`Error sharing: ${error}`);
        });
      }
      
      event.stopPropagation();
    });

    this.$.tabs.addEventListener('input', event => {
      const target = event.target;
      
      if (target.classList.contains('textarea')) {
        let slide = this._ssj.getSlideJSONByIndex(this.currentTabIndex);
        slide.text = target.value;
        this._dirty = true;
      }
    });
    
    this.$.tabs.addEventListener('selected-index-changed', event => {
      const selectedIndex = event.detail.selectedIndex;

      if (this.currentTabIndex !== selectedIndex) {      
        this.currentTabIndex = selectedIndex;
        this._dirty = true;
      }
    });

  }

  /**
   * Checks after a timeout whether the dirty flag
   * is set, indicating that the SSJ needs to be saved. If dirty,
   * it will snapshot the SSJ json, taking a copy and saving it.
   * The dirty flag is cleared after the snapshot, and before the save.
   */
  startSaveTimer() {
    if(D)console.log('startSaveTimer');
    let self = this;
    
    setTimeout(() => {
      if (self._dirty) {
        if(D)console.log('Dirty bit set, so saving');
        
        // Capture the state of the currentSlideIndex so we can restore
        // to the last tab the user was viewing upon reload
        self._ssj.currentSlideIndex = this.currentTabIndex;
        
        // Snapshot a copy of the ssj json and save it
        const json = self._ssj.copyJson();
        self._dirty = false;
        self._database.saveSSJ(json)
        .then(() => {
          // Start a new timer
          self.startSaveTimer();
        })
        .catch(error => {
          console.error(`Error saving ssj: ${error}`);
          
          // On an error, turn the dirty flag back on so we try a save
          // on the next timeout.
          self._dirty = true;
          
          self.startSaveTimer();
        });
      }
      else {
        // Start a new timer in the case where we didn't have
        // a save to perform
        self.startSaveTimer();
      }
    }, SAVE_INTERVAL);
    
  }

  /**
   * Initializes the application by opening the database and either retrieving
   * existing data, or recognizing the "Out Of Box Experience" (OOBE), creating
   * the new database and initializing values.
   * 
   * Returns a promise.
   */
  initializeFromDatabase() {
    let promise;
    if (!this._database) {
      this._database = new Database(Database.DATABASENAME, Database.VERSION);
      promise = this._database.open();
    }
    else {
      promise = Promise.resolve();
    }
    return promise
    .then(() => {
      return this._database.loadSettings();
    })
    .then(settings => {
      this._settings = settings;
      if (this._settings.currentSSJId) {
        return this.populateSSJFromDatabase();
      }
      else {
        return this.initializeOOBE();
      }
    })
    .then(() => {
      this.populateTextareas();
      
      //
      // Restore the Tabs element to the last viewed tab
      //
      const currentIndex = this._ssj.currentSlideIndex;
      this.$.tabs.selectedIndex = currentIndex ? currentIndex : 0;
      this.currentTabIndex = this.$.tabs.selectedIndex;
      
      if(D)console.log('App ready');
      this.appReady = true;

      // Start the perpetual timer loop for detecting the dirty flag
      this.startSaveTimer();
    })
    .catch(error => {
      console.error(`Failed to open database: ${error}`);
      this._database.close();
      this.appReady = false;
    });
  }
  
  /**
   * Loads an existing SSJ from the database and adjusts the
   * slides in the SSJ if there's been a change in the number of
   * tabs we support.
   * 
   * Returns a promise.
   */
  populateSSJFromDatabase() {
    //
    // This is the database-exists workflow
    //
    return this._database.loadSSJ(this._settings.currentSSJId)
    .then(ssjRet => {
      if (SlideShowJSON.validate(ssjRet)) {
        return Promise.resolve(ssjRet);
      }
      
      alert('We apologize, but we can no longer retrieve your saved data.');
      
      // TO DO: tear down the database and force the OOBE path
    })
    .then(ssjRet => {
      this._ssj = ssjRet;
      
      //
      // Handle upgrades where we have more tabs in this version
      // than the previous version when the ssj was saved.
      //
      const newTabCapacity = this.tabTitles.length;
      const oldTabCapacity = this._ssj.order.length;
      if (newTabCapacity > oldTabCapacity) {
        if(D)console.log('*** Updating to accomodate more tabs');
        const startIndex = newTabCapacity - oldTabCapacity - 1;
        for (let i = startIndex; i < newTabCapacity; i++) {
          const slideId = uuidv4();
          this._ssj.order.push(slideId);
          this._ssj.slides[slideId] = { title: this.tabTitles[i], text: null };
        }
      }
      else if (newTabCapacity < oldTabCapacity) {
        if(D)console.log('*** Updating to accomodate fewer tabs by deleting data');
        const slidesToDelete = oldTabCapacity - newTabCapacity;
        for (let i = 0; i < slidesToDelete; i++) {
          const length = this._ssj.order.length;
          const slideId = this._ssj.order[length - 1];
          this._ssj.slides.delete(slideId);
          this._ssj.order.pop();
        }
      }
    });
  }
  
  /**
   * Initializes the application from the OOBE flow
   */
  initializeOOBE() {
    //
    // This is the OOBE workflow
    //
    this._settings.currentSSJId = uuidv4();
    this._ssj = new SlideShowJSON(
      this._settings.currentSSJId, 
      null, 
      null,
      0,
      SlideShowJSON.SlideShowJSONVersion);
    
    this.tabTitles.forEach(tabTitle => {
      const slideId = uuidv4();
      this._ssj.order.push(slideId);
      this._ssj.slides[slideId] = { title: tabTitle, text: null };
    });

    return this._database.saveOOBE(this._settings, this._ssj);
  }
  
  /**
   * Populates the textarea elements with the data retrieved
   * from the database.
   */
  populateTextareas() {
    this.tabTitles.forEach((tabTitle, index) => {
      const text = this._ssj.getSlideJSONByIndex(index).text;
      this.$[`textArea${index}`].value = text;
    });
  }
  

  /**
   * Property getters/setters
   */
  
  get appReady() {
    return this.state.appReady;
  }
  set appReady(appReady) {
    this.setState({appReady});
  }
  
  get currentTabIndex() {
    return this.state.currentTabIndex;
  }
  set currentTabIndex(currentTabIndex) {
    this.setState({currentTabIndex});
  }
  
  get tabTitles() {
    return this.state.tabTitles;
  }
  set tabTitles(tabTitles) {
    this.setState({tabTitles});
  }

  set props(jsonString) {
    let json = {};
    
    try {
      json = JSON.parse(jsonString);
      this._staticPath = `/static/${json.build}`;
      this.setState({
        build: json.build,
        version: json.version
      });
    }
    catch(error) {}
  }

  get serviceWorkerVersion() {
    return this.state.serviceWorkerVersion;
  }
  set serviceWorkerVersion(serviceWorkerVersion) {
    this.setState({serviceWorkerVersion});
  }


  /**
   * Rendering
   */

  [symbols.render]() {
    if (super[symbols.render]) { super[symbols.render](); }
    
    const textAreaEnabled = this.appReady;
    
    this.tabTitles.forEach((tabTitle, index) => {
      this.$[`textArea${index}`].disabled = !textAreaEnabled;
    });
  }
  
  get updates() {
    const canShare = window.navigator.share ? true : false;
    let version = this.state.version;
    version = version ? version.substring(0, VERSION_STRING_LENGTH) : '';
    const isDesktop = window.matchMedia(DESKTOP_MEDIA).matches;

    return merge(super.updates, {
      $: {
        share: {
          style: {
            visibility: canShare ? '' : 'hidden'
          }
        },
        menu: {
          style: {
            visibility: isDesktop ? 'hidden' : ''
          }
        },
        build: {
          innerHTML: `Build: ${this.state.build}`
        },
        version: {
          innerHTML: `Version: ${version}`
        },
        swVersion: {
          innerHTML: `SW Version: ${this.state.serviceWorkerVersion}`
        }
      }
    });
  }
  
  get [symbols.template]() {
    let textAreaHTML = '';
    let toolbarHTML = '';
    
    this.tabTitles.forEach((tabTitle, index) => {
      textAreaHTML += `<textarea id="textArea${index}"" class="textarea" placeholder="Just start typing. Your text will be saved." autofocus></textarea>`;
      toolbarHTML += `
        <memoui-toolbar-tab slot="proxy" aria-label="${tabTitle}">
          <div class="tabTitle">${tabTitle}</div>
        </memoui-toolbar-tab>`;
    });
    
    return `
      <style>
        :host {
        }
        #container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        #drawer div {
          font-size: 12px;
        }
        #drawerContainer {
          padding: 1em;
        }
        .tabTitle {
          padding: 20px;
        }
        .toolbarTabs {
          background: #eee;
          color: gray;
          display: flex;
          flex: 1;
          height: 100%;
        }
        .textarea {
          border: none;
          padding: 1.5em;
          display: flex;
          flex: 1;
          font-family: inherit;
          font-size: inherit;
          resize: none;
        }
        #header {
          display: flex;
          flex: 0 0 3em;
          flex-direction: row;
          background-color: dodgerblue;
          color: white;
          align-items: center;
          justify-content: space-between;
        }
        #header img {
          width: 1.5em;
          height: 1.5em;
        }
        #menu {
          margin-left: 1.5em;
        }
        #share {
          margin-right: 1.5em;
        }
        #desktopContent {
          display: none;
        }
        @media ${DESKTOP_MEDIA} {
          #desktopContent {
            display: flex;
            flex: 0 1 9em;
            flex-direction: column;
            padding: 1.5em;
            font-size: 1.25em;
            width: 60%;
            margin: 0 auto;
          }
          #container {
            width: 450px;
            height: 700px;
            margin: 0 auto;
          }
        }
      </style>
      <div id="desktopContent">
        <h2>Memoui</h2>
        <p>
        Memoui is a progressive web application demonstration making use
        of web components, a service worker, IndexedDB, and other web
        application development patterns. It is best experienced on
        mobile devices. Memoui is built with
        <a href="https://elix.org">Elix</a>, a library of 
        high-quality web components and mixins developed by 
        <a href="https://component.kitchen">Component Kitchen</a>.
        What you see below is roughly how the application appears on a mobile 
        device. Give it a try on your phone, or if you like, here.
        </p>
      </div>
      <div id="container">
        <div id="header">
          <img id="menu" src="${this._staticPath}/images/menu.png" />
          <h1>Memoui</h1>
          <img id="share" src="${this._staticPath}/images/share.png" />
        </div>
        <elix-tabs id="tabs" class="toolbarTabs" proxy-list-position="bottom" tab-align="stretch">
    
          ${toolbarHTML}
  
          ${textAreaHTML}
          
        </elix-tabs>
      </div>
      <elix-drawer id="drawer" class="showDrawer">
        <div id="drawerContainer">
          <h3>Memoui</h3>
          <div>
            <p style="width: 150px;">
              A progressive web application demonstration
              by Component Kitchen
            </p>
          </div>
          <div id="build"></div>
          <div id="version"></div>
          <div id="swVersion"></div>
        </div>
      </elix-drawer>
    `;
  }
  
}

function getServiceWorkerVersion(elem) {
  if (!('serviceWorker' in window.navigator)) {
    return elem.serviceWorkerVersion = '';
  }
  
  let messageChannel = new window.MessageChannel();
  messageChannel.port1.onmessage = function(event) {
    var versionString = event.data;
    if (versionString.indexOf('v') === 0) {
      versionString = versionString.substring(1);
    }
    
    elem.serviceWorkerVersion = versionString;
  };
  
  if (window.navigator.serviceWorker.controller === undefined || window.navigator.serviceWorker.controller == null) {
    console.log('Service worker controller not defined, so no message sent back to client');
    return;
  }
  else {
    window.navigator.serviceWorker.controller.postMessage({action: 'GET_VERSION'}, [messageChannel.port2]);
  }
}

window.customElements.define('memoui-home-page', HomePage);
export default HomePage;
