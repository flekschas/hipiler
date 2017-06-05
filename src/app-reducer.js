import { combineReducers } from 'redux';

import { RESET_STATE } from 'app-actions';
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
const appReducer = combineReducers({
  // Views
  explore
  // Components
});

const rootReducer = (state, action) => {
  if (action.type === RESET_STATE) {
    state = undefined;
  }

  return appReducer(state, action);
};

export default rootReducer;
