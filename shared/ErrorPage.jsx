import { Component, h } from 'preact'; // jshint ignore:line


/**
 * Error page.
 */
export default class ErrorPage extends Component {

  render(props) {
    return (
      <memoui-error-page></memoui-error-page>
    );
  }

  get title() {
    return "Oops";
  }

}
