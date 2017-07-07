import { Scene } from 'three';

import {
  CELL_SIZE,
  GRID_SIZE,
  MATRIX_ORIENTATION_INITIAL,
  MODE_AVERAGE
} from 'components/fragments/fragments-defaults';


const State = {
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
  scale: 1,
  scene: new Scene(),
  selectedMatrices: [],
  strandArrows: [],
  strandArrowsTrash: [],
  trashIsActive: false,
  workerClusterfck: undefined
};

const state = Object.create(State);

export default state;
