import { combineReducers } from 'redux';

import { UPDATE_HGL_CONFIG } from 'components/higlass/higlass-actions';
import { CONFIG } from 'components/higlass/higlass-defaults';

import deepClone from 'utils/deep-clone';

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_HGL_CONFIG:
      return { ...state, ...deepClone(action.payload.config) };

    default:
      return state;
  }
}

export default combineReducers({
  config
});
