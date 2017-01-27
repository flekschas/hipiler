import { combineReducers } from 'redux';

import { UPDATE_HGL_CONFIG } from 'views/higlass.actions';
import { CONFIG } from 'views/higlass.defaults';

import deepClone from 'utils/deep-clone';

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_HGL_CONFIG:
      console.log('DEEP CLONE CONFIG for HGL');
      return { ...state, config: deepClone(action.payload.config) };

    default:
      return state;
  }
}

export default combineReducers({
  config
});
