import { Component, h } from 'preact'; // jshint ignore:line

export default class VersionPage extends Component {

  render(props) {

    return (
      <memoui-version-page props={JSON.stringify(props.request.app.locals)}>
      </memoui-version-page>
    );
  }

  get title() {
    return "Version";
  }

}
