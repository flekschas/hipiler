import { combineReducers } from 'redux';

import { UPDATE_WIDTH } from 'views/decompose.actions';
import { COLUMNS } from 'views/decompose.defaults';

export function columns (state = { ...COLUMNS }, action) {
  switch (action.type) {
    case UPDATE_WIDTH:
      return {
        ...state,
        [`${action.payload.column}Width`]: action.payload.width
      };
    default:
      return state;
  }
}

export default combineReducers({
  columns
});
