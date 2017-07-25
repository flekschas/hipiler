import { Scene } from 'three';

import {
  CELL_SIZE,
  GRID_SIZE,
  LOG_TRANSFORM,
  MATRIX_ORIENTATION_INITIAL,
  MODE_AVERAGE
} from 'components/fragments/fragments-defaults';

import deepClone from 'utils/deep-clone';

const DEFAULT_STATE = {
  annotations: {},
  adjacentDistances: undefined,
  cellSize: CELL_SIZE,
  gridSize: GRID_SIZE,
  colorsIdx: {},
  coverDispMode: MODE_AVERAGE,
  dataMeasuresMax: {},
  dataMeasuresMin: {},
  dragActive: false,
  draggingMatrix: undefined,
  dragPile: undefined,
  font: undefined,
  graphMatrices: [],
  gridCellHeightInclSpacing: 0,
  gridCellHeightInclSpacingHalf: 0,
  gridCellWidthInclSpacing: 0,
  gridCellWidthInclSpacingHalf: 0,
  isHilbertCurve: false,
  hoveredCell: undefined,
  hoveredGapPile: undefined,
  hoveredMatrix: undefined,
  hoveredPile: undefined,
  hoveredTool: undefined,
  isLayout2d: false,
  lassoObject: undefined,
  logTransform: LOG_TRANSFORM,
  matrices: [],
  matricesIdx: {},
  matricesPileIndex: [],
  matrixFrameEncoding: undefined,
  matrixGapMouseover: false,
  matrixOrientation: MATRIX_ORIENTATION_INITIAL,
  matrixPos: [],
  matrixStrings: '',
  matrixWidth: undefined,
  matrixWidthHalf: undefined,
  maxDistance: 0,
  measures: [],
  mouse: undefined,
  pileMeshes: [],
  pileMeshesTrash: [],
  piles: [],
  pilesIdx: {},
  pilesInspection: [],
  pilesIdxInspection: {},
  pilesTrash: [],
  previewScale: 1,
  previousHoveredPile: undefined,
  reject: {},
  resolve: {},
  scale: 1,
  selectedMatrices: [],
  selectedPile: undefined,
  strandArrows: [],
  strandArrowsTrash: [],
  trashIsActive: false,
  userSpecificCategories: [],
  workerClusterfck: undefined
};

DEFAULT_STATE.isReady = new Promise((resolve, reject) => {
  DEFAULT_STATE.resolve.isReady = resolve;
  DEFAULT_STATE.reject.isReady = reject;
});


class State {
  constructor () {
    this.reset();
  }

  get () {
    return this.state;
  }

  reset () {
    this.state = deepClone(DEFAULT_STATE);
    this.state.scene = new Scene();
  }
}

const state = new State();

export default state;
