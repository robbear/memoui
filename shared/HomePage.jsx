import { Component, h } from 'preact'; // jshint ignore:line


/**
 * The Home page.
 *
 */
export default class HomePage extends Component {

  render(props) {
    return (
      <memoui-home-page props={JSON.stringify(props.request.app.locals)}>
      </memoui-home-page>
    );
  }

}