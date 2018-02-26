import uuidv4 from './Uuidv4.js';

const SSJ_VERSION = 1;

class SlideShowJSON {
  constructor(id, title, description, version) {
    this._json = {
      id: id ? id : uuidv4(),
      title: title ? title : null,
      description: description ? description : null,
      version: version,
      order: [],
      slides: {}
    };
  }
  
  static createFromJSON(json) {
    let ssj = new SlideShowJSON(null, null, null, null);

    if (json) {
      ssj.json = json;
    }

    return ssj;
  }
  
  static get SlideShowJSONVersion() {
    return SSJ_VERSION;
  }
  
  get json() {
    return this._json;
  }
  set json(value) {
    this._json = JSON.parse(JSON.stringify(value));
  }
  
  copyJson() {
    return JSON.parse(JSON.stringify(this.json));
  }
  
  // Performs database operations.
  // Returns a promise.
  updateTitleAndDescription(title, description, database) {
    const obj = {title, description};
    this.json = Object.assign(this.json, obj);
  }
  
  get title() {
    return this._json.title;
  }

  get description() {
    return this._json.description;
  }

  get version() {
    return this._json.version;
  }

  get id() {
    return this._json.id;
  }
  
  get order() {
    return this._json.order;
  }
  set order(value) {
    this._json.order = value;
  }
  
  get slides() {
    return this._json.slides;
  }
  set slides(value) {
    this._json.slides = value;
  }

  //
  // Saves the SSJ to the database
  //
  // Parameters:
  // -- database: the IndexedDB reference
  //
  // Returns a promise.
  //
  save(database) {
    return database.saveSSJJ(this);
  }
    
  indexFromSlideId(slideId) {
    return this.order.indexOf(slideId);
  }

  getSlideJSON(guidval) {
    return this.slides[guidval];
  }
  
  getSlideJSONByIndex(orderIndex) {
    return this.getSlideJSON(this.order[orderIndex]);
  }
    
}

window.SlideShowJSON = SlideShowJSON;
export default SlideShowJSON;