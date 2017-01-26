import { combineReducers } from 'redux';

import { UPDATE_WIDTH } from 'views/decompose.actions';
import { COLUMNS } from 'views/decompose.defaults';

export function columns (state = { ...COLUMNS }, action) {
  switch (action.type) {
    case UPDATE_WIDTH:
      const newState = { ...state };

      newState[`${action.payload.column}Width`] = action.payload.width;

      return newState;
    default:
      return state;
  }
}

export default combineReducers({
  columns
});
