import ErrorPage from './ErrorPage';
import HomePage from './HomePage';
import VersionPage from './VersionPage';


/**
 * Map routes to components.
 */
export default {
  '/error': ErrorPage,
  '/version': VersionPage,
  '/': HomePage
};
