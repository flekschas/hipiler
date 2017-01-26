import { combineReducers } from 'redux';

import decompose from 'views/decompose.reducers';
import higlass from 'views/higlass.reducers';

/**
 * The global / app reducer
 *
 * Add all all the high level reducers here. The state hierarchy is as follows
 * ```
 * {
 *   <VIEWS>: {
 *     <COMPONENTS>,
 *     ...
 *   },
 *   global: {
 *     <COMPONENTS>
 *   }
 * }
 * ````
 */
export default combineReducers({
  // Views
  decompose,
  higlass
  // Components
});
