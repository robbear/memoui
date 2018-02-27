import SlideShowJSON from './SlideShowJSON.js';
import Settings from './Settings.js';

//
// The Memoui IndexedDB database has two object stores:
// 1. text-store: Holds all the saved notes keyed by id
// 3. settings-store: Holds the application's preferences and settings
//

//
// BUGBUG: Need to test for random IndexedDB error cases
//

const SSJS_STORE = 'ssjs-store';
const SETTINGS_STORE = 'settings-store';

const DB_VERSION = 1;

// Set to false to turn off diagnostics output
const D = false;


/* global indexedDB */

class Database {
  constructor(databaseName, version) {
    this._databaseName = databaseName;
    this._version = version;
    this._db = null;
    this._ssjstore = null;
    this._settingsStore = null;
  }
  
  static get DATABASENAME() {
    return 'MemouiDB';
  }
  
  static get VERSION() {
    return DB_VERSION;
  }
  
  get databaseName() {
    return this._databaseName;
  }
  set databaseName(value) {
    this._databaseName = value;
  }
  
  get version() {
    return this._version;
  }
  set version(value) {
    this._version = value;
  }
  
  get db() {
    return this._db;
  }
  set db(value) {
    this._db = value;
  }
  
  get ssjsStore() {
    return this._ssjsStore;
  }
  set ssjsStore(value) {
    this._ssjsStore = value;
  }
  
  get settingsStore() {
    return this._settingsStore;
  }
  set settingsStore(value) {
    this._settingsStore = value;
  }
  
  //
  // Opens the IndexedDB database, creating or upgrading the database
  // if necessary. Returns a promise with the underlying IDB database
  // object, "db".
  //
  open() {
    let promise = new Promise((resolve, reject) => {
      let request = indexedDB.open(this.databaseName, this.version);
      
      request.onsuccess = () => {
        this.db = request.result;
        
        // BUGBUG - Need better UI by letting the main page handle this.
        this.db.onversionchange = (event) => {
          this.close();
          alert("A new version of this page is ready. Please refresh.");
        };
        
        resolve(this.db);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onupgradeneeded = (event) => {
        this.db = request.result;
        this.upgradeDatabase(event.oldVersion);
      };
      
      request.onblocked = (event) => {
        // If some other tab is loaded with the database, 
        // then it needs to be closed before we can proceed.
        // BUGBUG - need better UI by letting the main page handle this.
        alert("Please close all other tabs with this site open!");
      };
      
    });

    return promise;
  }
  
  close() {
    if (this.db) {
      this.db.close();
    }
  }
  
  upgradeDatabase(oldVersion) {
    //
    // We're at version 1. Just create our stores here.
    //
    
    this.ssjsStore = this.db.createObjectStore(SSJS_STORE, {keyPath: 'id'});
    this.settingsStore = this.db.createObjectStore(SETTINGS_STORE, {keyPath: 'id'});
  }
  
  //
  // Private helper to save an object to an object store
  //
  // Params:
  // store: string object store name
  // obj: json object to write to the object store
  // resolveData: data to pass back through the promise's resolution
  //
  // Returns a promise
  //
  _saveObject(store, obj, resolveData) {
    let promise = new Promise((resolve, reject) => {
      let transaction = this.db.transaction([store], 'readwrite');
      transaction.oncomplete = (event) => {
        if(D)console.log(`saveObject transaction oncomplete: data=${resolveData}`);
        resolve(resolveData);
      };
      
      transaction.onerror = (event) => {
        console.error(`saveObject transaction onerror: ${event.error}`);
        reject(event.error);
      };
      
      const objectStore = transaction.objectStore(store);
      objectStore.put(obj);
    });    

    return promise;    
  }

  //
  // Private helper to load an object from an object store
  //
  // Params:
  // store: string object store name
  // id: primary key value of object to load
  //
  // Returns a promise that resolves if the object is found, and rejects
  // if not.
  //
  _loadObject(store, id) {
    
    let promise = new Promise((resolve, reject) => {
      let json;

      let transaction = this.db.transaction([store], "readonly");
      transaction.oncomplete = (event) => {
        if(D)console.log(`_loadObject transaction oncomplete: json=${json ? JSON.stringify(json) : json}`);
        resolve(json);
      };
      
      transaction.onerror = (event) => {
        console.error(`_loadObject transaction onerror: ${event.error}`);
        reject(event.error);
      };
      
      const objectStore = transaction.objectStore(store);
  
      let request = objectStore.get(id);
      request.onerror = (event) => {
        console.error(`_loadObject request.onerror: ${event.error}`);
      };
      
      request.onsuccess = (event) => {
        json = request.result;
        if(D)console.log(`_loadObject request.onsuccess: json=${JSON.stringify(json)}`);
      };    
    });
    
    return promise;
  }
  
  //
  // Loads the application's settings, deserializing the stored JSON
  // in the process. Returns a promise.
  //
  loadSettings() {
    return this._loadObject(SETTINGS_STORE, Settings.id)
    .then(json => {
      return Settings.createFromJSON(json);
    })
    .catch(error => {
      if(D)console.error(`loadSettings error: ${error}`);
      if(D)console.dir(error);
      return null;
    });
  }

  //
  // Save the SSJ object to the ssjs store. Serializes the object
  // to a JSON document prior to saving. Returns a promise.
  //
  saveSSJ(ssj) {
    // Allow passing in either the SSJ object itself, or its json
    const json = ssj.json ? ssj.json : ssj;

    return this._saveObject(SSJS_STORE, json, json.id);
  }
  
  //
  // Loads an id-specified SSJ object from the database, deserializing
  // the stored JSON in the process. Returns a promise.
  //
  loadSSJ(id) {
    return this._loadObject(SSJS_STORE, id)
    .then(json => {
      return SlideShowJSON.createFromJSON(json);
    });
  }
  
  //
  // Saves the initial out of box experience state, an initialized
  // settings json and initial SlideShowJSON json via a transaction
  // that groups the two.
  //
  // Parameters: Either a Settings object or its json, and
  // a SlideShowJSON object or its json.
  //
  // Returns a promise.
  //
  saveOOBE(settings, ssj) {
    const settingsJson = settings.json ? settings.json : settings;
    const ssjJson = ssj.json ? ssj.json : ssj;
    
    let promise = new Promise((resolve, reject) => {
      
      let transaction = this.db.transaction([SETTINGS_STORE, SSJS_STORE], 'readwrite');

      transaction.oncomplete = (event) => {
        if(D)console.log(`saveOOBE transaction oncomplete`);
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error(`saveOOBE transaction onerror: ${event.error}`);
        reject(event.error);
      };
      
      const ssjsStore = transaction.objectStore(SSJS_STORE);
      const settingsStore = transaction.objectStore(SETTINGS_STORE);
      
      ssjsStore.put(ssjJson);
      settingsStore.put(settingsJson);
    });    

    return promise;
  }

}

window.Database = Database;
export default Database;