import { combineReducers } from 'redux';

import { UPDATE_WIDTH } from 'views/decompose.actions';
import defaults from 'views/decompose.defaults';

export function columns (state = { ...defaults.columns }, action) {
  switch (action.type) {
    case UPDATE_WIDTH:
      if (state[action.payload.column]) {
        let newState = { ...state };

        newState[action.payload.column] = {
          ...newState[action.payload.column],
          width: action.payload.width
        };

        return newState;
      }
      return state;
    default:
      return state;
  }
}

export default combineReducers({
  columns
});
