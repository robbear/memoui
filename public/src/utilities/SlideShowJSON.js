import uuidv4 from './Uuidv4.js';

const SSJ_VERSION = 1;

/**
 * SlideShowJSON is a class pattern we use for application state concerning
 * data displayed in elements such as tabs and carousels (the latter being
 * the origin of the notion of a "slide").
 * 
 * The SlideShowJSON class loosely manages a schema through its exposed
 * properties and methods, and uses a JSON object as a backing-store, so
 * to speak. The JSON is intended to be private and managed by the class.
 * It is the JSON object that is serialized for persistence such as to
 * an IndexedDB instance.
 * 
 * In this app, SlideShowJSON has the following structure:
 *  {
 *    id: {string}
 *    title: {string}
 *    description: {string}
 *    currentSlideIndex: {number}
 *    version: {number}
 *    order: string[]  // Ordered array of slideIds
 *    slides: {
 *      slideId: { title: {string}, text: {string} },
 *      ...
 *    }
 *  }
 * 
 * The order value holds an array of slideIds, ordered to correspond
 * to the slide's order in the UI element.
 * 
 * The slideId is a key into an associative array holding each of the
 * slide's data. In this case, we store a slide's title and its text content.
 * The title in this app corresponds to a Tab name, and the text
 * corresponds to the user's typed text in each textarea element.
 */

class SlideShowJSON {
  constructor(id, title, description, currentSlideIndex, version) {
    this._json = {
      id: id ? id : uuidv4(),
      title: title ? title : null,
      description: description ? description : null,
      currentSlideIndex: currentSlideIndex ? currentSlideIndex : 0,
      version: version,
      order: [],
      slides: {}
    };
  }
  
  static createFromJSON(json) {
    let ssj = new SlideShowJSON(null, null, null, null, null);

    if (json) {
      ssj.json = json;
    }

    return ssj;
  }
  
  /**
   * Validates whether the supplied json is structurally correct
   * SSJ data.
   */
  static validate(json) {
    // BUGBUG: NYI
    return true;
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
  
  get title() {
    return this._json.title;
  }

  get description() {
    return this._json.description;
  }
  
  get currentSlideIndex() {
    return this._json.currentSlideIndex;
  }
  set currentSlideIndex(currentSlideIndex) {
    this._json.currentSlideIndex = currentSlideIndex;
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