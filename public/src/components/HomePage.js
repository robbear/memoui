import ElementBase from 'elix/src/ElementBase.js';
import 'elix/src/Tabs.js';
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
      currentTabIndex: 0,
      forcedUpdateIndex: 0,
      noteTitles: ['Home', 'Work', 'Misc']
    });
  }
  
  componentDidMount() {
    if (super.componentDidMount) { super.componentDidMount(); }

    this.initializeFromDatabase()
    .catch(error => {
      console.error(`Call from initializeFromDatabase leaked error: ${error}`);
      this.appReady = false;
    });
    
    this.$.tabs.addEventListener('keyup', event => {
      const target = event.target;
      
      if (target.classList.contains('textarea')) {
        this._ssj.slides[this._ssj.order[this.currentTabIndex]].text = target.value;
        this._dirty = true;
      }
    });
    
    // BUGBUG: This works around not getting the event on this.$.tabs
    // Checking with Jan
    this.$.tabs.$.tabStrip.addEventListener('selected-index-changed', event => {
      this.currentTabIndex = event.detail.selectedIndex;
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
        //
        // This is the existing database workflow
        //
        return this._database.loadSSJ(this._settings.currentSSJId)
        .then(ssjRet => {
          this._ssj = ssjRet;
          
          // Handle upgrades where we have more tabs
          const newSlideCapacity = this.noteTitles.length;
          const oldSlideCapacity = this._ssj.order.length;
          if (newSlideCapacity > oldSlideCapacity) {
            console.log('*** Updating to accomodate more tabs');
            const startIndex = newSlideCapacity - oldSlideCapacity - 1;
            for (let i = startIndex; i < newSlideCapacity; i++) {
              const slideId = uuidv4();
              this._ssj.order.push(slideId);
              this._ssj.slides[slideId] = { title: this.noteTitles[i], text: null };
            }
          }
          else if (newSlideCapacity < oldSlideCapacity) {
            console.log('*** Updating to accomodate fewer tabs by deleting data');
            const slidesToDelete = oldSlideCapacity - newSlideCapacity;
            for (let i = 0; i < slidesToDelete; i++) {
              const length = this._ssj.order.length;
              const slideId = this._ssj.order[length - 1];
              this._ssj.slides.delete(slideId);
              this._ssj.order.pop();
            }
          }
        });
      }
      else {
        //
        // This is the OOBE workflow
        //
        this._settings.currentSSJId = uuidv4();
        this._ssj = new SlideShowJSON(
          this._settings.currentSSJId, 
          null, 
          null, 
          SlideShowJSON.SlideShowJSONVersion);
        
        this.noteTitles.forEach(noteTitle => {
          const slideId = uuidv4();
          this._ssj.order.push(slideId);
          this._ssj.slides[slideId] = { title: noteTitle, text: null };
        });

        return this._database.saveOOBE(this._settings, this._ssj);
      }
    })
    .then(() => {
      if(D)console.log('App ready');
      this.noteTitles.forEach((noteTitle, index) => {
        const text = this._ssj.getSlideJSONByIndex(index).text;
        this.$[`textArea${index}`].value = text;
      });
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
  
  get currentTabIndex() {
    return this.state.currentTabIndex;
  }
  set currentTabIndex(currentTabIndex) {
    this.setState({currentTabIndex});
  }
  
  get noteTitles() {
    return this.state.noteTitles;
  }
  set noteTitles(noteTitles) {
    this.setState({noteTitles});
  }
  
  //
  // Force a render cycle
  //
  forceUpdate() {
    this.setState({forceUpdateIndex: this.state.forceUpdateIndex + 1});
  }
  
  [symbols.render]() {
    if (super[symbols.render]) { super[symbols.render](); }
    
    const textAreaEnabled = this.appReady;
    
    this.noteTitles.forEach((noteTitle, index) => {
      this.$[`textArea${index}`].disabled = !textAreaEnabled;
    });
  }
  
  get updates() {

    return merge(super.updates, {
    });
  }
  
  get [symbols.template]() {
    let textAreaHTML = '';
    let toolbarHTML = '';
    
    this.noteTitles.forEach((noteTitle, index) => {
      textAreaHTML += `<textarea id="textArea${index}"" class="textarea" placeholder="Just start typing. Your text will be saved." autofocus></textarea>`;
      toolbarHTML += `
        <memoui-toolbar-tab slot="tabButtons" aria-label="${noteTitle}">
          <div class="tabTitle">${noteTitle}</div>
        </memoui-toolbar-tab>`;
    });
    
    return `
      <style>
        :host {
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
          padding: 10px;
        align-items: center;
        background: initial;
        color: initial;
        display: flex;
        flex: 1;
        justify-content: center;
          font: 400 14px system-ui;
        }
      </style>
      <elix-tabs id="tabs" class="toolbarTabs" tab-position="bottom" tab-align="stretch">
  
        ${toolbarHTML}

        ${textAreaHTML}
        
      </elix-tabs>
      
    `;
  }
  
}

window.customElements.define('memoui-home-page', HomePage);
export default HomePage;
