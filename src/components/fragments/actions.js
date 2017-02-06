export const DEPILE = 'DEPILE';

export const depile = pile => ({
  type: DEPILE,
  payload: { pile }
});

export const UPDATE_FGM_CONFIG = 'UPDATE_FGM_CONFIG';

export const updateConfig = config => ({
  type: UPDATE_FGM_CONFIG,
  payload: { config }
});

export const SET_PILE_MODE = 'SET_PILE_MODE';

export const setPileMode = (mode, pile) => ({
  type: SET_PILE_MODE,
  payload: { mode, pile }
});
