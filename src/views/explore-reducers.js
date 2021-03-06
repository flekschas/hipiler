import { combineReducers } from 'redux';

import { UPDATE_WIDTH } from 'views/explore-actions';
import { COLUMNS } from 'views/explore-defaults';

import fragments from 'components/fragments/fragments-reducers';
import higlass from 'components/higlass/higlass-reducers';

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
  columns,
  fragments,
  higlass
});
