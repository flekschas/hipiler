import { combineReducers } from 'redux';

import {
  SET_CELL_SIZE,
  SET_ALL_PILES_DISPLAY_MODE,
  UPDATE_FGM_CONFIG
} from 'components/fragments/fragments-actions';

import {
  CELL_SIZE,
  CONFIG,
  MODE_MEAN
} from 'components/fragments/fragments-defaults';

import deepClone from 'utils/deep-clone';


export function allPilesDisplayMode (state = MODE_MEAN, action) {
  switch (action.type) {
    case SET_ALL_PILES_DISPLAY_MODE:
      return action.payload.allPilesDisplayMode;

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

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_FGM_CONFIG:
      return { ...state, ...deepClone(action.payload.config) };

    default:
      return state;
  }
}


export default combineReducers({
  allPilesDisplayMode,
  cellSize,
  config
});
