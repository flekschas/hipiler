export const DEPILE = 'DEPILE';

export const depile = pile => ({
  type: DEPILE,
  payload: { pile }
});

export const SET_ARRANGE_METRICS = 'SET_ARRANGE_METRICS';

export const setArrangeMetrics = arrangeMetrics => ({
  type: SET_ARRANGE_METRICS,
  payload: { arrangeMetrics }
});

export const SET_CELL_SIZE = 'SET_CELL_SIZE';

export const setCellSize = cellSize => ({
  type: SET_CELL_SIZE,
  payload: { cellSize }
});

export const SET_COVER_DISP_MODE = 'SET_COVER_DISP_MODE';

export const setCoverDispMode = allPilesDisplayMode => ({
  type: SET_COVER_DISP_MODE,
  payload: { allPilesDisplayMode }
});

export const SET_PILE_MODE = 'SET_PILE_MODE';

export const setPileMode = (mode, pile) => ({
  type: SET_PILE_MODE,
  payload: { mode, pile }
});

export const UPDATE_FGM_CONFIG = 'UPDATE_FGM_CONFIG';

export const updateConfig = config => ({
  type: UPDATE_FGM_CONFIG,
  payload: { config }
});
