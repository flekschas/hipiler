import { Scene } from 'three';

import {
  CELL_SIZE,
  GRID_SIZE,
  MATRIX_ORIENTATION_INITIAL
} from 'components/fragments/fragments-defaults';

import pilesColors from 'components/fragments/pile-colors';


const State = {
  activeMatrixInPileIndex: undefined,
  activePile: undefined,
  adjacentDistances: undefined,
  cellSize: CELL_SIZE,
  gridSize: GRID_SIZE,
  colorsIdx: {},
  colorsAvailable: pilesColors.categorical.map((color, index) => index),
  dataMeasuresMax: {},
  dataMeasuresMin: {},
  dragActive: false,
  draggingMatrix: undefined,
  dragPile: undefined,
  dynamicdata: undefined,
  focusNodes: [],
  font: undefined,
  graphMatrices: [],
  gridCellHeightInclSpacing: 0,
  gridCellHeightInclSpacingHalf: 0,
  gridCellWidthInclSpacing: 0,
  gridCellWidthInclSpacingHalf: 0,
  hoveredCell: undefined,
  hoveredGapPile: undefined,
  hoveredMatrix: undefined,
  hoveredPile: undefined,
  hoveredTool: undefined,
  lassoObject: undefined,
  matrices: [],
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
  nodes: [],
  openedPileMatrices: [],
  openedPileRoot: undefined,
  pileMeshes: [],
  pileMeshesTrash: [],
  piles: [],
  pilesIdx: {},
  pilesTrash: [],
  pilingMethod: 'clustered',
  previousHoveredPile: undefined,
  scale: 1,
  scene: new Scene(),
  selectedMatrices: [],
  strandArrowRects: [],
  strandArrowRectsTrash: [],
  trashIsActive: false,
  visiblePileTools: []
};

const state = Object.create(State);

export default state;
