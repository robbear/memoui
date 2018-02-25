import ElementBase from 'elix/src/ElementBase.js';
import * as symbols from 'elix/src/symbols.js';
import { merge } from 'elix/src/updates.js';

class HomePage extends ElementBase {

  componentDidMount() {
    if (super.componentDidMount) { super.componentDidMount(); }
  }

  get defaultState() {
    return Object.assign({}, super.defaultState, {
    });
  }

  get updates() {
    return merge(super.updates, {
    });
  }
  
  get [symbols.template]() {
    return `
      <div>
        Memoui home page
      </div>
    `;
  }
  
}

window.customElements.define('memoui-home-page', HomePage);
export default HomePage;
