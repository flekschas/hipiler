import { Scene } from 'three';

import {
  MATRIX_ORIENTATION_INITIAL
} from 'components/fragments/fragments-defaults';


const State = {
  activeMatrixInPileIndex: undefined,
  activePile: undefined,
  adjacentDistances: undefined,
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
  scene: new Scene(),
  selectedMatrices: [],
  strandArrowRects: [],
  strandArrowRectsTrash: [],
  visiblePileTools: []
};

const state = Object.create(State);

export default state;
