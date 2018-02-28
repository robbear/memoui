import { merge } from 'elix/src/updates.js';
import TabButton from 'elix/src/TabButton.js';

/* global customElements */

class ToolbarTab extends TabButton {

  get updates() {
    const base = super.updates || {};
    const baseColor = base.style && base.style.color;
    return merge(base, {
      $: {
        inner: {
          style: {
            'align-items': 'center',
            'background': 'transparent',
            'border': 'none',
            'color': this.state.selected ? 'dodgerblue' : baseColor,
            'display': 'flex',
            'flex': '1',
            'flex-direction': 'column',
            'font-family': 'inherit',
            'font-size': 'inherit',
            'padding': '6px',
            '-webkit-tap-highlight-color': 'transparent'
          }
        }
      }
    });
  }
  
}

customElements.define('memoui-toolbar-tab', ToolbarTab);
export default ToolbarTab;
