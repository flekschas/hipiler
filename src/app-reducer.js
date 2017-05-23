import { combineReducers } from 'redux';

import explore from 'views/explore-reducers';

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
  explore
  // Components
});
