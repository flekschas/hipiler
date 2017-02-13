import { combineReducers } from 'redux';

import {
  SET_ARANGE_METRICS,
  SET_CELL_SIZE,
  SET_COVER_DISP_MODE,
  UPDATE_FGM_CONFIG
} from 'components/fragments/fragments-actions';

import {
  ARANGE_METRICS,
  CELL_SIZE,
  CONFIG,
  MODE_MEAN
} from 'components/fragments/fragments-defaults';

import deepClone from 'utils/deep-clone';


export function arangeMetrics (state = ARANGE_METRICS, action) {
  switch (action.type) {
    case SET_ARANGE_METRICS:
      return action.payload.arangeMetrics.slice();

    default:
      return state;
  }
}

export function cellSize (state = CELL_SIZE, action) {
  switch (action.type) {
    case SET_CELL_SIZE:
      return action.payload.cellSize;

    default:
      return state;
  }
}

export function coverDispMode (state = MODE_MEAN, action) {
  switch (action.type) {
    case SET_COVER_DISP_MODE:
      return action.payload.coverDispMode;

    default:
      return state;
  }
}

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_FGM_CONFIG:
      return { ...state, ...deepClone(action.payload.config) };

    default:
      return state;
  }
}


export default combineReducers({
  arangeMetrics,
  cellSize,
  coverDispMode,
  config
});
