import { combineReducers } from 'redux';

import { UPDATE_CONFIG } from 'views/higlass.actions';
import { CONFIG } from 'views/higlass.defaults';

import deepClone from 'utils/deep-clone';

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_CONFIG:
      return { ...state, config: deepClone(action.payload.config) };

    default:
      return state;
  }
}

export default combineReducers({
  config
});
