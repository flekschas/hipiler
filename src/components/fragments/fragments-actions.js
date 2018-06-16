import { batchActions } from 'redux-batched-actions';

export const ADD_PILES = 'ADD_PILES';

export const addPiles = piles => ({
  type: ADD_PILES,
  payload: { piles }
});

export const ANNOTATE_PILES = 'ANNOTATE_PILES';

export const annotatePiles = (piles, areSingle, annotations) => ({
  type: ANNOTATE_PILES,
  payload: { piles, areSingle, annotations }
});

export const CLOSE_PILES_INSPECTION = 'CLOSE_PILES_INSPECTION';

export const closePilesInspection = () => ({
  type: CLOSE_PILES_INSPECTION
});

export const closePilesInspectionSelect = piles => batchActions([
  selectPile(null),
  closePilesInspection()
]);

export const SET_DATA_DIMS = 'SET_DATA_DIMS';

export const setDataDims = dataDims => ({
  type: SET_DATA_DIMS,
  payload: { dataDims }
});

export const SET_DATA_PADDING = 'SET_DATA_PADDING';

export const setDataPadding = dataPadding => ({
  type: SET_DATA_PADDING,
  payload: { dataPadding }
});

export const SET_DATA_PERCENTILE = 'SET_DATA_PERCENTILE';

export const setDataPercentile = dataPercentile => ({
  type: SET_DATA_PERCENTILE,
  payload: { dataPercentile }
});

export const SET_DATA_IGNORE_DIAGS = 'SET_DATA_IGNORE_DIAGS';

export const setDataIgnoreDiags = dataIgnoreDiags => ({
  type: SET_DATA_IGNORE_DIAGS,
  payload: { dataIgnoreDiags }
});

export const DISPERSE_PILES = 'DISPERSE_PILES';

export const dispersePiles = piles => ({
  type: DISPERSE_PILES,
  payload: { piles }
});

export const dispersePilesAnnotations = piles => batchActions([
  annotatePiles(piles, piles.map(pile => false), piles.map(pile => undefined)),
  dispersePiles(piles)
]);

export const dispersePilesAnnoSelect = piles => batchActions([
  annotatePiles(piles, piles.map(pile => false), piles.map(pile => undefined)),
  selectPile(null),
  dispersePiles(piles)
]);

export const DISPERSE_PILES_INSPECTION = 'DISPERSE_PILES_INSPECTION';

export const dispersePilesInspection = piles => ({
  type: DISPERSE_PILES_INSPECTION,
  payload: { piles }
});

export const INSPECT_PILES = 'INSPECT_PILES';

export const inspectPiles = piles => ({
  type: INSPECT_PILES,
  payload: { piles }
});

export const inspectPilesSelect = piles => batchActions([
  selectPile(null),
  inspectPiles(piles)
]);

export const RECOVER_PILES = 'RECOVER_PILES';

export const recoverPiles = piles => ({
  type: RECOVER_PILES,
  payload: { piles }
});

export const REMOVE_PILES_INSPECTION = 'REMOVE_PILES_INSPECTION';

export const removePilesInspection = (piles, recursive) => ({
  type: REMOVE_PILES_INSPECTION,
  payload: { piles, recursive }
});

export const SELECT_PILE = 'SELECT_PILE';

export const selectPile = pile => ({
  type: SELECT_PILE,
  payload: { pile }
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

export const setCellAndGridSize = size => batchActions([
  setCellSize(size),
  setGridSize(size)
]);

export const SET_COLOR_SCALE_FROM = 'SET_COLOR_SCALE_FROM';

export const setColorScaleFrom = colorScaleFrom => ({
  type: SET_COLOR_SCALE_FROM,
  payload: { colorScaleFrom }
});

export const SET_COLOR_SCALE_TO = 'SET_COLOR_SCALE_TO';

export const setColorScaleTo = colorScaleTo => ({
  type: SET_COLOR_SCALE_TO,
  payload: { colorScaleTo }
});

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

export const setGridCellSizeLockAndGridSize = config => batchActions([
  setGridCellSizeLock(config.gridCellSizeLock),
  setGridSize(config.gridSize)
]);

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

export const SET_LOG_TRANSFORM = 'SET_LOG_TRANSFORM';

export const setLogTransform = logTransform => ({
  type: SET_LOG_TRANSFORM,
  payload: { logTransform }
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

export const SET_COLOR_MAP = 'SET_COLOR_MAP';

export const setColorMap = colorMap => ({
  type: SET_COLOR_MAP,
  payload: { colorMap }
});

export const SET_SHOW_SPECIAL_CELLS = 'SET_SHOW_SPECIAL_CELLS';

export const setShowSpecialCells = showSpecialCells => ({
  type: SET_SHOW_SPECIAL_CELLS,
  payload: { showSpecialCells }
});

export const SET_TSNE_EARLY_EXAGGERATION = 'SET_TSNE_EARLY_EXAGGERATION';

export const setTsneEarlyExaggeration = earlyExaggeration => ({
  type: SET_TSNE_EARLY_EXAGGERATION,
  payload: { earlyExaggeration }
});

export const SET_TSNE_ITERATIONS = 'SET_TSNE_ITERATIONS';

export const setTsneIterations = iterations => ({
  type: SET_TSNE_ITERATIONS,
  payload: { iterations }
});

export const SET_TSNE_LEARNING_RATE = 'SET_TSNE_LEARNING_RATE';

export const setTsneLearningRate = learningRate => ({
  type: SET_TSNE_LEARNING_RATE,
  payload: { learningRate }
});

export const SET_TSNE_PERPLEXITY = 'SET_TSNE_PERPLEXITY';

export const setTsnePerplexity = perplexity => ({
  type: SET_TSNE_PERPLEXITY,
  payload: { perplexity }
});

export const SPLIT_PILES = 'SPLIT_PILES';

export const splitPiles = piles => ({
  type: SPLIT_PILES,
  payload: { piles }
});

export const SPLIT_PILES_INSPECTION = 'SPLIT_PILES_INSPECTION';

export const splitPilesInspection = (
  sourcePile, matrices, piles
) => {
  const obj = {};
  obj[sourcePile] = matrices;

  return batchActions([
    splitPiles(obj),
    removePilesInspection(piles)
  ]);
};

export const STACK_PILES = 'STACK_PILES';

export const stackPiles = pileStacks => ({
  type: STACK_PILES,
  payload: { pileStacks }
});

export const stackPilesSelect = (pileStacks, pileSelect) => batchActions([
  stackPiles(pileStacks),
  selectPile(pileSelect)
]);

export const STACK_PILES_INSPECTION = 'STACK_PILES_INSPECTION';

export const stackPilesInspection = pileStacks => ({
  type: STACK_PILES_INSPECTION,
  payload: { pileStacks }
});

export const TRASH_PILES = 'TRASH_PILES';

export const trashPiles = piles => ({
  type: TRASH_PILES,
  payload: { piles }
});

export const TRASH_PILES_INSPECTION = 'TRASH_PILES_INSPECTION';

export const trashPilesInspection = (
  sourcePile, matrices, piles
) => {
  const obj = {};
  obj[sourcePile] = matrices;

  return batchActions([
    splitPiles(obj),
    removePilesInspection(piles, true),
    trashPiles(matrices.map(matrixId => `${matrixId}`))
  ]);
};

export const UPDATE_FGM_CONFIG = 'UPDATE_FGM_CONFIG';

export const updateConfig = config => ({
  type: UPDATE_FGM_CONFIG,
  payload: { config }
});
