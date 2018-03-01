import ElementBase from 'elix/src/ElementBase.js';
import 'elix/src/Tabs.js';
import * as symbols from 'elix/src/symbols.js';
import { merge } from 'elix/src/updates.js';
import Database from '../utilities/Database.js';
import SlideShowJSON from '../utilities/SlideShowJSON.js';
import uuidv4 from '../utilities/Uuidv4.js';

const SSJ_VERSION = 1;
const SAVE_INTERVAL = 3000; // 3 seconds

/**
 * Set to false to turn off diagnostics output
 */
const D = false;

class HomePage extends ElementBase {

  constructor() {
    super();
    
    this._settings = null;
    this._ssj = null;
    this._database = null;
    this._dirty = false;
  }
  
  get defaultState() {
    return Object.assign({}, super.defaultState, {
      appReady: false,
      currentTabIndex: 0,
      tabTitles: ['Home', 'Work', 'Misc']
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

    return merge(super.updates, {
    });
  }
  
  get [symbols.template]() {
    let textAreaHTML = '';
    let toolbarHTML = '';
    
    this.tabTitles.forEach((tabTitle, index) => {
      textAreaHTML += `<textarea id="textArea${index}"" class="textarea" placeholder="Just start typing. Your text will be saved." autofocus></textarea>`;
      toolbarHTML += `
        <memoui-toolbar-tab slot="tabButtons" aria-label="${tabTitle}">
          <div class="tabTitle">${tabTitle}</div>
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
          font-family: inherit;
          font-size: inherit;
          resize: none;
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
