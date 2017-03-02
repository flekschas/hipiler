import { combineReducers } from 'redux';

import {
  SET_GRAYSCALE,
  SET_FRAGMENTS_HIGHLIGHT,
  SET_INTERACTIONS,
  UPDATE_HGL_CONFIG
} from 'components/higlass/higlass-actions';

import {
  CONFIG,
  FRAGMENTS_HIGHLIGHT,
  GRAYSCALE,
  INTERACTIONS
} from 'components/higlass/higlass-defaults';

import deepClone from 'utils/deep-clone';

function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_HGL_CONFIG:
      return { ...state, ...deepClone(action.payload.config) };

    default:
      return state;
  }
}

function fragmentsHighlight (state = FRAGMENTS_HIGHLIGHT, action) {
  switch (action.type) {
    case SET_FRAGMENTS_HIGHLIGHT:
      return action.payload.highlight;

    default:
      return state;
  }
}

function grayscale (state = GRAYSCALE, action) {
  switch (action.type) {
    case SET_GRAYSCALE:
      return action.payload.grayscale;

    default:
      return state;
  }
}

function interactions (state = INTERACTIONS, action) {
  switch (action.type) {
    case SET_INTERACTIONS:
      return action.payload.interactions;

    default:
      return state;
  }
}

export default combineReducers({
  config,
  fragmentsHighlight,
  grayscale,
  interactions
});
