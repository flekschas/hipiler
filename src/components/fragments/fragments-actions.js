export const ADD_PILES = 'ADD_PILES';

export const addPiles = piles => ({
  type: ADD_PILES,
  payload: { piles }
});

export const DISPERSE_PILES = 'DISPERSE_PILES';

export const dispersePiles = piles => ({
  type: DISPERSE_PILES,
  payload: { piles }
});

export const RECOVER_PILES = 'RECOVER_PILES';

export const recoverPiles = piles => ({
  type: RECOVER_PILES,
  payload: { piles }
});

export const REMOVE_PILES = 'REMOVE_PILES';

export const removePiles = piles => ({
  type: REMOVE_PILES,
  payload: { piles }
});

export const SET_ANIMATION = 'SET_ANIMATION';

export const setAnimation = animation => ({
  type: SET_ANIMATION,
  payload: { animation: !!animation }
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

export const setCoverDispMode = coverDispMode => ({
  type: SET_COVER_DISP_MODE,
  payload: { coverDispMode }
});

export const SET_LASSO_IS_ROUND = 'SET_LASSO_IS_ROUND';

export const setLassoIsRound = lassoIsRound => ({
  type: SET_LASSO_IS_ROUND,
  payload: { lassoIsRound }
});

export const SET_PILE_MODE = 'SET_PILE_MODE';

export const setPileMode = (mode, pile) => ({
  type: SET_PILE_MODE,
  payload: { mode, pile }
});

export const SET_PILES = 'SET_PILES';

export const setPiles = piles => ({
  type: SET_PILES,
  payload: { piles }
});

export const SET_SHOW_SPECIAL_CELLS = 'SET_SHOW_SPECIAL_CELLS';

export const setShowSpecialCells = showSpecialCells => ({
  type: SET_SHOW_SPECIAL_CELLS,
  payload: { showSpecialCells }
});

export const STACK_PILES = 'STACK_PILES';

export const stackPiles = (targetPile, sourcePiles) => ({
  type: STACK_PILES,
  payload: { targetPile, sourcePiles }
});

export const TRASH_PILES = 'TRASH_PILES';

export const trashPiles = piles => ({
  type: TRASH_PILES,
  payload: { piles }
});

export const UPDATE_FGM_CONFIG = 'UPDATE_FGM_CONFIG';

export const updateConfig = config => ({
  type: UPDATE_FGM_CONFIG,
  payload: { config }
});
