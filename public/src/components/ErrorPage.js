import ElementBase from 'elix/src/ElementBase.js';
import * as symbols from 'elix/src/symbols.js';
import { merge } from 'elix/src/updates.js';

class ErrorPage extends ElementBase {

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
        Sorry, something went wrong. 😞
      </div>
    `;
  }
  
}

window.customElements.define('memoui-error-page', ErrorPage);
export default ErrorPage;
