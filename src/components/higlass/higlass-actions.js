export const SET_GRAYSCALE = 'SET_GRAYSCALE';

export const setGrayscale = grayscale => ({
  type: SET_GRAYSCALE,
  payload: { grayscale }
});

export const SET_FRAGMENTS_HIGHLIGHT = 'SET_FRAGMENTS_HIGHLIGHT';

export const setFragmentsHighlight = highlight => ({
  type: SET_FRAGMENTS_HIGHLIGHT,
  payload: { highlight }
});

export const SET_FRAGMENTS_SELECTION = 'SET_FRAGMENTS_SELECTION';

export const setFragmentsSelection = selection => ({
  type: SET_FRAGMENTS_SELECTION,
  payload: { selection }
});

export const SET_INTERACTIONS = 'SET_INTERACTIONS';

export const setInteractions = interactions => ({
  type: SET_INTERACTIONS,
  payload: { interactions }
});

export const SET_SELECTION_VIEW = 'SET_SELECTION_VIEW';

export const setSelectionView = domains => ({
  type: SET_SELECTION_VIEW,
  payload: { domains }
});

export const UPDATE_HGL_CONFIG = 'UPDATE_HGL_CONFIG';

export const updateConfig = config => ({
  type: UPDATE_HGL_CONFIG,
  payload: {
    config
  }
});
