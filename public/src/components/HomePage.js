import ElementBase from 'elix/src/ElementBase.js';
import * as symbols from 'elix/src/symbols.js';
import { merge } from 'elix/src/updates.js';
import Database from '../utilities/Database.js';
import SlideShowJSON from '../utilities/SlideShowJSON.js';
import uuidv4 from '../utilities/Uuidv4.js';

const SSJ_VERSION = 1;
const SAVE_INTERVAL = 3000; // 3 seconds

// Set to false to turn off diagnostics output
const D = false;

class HomePage extends ElementBase {

  constructor() {
    super();
    
    this._settings = null;
    this._ssj = null;
    this._database = null;
    this._dirty = false;
    this._lastSave = null;
  }
  
  startSaveTimer() {
    if(D)console.log('startSaveTimer');
    let self = this;
    
    setTimeout(() => {
      if (self._dirty) {
        if(D)console.log('Dirty bit set, so saving');
        self._database.saveSSJ(self._ssj)
        .then(() => {
          self._dirty = false;
          self.startSaveTimer();
        })
        .catch(error => {
          console.error(`Error saving ssj: ${error}`);
          self.startSaveTimer();
        });
      }
      else {
        self.startSaveTimer();
      }
    }, SAVE_INTERVAL);
    
  }
  
  get defaultState() {
    return Object.assign({}, super.defaultState, {
      appReady: false,
      currentSlideIndex: -1,
      forcedUpdateIndex: 0
    });
  }
  
  componentDidMount() {
    if (super.componentDidMount) { super.componentDidMount(); }

    this.initializeFromDatabase()
    .catch(error => {
      console.error(`Call from initializeFromDatabase leaked error: ${error}`);
      this.appReady = false;
    });
    
    this.$.textArea.addEventListener('keyup', event => {
      this._ssj.slides[this._ssj.order[0]].text = this.$.textArea.value;
      this._dirty = true;
    });
  }
  
  // Returns a promise
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
        return this._database.loadSSJ(this._settings.currentSSJId)
        .then(ssjRet => {
          this._ssj = ssjRet;
        });
      }
      else {
        this._settings.currentSSJId = uuidv4();
        this._ssj = new SlideShowJSON(
          this._settings.currentSSJId, 
          null, 
          null, 
          SlideShowJSON.SlideShowJSONVersion);
          
        const slideId = uuidv4();
        this._ssj.order.push(slideId);
        this._ssj.slides[slideId] = { text: null };

        return this._database.saveOOBE(this._settings, this._ssj);
      }
    })
    .then(() => {
      if(D)console.log('App ready');
      const text = this._ssj.getSlideJSONByIndex(0).text;
      this.$.textArea.value = text;
      this.appReady = true;

      this.startSaveTimer();
    })
    .catch(error => {
      console.error(`Failed to open database: ${error}`);
      this._database.close();
      this.appReady = false;
    });
  }
  
  get appReady() {
    return this.state.appReady;
  }
  set appReady(appReady) {
    this.setState({appReady});
  }
  
  get currentSlideIndex() {
    return this.state.currentSlideIndex;
  }
  set currentSlideIndex(currentSlideIndex) {
    this.setState({currentSlideIndex});
  }
  
  //
  // Force a render cycle
  //
  forceUpdate() {
    this.setState({forceUpdateIndex: this.state.forceUpdateIndex + 1});
  }

  get updates() {
    const textAreaEnabled = this.appReady;
    
    return merge(super.updates, {
      $: {
        textArea: {
          disabled: !textAreaEnabled
        }
      }
    });
  }
  
  get [symbols.template]() {
    return `
      <style>
        :host {
        }
        #textArea {
          padding: 10px;
          width: 100%;
          height: 100%;
          font: 400 14px system-ui;
        }
      </style>
      <textarea 
        id="textArea"
        placeholder="Just start typing. Your text will be saved."
        audofocus 
      ></textarea>
    `;
  }
  
}

window.customElements.define('memoui-home-page', HomePage);
export default HomePage;
