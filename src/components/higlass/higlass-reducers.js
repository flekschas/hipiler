import { combineReducers } from 'redux';

import {
  SET_GRAYSCALE,
  SET_FRAGMENTS_HIGHLIGHT,
  SET_FRAGMENTS_SELECTION,
  SET_FRAGMENTS_SELECTION_FADE_OUT,
  SET_INTERACTIONS,
  SET_SELECTION_VIEW,
  UPDATE_HGL_CONFIG
} from 'components/higlass/higlass-actions';

import {
  CONFIG,
  FRAGMENTS_HIGHLIGHT,
  FRAGMENTS_SELECTION,
  FRAGMENTS_SELECTION_FADE_OUT,
  GRAYSCALE,
  INTERACTIONS,
  SELECTION_VIEW
} from 'components/higlass/higlass-defaults';

import deepClone from 'utils/deep-clone';

function config (state = CONFIG, action) {
  switch (action.type) {
    case UPDATE_HGL_CONFIG:
      if (action.payload.config) return deepClone(action.payload.config);
      return state;

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

function fragmentsSelection (state = FRAGMENTS_SELECTION, action) {
  switch (action.type) {
    case SET_FRAGMENTS_SELECTION:
      return action.payload.selection;

    default:
      return state;
  }
}

function fragmentsSelectionFadeOut (
  state = FRAGMENTS_SELECTION_FADE_OUT, action
) {
  switch (action.type) {
    case SET_FRAGMENTS_SELECTION_FADE_OUT:
      return action.payload.selectionFadeOut;

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

function selectionView (state = SELECTION_VIEW, action) {
  switch (action.type) {
    case SET_SELECTION_VIEW:
      return action.payload.domains.slice();

    default:
      return state;
  }
}

export default combineReducers({
  config,
  fragmentsHighlight,
  fragmentsSelection,
  fragmentsSelectionFadeOut,
  grayscale,
  interactions,
  selectionView
});
