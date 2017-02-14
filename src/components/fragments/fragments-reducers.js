import { combineReducers } from 'redux';

import {
  SET_ANIMATION,
  SET_ARRANGE_METRICS,
  SET_CELL_SIZE,
  SET_COVER_DISP_MODE,
  SET_SHOW_SPECIAL_CELLS,
  UPDATE_FGM_CONFIG
} from 'components/fragments/fragments-actions';

import {
  ANIMATION,
  ARRANGE_METRICS,
  CELL_SIZE,
  CONFIG,
  MODE_MEAN,
  SHOW_SPECIAL_CELLS
} from 'components/fragments/fragments-defaults';

import deepClone from 'utils/deep-clone';


export function animation (state = ANIMATION, action) {
  switch (action.type) {
    case SET_ANIMATION:
      return action.payload.animation;

    default:
      return state;
  }
}

export function arrangeMetrics (state = ARRANGE_METRICS, action) {
  switch (action.type) {
    case SET_ARRANGE_METRICS:
      return action.payload.arrangeMetrics.slice();

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

export function showSpecialCells (state = SHOW_SPECIAL_CELLS, action) {
  switch (action.type) {
    case SET_SHOW_SPECIAL_CELLS:
      return action.payload.showSpecialCells;

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
  animation,
  arrangeMetrics,
  cellSize,
  coverDispMode,
  config,
  showSpecialCells
});
