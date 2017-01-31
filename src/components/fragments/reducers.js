import { combineReducers } from 'redux';

import { UPDATE_FGM_CONFIG } from 'components/fragments/actions';
import { CONFIG } from 'components/fragments/defaults';

import deepClone from 'utils/deep-clone';

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_FGM_CONFIG:
      return { ...state, ...deepClone(action.payload.config) };

    default:
      return state;
  }
}

export default combineReducers({
  config
});
