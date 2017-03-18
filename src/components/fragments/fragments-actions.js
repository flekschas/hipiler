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

export const SET_ARRANGE_MEASURES = 'SET_ARRANGE_MEASURES';

export const setArrangeMeasures = arrangeMeasures => ({
  type: SET_ARRANGE_MEASURES,
  payload: { arrangeMeasures }
});

export const SET_CELL_SIZE = 'SET_CELL_SIZE';

export const setCellSize = cellSize => ({
  type: SET_CELL_SIZE,
  payload: { cellSize }
});

export const setCellAndGridSize = size => (dispath) => {
  dispath(setCellSize(size));
  dispath(setGridSize(size));
};

export const SET_COVER_DISP_MODE = 'SET_COVER_DISP_MODE';

export const setCoverDispMode = coverDispMode => ({
  type: SET_COVER_DISP_MODE,
  payload: { coverDispMode }
});

export const SET_GRID_CELL_SIZE_LOCK = 'SET_GRID_CELL_SIZE_LOCK';

export const setGridCellSizeLock = gridCellSizeLock => ({
  type: SET_GRID_CELL_SIZE_LOCK,
  payload: { gridCellSizeLock }
});

export const setGridCellSizeLockAndGridSize = config => (dispath) => {
  dispath(setGridCellSizeLock(config.gridCellSizeLock));
  dispath(setGridSize(config.gridSize));
};

export const SET_GRID_SIZE = 'SET_GRID_SIZE';

export const setGridSize = gridSize => ({
  type: SET_GRID_SIZE,
  payload: { gridSize }
});

export const SET_HILBERT_CURVE = 'SET_HILBERT_CURVE';

export const setHilbertCurve = hilbertCurve => ({
  type: SET_HILBERT_CURVE,
  payload: { hilbertCurve }
});

export const SET_HIGLASS_SUB_SELECTION = 'SET_HIGLASS_SUB_SELECTION';

export const setHiglassSubSelection = higlassSubSelection => ({
  type: SET_HIGLASS_SUB_SELECTION,
  payload: { higlassSubSelection }
});

export const SET_LASSO_IS_ROUND = 'SET_LASSO_IS_ROUND';

export const setLassoIsRound = lassoIsRound => ({
  type: SET_LASSO_IS_ROUND,
  payload: { lassoIsRound }
});

export const SET_MATRICES_COLORS = 'SET_MATRICES_COLORS';

export const setMatricesColors = matricesColors => ({
  type: SET_MATRICES_COLORS,
  payload: { matricesColors }
});

export const SET_MATRIX_ORIENTATION = 'SET_MATRIX_ORIENTATION';

export const setMatrixOrientation = orientation => ({
  type: SET_MATRIX_ORIENTATION,
  payload: { orientation }
});

export const SET_MATRIX_FRAME_ENCODING = 'SET_MATRIX_FRAME_ENCODING';

export const setMatrixFrameEncoding = frameEncoding => ({
  type: SET_MATRIX_FRAME_ENCODING,
  payload: { frameEncoding }
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

export const stackPiles = pileStacks => ({
  type: STACK_PILES,
  payload: { pileStacks }
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
