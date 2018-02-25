
//
// The Memoui IndexedDB database has two object stores:
// 1. text-store: Holds all the saved notes keyed by id
// 3. settings-store: Holds the application's preferences and settings
//

//
// BUGBUG: Need to test for random IndexedDB error cases
//

const TEXT_STORE = 'text-store';
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
    this._textStore = null;
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
  
  get textStore() {
    return this._textStore;
  }
  set textStore(value) {
    this._textStore = value;
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
        resolve(this.db);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onupgradeneeded = (event) => {
        this.db = request.result;
        this.upgradeDatabase(event.oldVersion);
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
    
    this.textStore = this.db.createObjectStore(TEXT_STORE, {keyPath: 'id'});
    this.settingsStore = this.db.createObjectStore(SETTINGS_STORE, {keyPath: 'id'});
  }
  
}

window.Database = Database;
export default Database;