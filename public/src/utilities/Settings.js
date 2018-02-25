const SETTINGS_ID = 'settings';

class Settings {
  constructor() {
    this._json = {
      id: SETTINGS_ID,
      currentTextId: null
    };
  }
  
  static get id() {
    return SETTINGS_ID;
  }
  
  static createFromJSON(json) {
    let settings = new Settings();
    
    if (json) {
      settings.json = json;
    }
    
    return settings;
  }
  
  get json() {
    return this._json;
  }
  set json(value) {
    this._json = JSON.parse(JSON.stringify(value));
  }
  
  get id() {
    return this._json.id;
  }
  set id(value) {
    this._json.id = value;
  }

  get currentTextId() {
    return this._json.currentTextId;
  }
  set currentSSJId(value) {
    this._json.currentSSJId = value;
  }
}

window.Settings = Settings;
export default Settings;