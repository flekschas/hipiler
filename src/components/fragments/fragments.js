// Aurelia
import {
  bindable,
  inject,
  LogManager
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

// Third party
import { json, queue, scaleLinear, text } from 'd3';
import hull from 'hull';
import {
  DoubleSide,
  FontLoader,
  Mesh,
  NormalBlending,
  OrthographicCamera,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';

// Injectables
import ChromInfo from 'services/chrom-info';
import States from 'services/states';

// Utils etc.
import {
  dispersePiles,
  setAnimation,
  setArrangeMeasures,
  setCellSize,
  setCellAndGridSize,
  setCoverDispMode,
  setGridCellSizeLock,
  setGridCellSizeLockAndGridSize,
  setGridSize,
  setHilbertCurve,
  setHiglassSubSelection,
  setLassoIsRound,
  setMatricesColors,
  setMatrixFrameEncoding,
  setMatrixOrientation,
  setPiles,
  setShowSpecialCells,
  stackPiles
} from 'components/fragments/fragments-actions';

import {
  ARRANGE_MEASURES,
  CAT_DATASET,
  CAT_ZOOMOUT_LEVEL,
  CLICK_DELAY_TIME,
  CLUSTER_TSNE,
  DBL_CLICK_DELAY_TIME,
  DURATION,
  FONT_URL,
  HIGHLIGHT_FRAME_LINE_WIDTH,
  LINE,
  LASSO_MATERIAL,
  LASSO_MIN_MOVE,
  MARGIN_BOTTOM,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP,
  MATRIX_FRAME_ENCODING,
  MATRIX_FRAME_THICKNESS_MAX,
  MATRIX_GAP_HORIZONTAL,
  MATRIX_GAP_VERTICAL,
  MATRIX_ORIENTATION_3_TO_5,
  MATRIX_ORIENTATION_5_TO_3,
  MATRIX_ORIENTATION_INITIAL,
  MATRIX_ORIENTATION_UNDEF,
  MODE_MAD,
  MODE_MEAN,
  MODE_STD,
  PILE_AREA_BORDER,
  PILE_AREA_BG,
  PILE_AREA_POINTS,
  PILE_LABEL_HEIGHT,
  PREVIEW_MAX,
  PREVIEW_SIZE,
  WEB_GL_CONFIG,
  Z_BASE,
  Z_DRAG,
  Z_HIGHLIGHT,
  Z_HIGHLIGHT_AREA,
  Z_LASSO,
  Z_STACK_PILE_TARGET,
  ZOOM_DELAY_TIME
} from 'components/fragments/fragments-defaults';

import fgmState from 'components/fragments/fragments-state';

import Pile from 'components/fragments/pile';

import Matrix from 'components/fragments/matrix';

import {
  calculateDistances,
  createChMap,
  createRectFrame,
  is2d
} from 'components/fragments/fragments-utils';

import { EVENT_BASE_NAME } from 'components/multi-select/multi-select-defaults';

import COLORS from 'configs/colors';

import arraysEqual from 'utils/arrays-equal';
import hilbertCurve from 'utils/hilbert-curve';
import { requestNextAnimationFrame } from 'utils/request-animation-frame';

const logger = LogManager.getLogger('fragments');

/**
 * Sort wrapper function for `sortAsc`, which allows to defined the sort order.
 *
 * @param {number} sortOrder - `1` is ascending and `-1` is descending.
 * @return {function} Compare function.
 */
const sortByValue = (sortOrder = 1) => (a, b) => sortAsc(a, b) * sortOrder;

/**
 * Sort ascending by value.
 *
 * @param {object} a - First value to be compared.
 * @param {object} b - First value to be compared.
 * @return {number} `1` if `b` is larger than `a`, `-1` if it's the opposite.
 */
const sortAsc = (a, b) => {
  if (a.value < b.value) {
    return -1;
  }

  if (b.value < a.value) {
    return 1;
  }

  // A's and B's value are identical, use their original ID to ensure
  // stable sorting.
  if (a.id < b.id) {
    return -1;
  }

  return 1;
};

@inject(ChromInfo, EventAggregator, States)
export class Fragments {
  @bindable baseElIsInit = false;

  constructor (chromInfo, eventAggregator, states) {
    this.event = eventAggregator;
    this.chromInfo = chromInfo;

    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.arrangeMeasures = [];
    this.attrsCatOther = [];
    this.clusterPos = {};
    this.colorsMatrixIdx = {};
    this.colorsUsed = [];
    this.maxDistance = 0;
    this.pilingMethod = 'clustered';
    this.matrixStrings = '';
    this.matrixPos = []; // index of pile in layout array
    this.matrices = []; // contains all matrices
    this.matricesPileIndex = []; // contains pile index for each matrix.
    this.selectedMatrices = [];
    this.dragActive = false;
    this.openedPileRoot = undefined;
    this.openedPileMatrices = [];
    this.pilesZoomed = {};
    this.plotWindowCss = {};
    this.scrollTop = 0;
    this.shiftDown = false;
    this.allPileOrdering = [];
     // Array containing the orderings for all piles, when not all nodes are
     // focused on.
    this.focusNodeAllPileOrdering = [];
    this.dataMeasures = {};

    this.nodes = [];
    this.focusNodes = [];  // currently visible nodes (changed by the user)

    this._isLoadedSession = false;
    this._isSavedSession = false;

    this.isGridShown = false;
    this.isGridShownCols = [];
    this.isGridShownRows = [];

    this.pileIDCount = 0;
    this.startPile = 0;
    this.maxValue = 0;
    this.fragDims = 0;  // Fragment dimensions

    // If the user changes the focus nodes, matrix similarity must be recalculated
    // before automatic piling. Distance calculation is performed on the server.
    this.dMat = [];
    this.pdMat = [];  // contains similarity between piles
    this.pdMax = 0;

    this.keyAltDownTime = 0;

    this.pilingAnimations = [];

    this.mouseIsDown = false;
    this.lassoIsActive = false;
    this.isLassoRectActive = false;
    this.isLassoRoundActive = false;
    this.isPileInspection = false;
    this.mouseWentDown = false;
    fgmState.showSpecialCells = false;
    this.pileMenuPosition = {};

    this.isLoading = true;

    this.mouseClickCounter = 0;

    fgmState.workerClusterfck = this.createWorkerClusterfck();

    this.arrangeMeasuresAccessPath = [
      'decompose', 'fragments', 'arrangeMeasures'
    ];

    this.attrsCatReq = [{
      id: CAT_DATASET,
      name: 'Dataset'
    }, {
      id: CAT_ZOOMOUT_LEVEL,
      name: 'Zoomout Level'
    }];

    this.coverDispModes = [{
      id: MODE_MEAN,
      name: 'Mean'
    }, {
      id: MODE_MAD,
      name: 'Mean Avg. Dev.'
    }, {
      id: MODE_STD,
      name: 'Standard Dev.'
    }];

    this.matrixOrientations = [{
      id: MATRIX_ORIENTATION_UNDEF,
      name: '---'
    }, {
      id: MATRIX_ORIENTATION_INITIAL,
      name: 'Intial'
    }, {
      id: MATRIX_ORIENTATION_5_TO_3,
      name: '5\' to 3\''
    }, {
      id: MATRIX_ORIENTATION_3_TO_5,
      name: '3\' to 5\''
    }];

    this.arrangeSelectedEventId = 'fgm.arrange';

    this.event.subscribe(
      'app.keyUpD',
      this.toggleCoverDispMode.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.coverDispMode',
      this.changeCoverDispMode.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.dispersePiles',
      this.dispersePilesHandler.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.inspectPile',
      this.inspectPile.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.pileAssignColor',
      this.pileAssignColor.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.pileAssignBW',
      this.pileAssignBW.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.removePileArea',
      this.removePileArea.bind(this)
    );

    // The following setup allows us to imitate deferred objects. I.e., we can
    // resolve promises outside their scope.
    this.resolve = {};
    this.reject = {};

    this.isAttached = new Promise((resolve, reject) => {
      this.resolve.isAttached = resolve;
      this.reject.isAttached = reject;
    });

    this.isBaseElInit = new Promise((resolve, reject) => {
      this.resolve.isBaseElInit = resolve;
      this.reject.isBaseElInit = reject;
    });

    this.isDataLoaded = new Promise((resolve, reject) => {
      this.resolve.isDataLoaded = resolve;
      this.reject.isDataLoaded = reject;
    });

    this.isFontLoaded = new Promise((resolve, reject) => {
      this.resolve.isFontLoaded = resolve;
      this.reject.isFontLoaded = reject;
    });

    this.isInitBase = new Promise((resolve, reject) => {
      this.resolve.isInitBase = resolve;
      this.reject.isInitBase = reject;
    });

    this.isInitFully = new Promise((resolve, reject) => {
      this.resolve.isInitFully = resolve;
      this.reject.isInitFully = reject;
    });

    this.update();
    this.loadFont();

    Promise
      .all([this.isAttached, this.isBaseElInit])
      .then(() => { this.init(); })
      .catch((error) => {
        logger.error('Failed to initialize the fragment plot', error);
      });

    Promise
      .all([this.isDataLoaded, this.isFontLoaded, this.isInitBase])
      .then(() => { this.initPlot(this.data); })
      .catch((error) => {
        logger.error('Failed to initialize the fragment plot', error);
      });

    Promise
      .all([this.chromInfo.ready, this.isInitFully])
      .then(() => {
        this.matricesCalcGlobalPos();

        if (this.subSelectingPiles) {
          this.determinMatrixVisibility();
        }
      })
      .catch((error) => {
        logger.error('Failed to calculate global matrix positions', error);
      });

    this.checkBaseElIsInit();

    fgmState.render = this.render;
  }

  attached () {
    this.resolve.isAttached();
  }

  baseElIsInitChanged () {
    this.checkBaseElIsInit();
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  get cellSize () {
    return fgmState.cellSize * (fgmState.trashIsActive ? 1 : fgmState.scale);
  }

  get chromInfoData () {
    return this.chromInfo.get();
  }

  get gridSize () {
    let gridSize = fgmState.gridSize;

    if (this.gridSizeTmp) {
      gridSize = this.gridSizeTmp;
    }

    return gridSize * (fgmState.trashIsActive ? 1 : fgmState.scale);
  }

  get isDataClustered () {
    return (
      this.arrangeMeasures.length && this.arrangeMeasures[0][0] === '_'
    ) && !fgmState.trashIsActive;
  }

  get isErrored () {
    return this._isErrored;
  }

  set isErrored (value) {
    if (value && this.isLoading) {
      this.isLoading = false;
    }

    this._isErrored = !!value;
  }

  get isInitialized () {
    return this._isInitialized;
  }

  set isInitialized (value) {
    if (value && this.isLoading) {
      this.isLoading = false;
    }

    this._isInitialized = !!value;
  }

  get isLassoActive () {
    return this.isLassoRectActive && this.isLassoRoundActive;
  }

  get isLayout2d () {
    return fgmState.isLayout2d && !fgmState.trashIsActive;
  }

  get isLayout1d () {
    return !fgmState.isLayout2d && !fgmState.isLayoutMd;
  }

  get matrixGridWidth () {
    return this.fragDims * this.gridSize;
  }

  get matrixGridWidthHalf () {
    return this.matrixWidth / 2;
  }

  get matrixWidth () {
    return this.fragDims * this.cellSize;
  }

  get matrixWidthHalf () {
    return this.matrixWidth / 2;
  }

  get pilePreviewHeight () {
    return PREVIEW_MAX * this.previewSize;
  }

  get piles () {
    if (fgmState.trashIsActive) {
      return fgmState.pilesTrash;
    }

    if (this.subSelectingPiles) {
      return fgmState.piles;
    }

    return fgmState.piles;
  }

  get pileMeshes () {
    return fgmState.trashIsActive ? fgmState.pileMeshesTrash : fgmState.pileMeshes;
  }

  get plotElDim () {
    return fgmState.plotElDim;
  }

  get previewSize () {
    return this.cellSize * (this.cellSize > 2 ? 1 : PREVIEW_SIZE);
  }

  get rawMatrices () {
    return fgmState.matrices.map(matrix => matrix.matrix);
  }

  get state () {
    return fgmState;
  }

  get strandArrowRects () {
    return this.isTrashed ?
      fgmState.strandArrowRectsTrash : fgmState.strandArrowRects;
  }

  get subSelectingPiles () {
    return this.higlassSubSelection && this.hglSelectionView;
  }

  get trashSize () {
    return fgmState.pilesTrash.length;
  }


  /* ---------------------------- Custom Methods ---------------------------- */


  /**
   * Handles changes of animation
   */
  animationChangeHandler () {
    this.store.dispatch(setAnimation(!fgmState.animation));
  }

  /**
   * Arranges piles according to the given measures.
   *
   * @description
   * This is the entry point for arranging
   *
   * @param {array} piles - All piles.
   * @param {array} measures - Selected measures.
   */
  arrange (piles, measures) {
    const numMeasures = measures.length;

    return new Promise((resolve, reject) => {
      let arranged = false;

      if (!measures || !numMeasures) {
        this.rank(piles);
        arranged = true;
      }

      if (numMeasures === 1 && measures[0][0] !== '_') {
        this.rank(piles, measures[0]);
        arranged = true;
      }

      if (numMeasures === 2) {
        this.scale2dX = scaleLinear()
          .domain([
            fgmState.dataMeasuresMin[measures[0]],
            fgmState.dataMeasuresMax[measures[0]]
          ]).range([0, 1]);

        this.scale2dY = scaleLinear()
          .domain([
            fgmState.dataMeasuresMin[measures[1]],
            fgmState.dataMeasuresMax[measures[1]]
          ]).range([0, 1]);

        arranged = true;
      }

      if (arranged) {
        // Resolve now for 0, 1, and 2D
        resolve();
        return;
      }

      if (numMeasures === 1) {
        // Intrinsic measure starting with `_`, e.g., `_cluster_tsne`
        this.clusterLayout = this.calcLayoutPositionsTsne(piles);
      } else {
        this.clusterLayout = this.calcLayoutPositionsMD(piles, measures);
      }

      this.clusterLayout
        .then((pos) => {
          piles.forEach((pile, index) => {
            this.clusterPos[pile.idNumeric] = {
              x: pos[index][0],
              y: pos[index][1]
            };
          });

          resolve();
        });
    });
  }

  /**
   * Handles changes of arrange measures amd dispatches the appropriate action.
   *
   * @param {array} measures - List of measures to arrange piles.
   */
  arrangeChangeHandler (measures) {
    let arrangeMeasures;

    try {
      arrangeMeasures = measures.map(measure => measure.id);
    } catch (e) {
      arrangeMeasures = [];
    }

    this.store.dispatch(setArrangeMeasures(arrangeMeasures));
  }

  /**
   * Assess max value of data measures of given piles.
   *
   * @param {array} piles - Piles to be assessed.
   */
  assessMeasuresMax (piles = this.piles) {
    // Reset max
    Object.keys(fgmState.dataMeasuresMax).forEach((measureId) => {
      fgmState.dataMeasuresMax[measureId] = 0;
      fgmState.dataMeasuresMin[measureId] = Infinity;
    });

    // Asses max
    piles
      .map(
        pile => pile.pileMatrices.map(
          matrix => Object.keys(matrix.measures).map(
            id => ({ id, value: matrix.measures[id] })
          )
        )
      )
      .reduce((acc, value) => acc.concat(value), [])  // Combine pile matrices
      .reduce((acc, value) => acc.concat(value), [])  // Combine measures
      .forEach((measure) => {
        fgmState.dataMeasuresMax[measure.id] = Math.max(
          fgmState.dataMeasuresMax[measure.id],
          measure.value
        );
        fgmState.dataMeasuresMin[measure.id] = Math.min(
          fgmState.dataMeasuresMin[measure.id],
          measure.value
        );
      });
  }

  /**
   * [calculateDistanceMatrix description]
   *
   * @return {[type]} [description]
   */
  calculateDistanceMatrix () {
    const data = calculateDistances(this.rawMatrices);

    this.dMat = data.distanceMatrix;
    this.pdMat = data.distanceMatrix;
    this.maxDistance = data.maxDistance;
    this.pdMax = this.maxDistance;
  }

  /**
   * Calculate the Euclidean distance.
   *
   * @param {number} startX - Start X position.
   * @param {number} currentX - Current X position.
   * @param {number} startY - Start Y position.
   * @param {number} currentY - Current Y position.
   * @return {number} Eucledian distance.
   */
  calcEuclideanDistance (startX, currentX, startY, currentY) {
    return Math.sqrt((startX - currentX) ** 2) + ((startY - currentY) ** 2);
  }

  /**
   * Calculate Euclidean distance between two matrices.
   *
   * @param {array} matrixA - Matrix A.
   * @param {array} matrixB - Matrix B.
   * @return {number} Euclidean distance between the two matrices.
   */
  calcDistanceEucl (matrixA, matrixB) {
    return Math.sqrt(matrixA.reduce(
      (acc, valueA, index) =>
        acc + ((Math.max(valueA, 0) - Math.max(matrixB[index], 0)) ** 2),
      0
    ));
  }

  /**
   * Set grid properties.
   *
   * @param {boolean} temporary - If `true` is only calculated temporarily.
   */
  calcGrid (temporary) {
    this.getPlotElDim();

    // Raw cell height and width
    this.gridCellHeight = (
      this.matrixGridWidth +
      this.pilePreviewHeight +
      PILE_LABEL_HEIGHT +
      MATRIX_GAP_VERTICAL
    );

    this.gridCellWidth = this.matrixGridWidth + MATRIX_GAP_HORIZONTAL;

    // Columns and rows
    if (this.isLayout2d || this.isLayoutMd) {
      this.gridNumCols = Math.max(Math.floor(
        (this.plotElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
        this.matrixGridWidth
      ), 1);

      this.gridNumRows = Math.max(Math.floor(
        (this.plotElDim.height - MARGIN_TOP - MARGIN_BOTTOM) /
        this.matrixGridWidth
      ), 1);
    } else {
      this.gridNumCols = Math.max(Math.floor(
        (this.plotElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
        this.gridCellWidth
      ), 1);

      // Get closest Hilbert curve level
      this.hilbertCurveLevel = 1;
      if (fgmState.isHilbertCurve) {
        const piles = this.store.getState().present.decompose.fragments.piles;
        const numPiles = Object.keys(piles)
          .filter(pileId => piles[pileId].length)
          .filter(pileId => pileId[0] !== '_').length;

        this.gridNumCols = Math.ceil(Math.sqrt(numPiles));

        this.hilbertCurveLevel = Math.ceil(
          Math.log(this.gridNumCols) / Math.log(2)
        );

        this.gridNumCols = 2 ** this.hilbertCurveLevel;
        this.gridNumRows = this.gridNumCols;

        this.gridCellHeight -= PILE_LABEL_HEIGHT - MATRIX_GAP_VERTICAL;

        // Adjust pile scaling to white space mose efficiently
        const cellWidth = (
          this.plotElDim.width - MARGIN_LEFT - MARGIN_RIGHT
        ) / this.gridNumCols;
        const cellWidthExtra = cellWidth - this.gridCellHeight;

        if (cellWidthExtra > 0) {
          fgmState.scale = 1 + (cellWidthExtra / this.gridCellHeight);
        } else {
          fgmState.scale = 1 + (cellWidthExtra / this.gridCellHeight);
        }
      } else {
        this.gridNumRows = Math.max(Math.floor(
          (this.plotElDim.height - MARGIN_TOP - MARGIN_BOTTOM) /
          this.gridCellHeight
        ), 1);
      }
    }

    if (!temporary) {
      this.visiblePilesMax = this.gridNumCols * this.gridNumRows;
    }

    // Extra spacing
    this.gridCellSpacingHorizontal = (
      this.plotElDim.width - (
        this.gridNumCols * this.gridCellWidth
      )
    ) / this.gridNumCols;

    this.gridCellSpacingVertical = (
      this.plotElDim.height - (
        this.gridNumRows * this.gridCellHeight
      )
    ) / this.gridNumRows;

    // Final cell height and width including spacing
    fgmState.gridCellHeightInclSpacing =
      this.gridCellHeight + this.gridCellSpacingVertical;

    fgmState.gridCellWidthInclSpacing =
      this.gridCellWidth + this.gridCellSpacingHorizontal;

    fgmState.gridCellHeightInclSpacingHalf =
      fgmState.gridCellHeightInclSpacing / 2;

    fgmState.gridCellWidthInclSpacingHalf =
      fgmState.gridCellWidthInclSpacing / 2;

    this.showGridCols = new Array(this.gridNumCols).fill(0);
    this.showGridRows = new Array(this.gridNumRows).fill(0);
  }

  /**
   * Calculate multi-dimensional layout with t-SNE based on measures.
   *
   * @param {array} piles - Array of piles to be arranged.
   * @param {array} measures - Array of measures used for arranging.
   * @return {object} Promise resolving to the snippet positions.
   */
  calcLayoutPositionsMD (piles = this.piles, measures = this.arrangeMeasures) {
    this.isLoading = true;

    if (!this.tsneWorker) {
      this.tSneWorker = this.createWorkerTsne();
    }

    return new Promise((resolve, reject) => {
      const pileMeasures = this.piles.map(
        pile => this.arrangeMeasures.map(
          measure => pile.measures[measure]
        )
      );

      this.tSneWorker
        .then((worker) => {
          const costs = [];
          let pos;

          worker.onmessage = (event) => {
            if (event.data.pos) {
              pos = event.data.pos;
            }

            if (event.data.iterations) {
              costs[event.data.iterations] = event.data.cost;
            }

            if (event.data.stop) {
              logger.debug('t-SNE stopped', event.data);
              worker.terminate();
              this.isLoading = false;
              resolve(pos);
            }
          };

          worker.postMessage({
            nIter: 500,
            // dim: 2,
            perplexity: 20.0,
            // earlyExaggeration: 4.0,
            // learningRate: 100.0,
            // metric: 'euclidean',
            data: pileMeasures
          });
        })
        .catch((error) => {
          logger.error('Couldn\'t create t-SNE worker', error);
        });
    });
  }

  /**
   * Calculate multi-dimensional layout with t-SNE based on the matrices.
   *
   * @param {array} piles - Array of piles to be arranged.
   * @return {object} Promise resolving to the snippet positions.
   */
  calcLayoutPositionsTsne (piles = this.piles) {
    this.isLoading = true;

    if (!this.tsneWorker) {
      this.tSneWorker = this.createWorkerTsne();
    }

    return new Promise((resolve, reject) => {
      this.tSneWorker
        .then((worker) => {
          const costs = [];
          let pos;

          worker.onmessage = (event) => {
            if (event.data.pos) {
              pos = event.data.pos;
            }

            if (event.data.iterations) {
              costs[event.data.iterations] = event.data.cost;
            }

            if (event.data.stop) {
              logger.debug('t-SNE stopped', event.data);
              worker.terminate();
              this.isLoading = false;
              resolve(pos);
            }
          };

          worker.postMessage({
            nIter: 500,
            dim: 2,
            perplexity: 20.0,
            // earlyExaggeration: 4.0,
            // learningRate: 100.0,
            metric: 'euclidean',
            // The t-SNE implementation doesn't understand typed arrays...
            data: this.piles.map(pile => Array.from(pile.avgMatrix))
          });
        })
        .catch((error) => {
          logger.error('Couldn\'t create t-SNE worker', error);
        });
    });
  }

  // /**
  //  * [calculatePiles description]
  //  *
  //  * @param {[type]} value - [description]
  //  * @return {[type]} [description]
  //  */
  // calculatePiles (value) {
  //   this.isLoading = true;

  //   this.setPiling(calculateClusterPiling(value, fgmState.matrices, this.dMat));
  // }

  /**
   * Handle click events
   */
  canvasClickHandler (event) {
    if (this.mouseIsDown) {
      return;
    }

    if (this.hoveredTool) {
      this.hoveredTool.trigger(this.hoveredTool.pile);

      if (this.hoveredTool.unsetHighlightOnClick) {
        this.highlightPile();
      }

      this.render();

      this.hoveredTool = undefined;
    } else if (fgmState.hoveredGapPile) {
      this.pileBackwards(fgmState.hoveredGapPile);
      fgmState.hoveredGapPile = undefined;
    } else if (this.hoveredStrandArrow) {
      this.hoveredStrandArrow.userData.pile.flipMatrix(
        this.hoveredStrandArrow.userData.axis
      ).draw();
    }

    if (fgmState.hoveredPile) {
      this.highlightPile(fgmState.hoveredPile);

      if (fgmState.hoveredPile.scale > 1) {
        this.pilesZoomed[fgmState.hoveredPile.id] = true;
      }
    } else {
      this.showPileMenu();
    }

    this.render();

    requestNextAnimationFrame(() => {
      if (fgmState.hoveredPile) {
        // Show pile location
        this.event.publish(
          'decompose.fgm.pileMouseEnter',
          fgmState.hoveredPile.pileMatrices.map(matrix => matrix.id)
        );
      }
    });
  }

  /**
   * Handle double click events.
   */
  canvasDblClickHandler () {
    // Disabled for now
    // if (
    //   fgmState.hoveredPile &&
    //   fgmState.hoveredPile !== this.openedPile
    // ) {
    //   this.openedPileRoot = fgmState.hoveredPile;
    // } else {
    //   this.openedPile = fgmState.hoveredPile;
    // }

    if (fgmState.hoveredPile) {
      this.dispersePilesHandler([fgmState.hoveredPile]);
      fgmState.hoveredPile = undefined;
    } else {
      Object.keys(this.pilesZoomed).forEach((pileId) => {
        fgmState.pilesIdx[pileId].setScale().frameCreate().draw();
      });
      this.pilesZoomed = {};
    }
  }

  /**
   * Mouse down handler
   *
   * @param {object} event - Event object
   */
  canvasMouseDownHandler (event) {
    event.preventDefault();

    this.mouseWentDown = true;
    this.mouseIsDown = true;
    this.dragStartPos = {
      x: this.mouse.x,
      y: this.mouse.y
    };

    this.mouseDownTime = Date.now();

    if (fgmState.hoveredPile) {
      this.mouseDownDwelling = setTimeout(() => {
        if (fgmState.hoveredPile) {
          fgmState.hoveredPile.frameSetTemp(COLORS.GREEN, 2, true).draw();
        }
        this.render();
      }, ZOOM_DELAY_TIME);
    }
  }

  /**
   * General mouse move handler.
   *
   * @param {object} event - Mouse move event.
   */
  canvasMouseMoveHandler (event) {
    event.preventDefault();

    this.hoveredTool = undefined;
    this.hoveredStrandArrow = undefined;

    fgmState.scene.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    this.mouse.x = (
      ((event.clientX - this.plotElDim.left) / this.plotElDim.width) * 2
    ) - 1;

    this.mouse.y = (
      -((event.clientY - this.plotElDim.top) / this.plotElDim.height) * 2
    ) + 1;

    if (this.dragPile) {
      this.dragPileHandler();
    } else if (
      this.mouseIsDown &&
      fgmState.hoveredPile &&
      this.piles.indexOf(fgmState.hoveredPile) > 0 &&
      !this.lassoIsActive
    ) {
      this.dragPileStartHandler();
    } else {
      this.mouseMoveGeneralHandler();
    }

    this.mouseWentDown = false;
    this.render();
  }

  /**
   * Handle left mouse clicks manually.
   *
   * @description
   * Single and double mouse clicks interfere with mouse up events when
   * listeneing to them separately.
   */
  canvasMouseClickHandler (event) {
    this.mouseDownTimeDelta = Date.now() - this.mouseDownTime;

    if (this.mouseDownTimeDelta < CLICK_DELAY_TIME) {
      this.mouseClickCounter += 1;

      switch (this.mouseClickCounter) {
        case 2:
          clearTimeout(this.mouseClickTimeout);
          this.canvasDblClickHandler();
          this.mouseClickCounter = 0;
          break;

        default:
          this.canvasClickHandler(event);
          this.mouseClickTimeout = setTimeout(() => {
            this.mouseClickCounter = 0;
          }, DBL_CLICK_DELAY_TIME);
          break;
      }
    } else {
      this.mouseClickCounter = 0;

      if (this.isLayout2d && this.mouseDownTimeDelta > ZOOM_DELAY_TIME) {
        if (fgmState.hoveredPile) {
          this.pileZoomed = fgmState.hoveredPile.scaleTo(6).frameCreate().draw();
        }
        this.mouseDownTimeDelta = 0;
      }
    }
  }

  /**
   * Handle right mouse clicks.
   *
   * @param {object} event - Mouse click event.
   */
  canvasContentMenuHandler (event) {
    event.preventDefault();

    this.showPileMenu(fgmState.hoveredPile);
  }

  /**
   * Handle mouse up events on the canvas.
   *
   * @param {object} event - Mouse up event.
   * @param {boolean} mouseLeft - If `true` mouse has left the canvas.
   */
  canvasMouseUpHandler (event, mouseLeft) {
    event.preventDefault();

    fgmState.scene.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    fgmState.scene.remove(this.lassoObject);
    this.mouseIsDown = false;

    clearTimeout(this.mouseDownDwelling);

    let pilesSelected = [];

    if (this.openedPileRoot) {
      this.closeOpenedPile(this.openedPileRoot);
    } else if (this.dragPile) {
      // place pile on top of previous pile
      if (!fgmState.hoveredPile) {
        // Move pile back to original position
        let pos = this.getLayoutPosition(this.dragPile, this.arrangeMeasures);
        this.movePilesAnimated(
          [this.dragPile],
          [{
            x: pos.x + this.matrixWidthHalf,
            y: -pos.y - this.matrixWidthHalf
          }]
        );

        this.dragPile.elevateTo(Z_BASE);
      } else {
        // Pile up the two piles
        this.pileUp({ [fgmState.hoveredPile.id]: [this.dragPile.id] });
      }

      this.dragPile = undefined;
    } else if (this.isLassoRectActive) {
      pilesSelected = this.getLassoRectSelection(
        this.dragStartPos.x, this.mouse.x, this.dragStartPos.y, this.mouse.y
      );
    } else if (this.isLassoRoundActive && this.lassoRoundMinMove) {
      pilesSelected = this.getLassoRoundSelection();
    } else if (!mouseLeft) {
      this.canvasMouseClickHandler(event);
    }

    if (pilesSelected.length > 1) {
      this.pileUp({
        [pilesSelected[0].id]: pilesSelected.slice(1).map(pile => pile.id)
      });
    }

    this.dragStartPos = undefined;
    this.mouseWentDown = false;

    this.lassoIsActive = false;
    this.isLassoRectActive = false;
    this.isLassoRoundActive = false;

    this.render();
  }

  /**
   * Handle mousewheel events
   *
   * @param {object} event - Mousewheel event.
   */
  canvasMouseWheelHandler (event) {
    event.preventDefault();

    if (!this.isLayout1d && fgmState.hoveredPile) {
      this.scalePile(fgmState.hoveredPile, event.wheelDelta);
    } else {
      this.scrollView(event.wheelDelta);
    }

    this.render();
  }

  /**
   * Check if base element is initialized.
   */
  checkBaseElIsInit () {
    if (this.baseElIsInit) {
      this.resolve.isBaseElInit();
    }
  }

  /**
   * Check if the number of matrices is equal to the number of piles in the
   * pile config.
   *
   * @description
   * During the lifetime of the app, none of the matrices will every be deleted.
   * Therefore, the number of matrices / piles in the pileConfig need to equal
   * the number of loaded matrices otherwise something is broken.
   *
   * @param {array} matrices - List of matrices.
   * @param {object} pileConfig - Pile configuration object.
   * @return {boolean} If `true` pileConfig is valid.
   */
  checkPileConfig (matrices, pileConfig) {
    return matrices.length === Object.keys(pileConfig)
      .map(pileId => pileConfig[pileId].length)
      .reduce((a, b) => a + b, 0);
  }

  /**
   * Cluster snippets with t-SNE.
   */
  clusterTsne () {
    if (this.isDataClustered) {
      this.store.dispatch(setArrangeMeasures([]));
    } else {
      this.store.dispatch(setArrangeMeasures([CLUSTER_TSNE]));
    }
  }

  /**
   * Handle all piles display mode changes
   *
   * @param {object} event - Change event object.
   */
  coverDispModeChangeHandler (event) {
    try {
      this.store.dispatch(
        setCoverDispMode(
          parseInt(event.target.selectedOptions[0].value, 10)
        )
      );
    } catch (error) {
      logger.error('Display mode could not be set.', error);
    }
  }

  /**
   * Load and create clusterfck worker.
   */
  createWorkerClusterfck () {
    return new Promise((resolve, reject) => {
      queue()
        .defer(text, 'dist/clusterfck-worker.js')
        .await((error, clusterfckWorker) => {
          if (error) { logger.error(error); reject(Error(error)); }

          const worker = new Worker(
            window.URL.createObjectURL(
              new Blob([clusterfckWorker], { type: 'text/javascript' })
            )
          );

          resolve(worker);
        });
    });
  }

  /**
   * Load and create t-SNE worker.
   */
  createWorkerTsne () {
    return new Promise((resolve, reject) => {
      queue()
        .defer(text, 'dist/tsne-worker.js')
        .await((error, tSneWorker) => {
          if (error) { logger.error(error); reject(Error(error)); }

          const worker = new Worker(
            window.URL.createObjectURL(
              new Blob([tSneWorker], { type: 'text/javascript' })
            )
          );

          resolve(worker);
        });
    });
  }

  /**
   * Cell size changed handler.
   *
   * @param {object} event - Chaneg event object.
   */
  cellSizeChangeHandler (event) {
    let cellSize;
    try {
      cellSize = parseInt(event.target.value, 10);
    } catch (e) {
      logger.error('Failed parsing the cell size value', e);
      return;
    }

    try {
      if (this.gridCellSizeLock) {
        this.store.dispatch(setCellAndGridSize(cellSize));
      } else {
        this.store.dispatch(setCellSize(cellSize));
      }
    } catch (e) {
      logger.error('Dispatching the changed cell size failed', e);
    }
  }

  /**
   * Cell size input handler.
   *
   * @param {object} event - Chaneg event object.
   */
  cellSizeInputHandler (event) {
    this.cellSizeTmp = parseInt(event.target.value, 10);
  }

  /**
   * Cell size mouse down handler.
   *
   * @param {object} event - Mouse down event object.
   */
  cellSizeMousedownHandler (event) {
    this.cellSizeTmp = parseInt(event.target.value, 10);

    return true;
  }

  /**
   * Cell size mouse up handler.
   *
   * @param {object} event - Mouse up event object.
   */
  cellSizeMouseupHandler (event) {
    this.cellSizeTmp = undefined;

    return true;
  }

  /**
   * Change the cover display mode of a single pile
   *
   * @param {object} event - Event object.
   */
  changeCoverDispMode (event) {
    event.pile.setCoverMatrixMode(event.mode).draw();

    this.render();
  }

  // /**
  //  * Close inspected pile
  //  *
  //  * @param {object} openedPile - Opened inspeced pile.
  //  */
  // closeOpenedPile (openedPile) {
  //   let piles = [];
  //   let openedPileIndex = this.piles.indexOf(this.openedPileRoot);

  //   for (let i = 0; i <= this.openedPileMatricesNum; i++) {
  //     piles.push(this.piles[openedPileIndex + i]);
  //   }

  //   this.pileUp(piles, this.piles[openedPileIndex]);

  //   this.startAnimations();
  //   this.openedPileRoot = undefined;
  //   this.openedPileMatricesNum = 0;
  // }

  /**
   * Decolor all matrices
   */
  decolorAll () {
    const colorSettings = {};

    Object.keys(this.colorsMatrixIdx)
      .map(color => this.colorsMatrixIdx[color])
      .reduce((allMatrices, matrices) => allMatrices.concat(matrices), [])
      .forEach((matrix) => {
        colorSettings[matrix.id] = -1;
      });

    this.colorsMatrixIdx = {};

    this.store.dispatch(setMatricesColors(colorSettings));
  }

  /**
   * [deselectAllMatrices description]
   *
   * @return {[type]} [description]
   */
  deselectAllMatrices () {
    this.selectedMatrices.forEach(
      matrix => matrix.frame.attr('class', 'matrixbackground')
    );

    this.selectedMatrices = [];
  }

  /**
   * Destroy alternative pile if it exist.
   *
   * @description
   * An alternative pile to a given ID is either the deleted version or the
   * non-deleted version.
   *
   * @param {object} id - Pile ID to be checked for alternatives.
   */
  destroyAltPile (id) {
    let altId = `_${id}`;

    try {
      altId = id[0] === '_' ? id.slice(1) : altId;
    } catch (e) {
      // Nothing
    }

    const altPile = fgmState.pilesIdx[altId];

    if (altPile) {
      this.destroyPile(altPile);
    }
  }

  /**
   * Helper method for destroying piles
   *
   * @param {object} pile - Pile to be destroyed.
   */
  destroyPile (pile) {
    pile.destroy();

    const pileIndex = this.piles.indexOf(pile);

    if (pileIndex >= 0) {
      this.piles.splice(pileIndex, 1);
    }

    if (fgmState.previousHoveredPile === pile) {
      fgmState.previousHoveredPile = undefined;
      this.highlightPile();
    }

    if (fgmState.hoveredGapPile === pile) {
      fgmState.hoveredGapPile = undefined;
    }
  }

  /**
   * Determine if a matrix is visible.
   */
  determinMatrixVisibility () {
    if (!this.hglSelectionViewDomains) {
      return;
    }

    fgmState.matrices.forEach((matrix) => {
      matrix.visible = false;

      if (
        matrix.locus.globalStart1 >= this.hglSelectionViewDomains[0] &&
        matrix.locus.globalEnd1 <= this.hglSelectionViewDomains[1] &&
        matrix.locus.globalStart2 >= this.hglSelectionViewDomains[2] &&
        matrix.locus.globalEnd2 <= this.hglSelectionViewDomains[3]
      ) {
        matrix.visible = true;
      }
    });
  }

  /**
   * Disperse all piles.
   */
  disperseAllPiles () {
    this.dispersePilesHandler(this.piles);
  }

  /**
   * Disperse piles into their snippets.
   *
   * @param {object} piles - A list of piles to be dispersed.
   */
  dispersePilesHandler (piles) {
    this.fromDisperse = {};

    const pilesToBeDispersed = [];

    piles.forEach((pile) => {
      pile.pileMatrices.slice(1).forEach((pileMatrix) => {
        this.fromDisperse[pileMatrix.id] = pile;
      });

      pilesToBeDispersed.push(pile.id);
    });

    this.store.dispatch(dispersePiles(pilesToBeDispersed));
  }

  /**
   * [distance description]
   *
   * @param {[type]} m1         - [description]
   * @param {[type]} m2         - [description]
   * @param {[type]} focusNodes - [description]
   * @return {[type]} [description]
   */
  distance (m1, m2, focusNodes) {
    let d = 0;
    let a;
    let b;

    focusNodes.forEach((node, index) => {
      a = node;
      for (let j = index; j < focusNodes.length; j++) {
        b = focusNodes[j];
        d += (m1.matrix[a][b] - m2.matrix[a][b]) ** 2;
      }
    });

    return Math.sqrt(d);
  }

  /**
   * Drag handler
   */
  dragPileHandler () {
    fgmState.hoveredPile = undefined;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Check if we intersect with a pile
    this.intersects = this.raycaster.intersectObjects(
      this.pileMeshes.filter(
        pileMesh => pileMesh !== this.dragPile.mesh
      )
    );

    if (this.intersects.length) {
      fgmState.hoveredPile = this.intersects[0].object.pile;
    }

    this.dragPile.moveTo(
      this.relToAbsPositionX(this.mouse.x),
      this.relToAbsPositionY(this.mouse.y),
      true
    );
  }

  /**
   * Drag start handler
   */
  dragPileStartHandler () {
    // Don't do raycasting. "Freeze" the current state of
    // highlighte items and move matrix with cursor.
    this.dragPile = fgmState.hoveredPile;
    this.dragPile.moveTo(
      this.relToAbsPositionX(this.mouse.x),
      this.relToAbsPositionY(this.mouse.y),
      true
    );
    this.dragPile.elevateTo(Z_DRAG);
  }

  /**
   * Draw lasso handler.
   *
   * @param {number} startX - Start X position.
   * @param {number} currentX - Current X position.
   * @param {number} startY - Start Y position.
   * @param {number} currentY - Current Y position.
   */
  drawLasso (startX, currentX, startY, currentY) {
    if (this.keyAltIsDown || this.lassoIsRound) {
      if (!this.isLassoRoundActive) {
        this.isLassoRoundActive = true;
      }
      this.drawLassoRound(startX, currentX, startY, currentY);
    } else {
      if (!this.isLassoRectActive) {
        this.isLassoRectActive = true;
      }
      this.drawLassoRect(startX, currentX, startY, currentY);
    }
  }

  /**
   * Draw rectangular lasso.
   *
   * @param {number} startX - Start X position.
   * @param {number} currentX - Current X position.
   * @param {number} startY - Start Y position.
   * @param {number} currentY - Current Y position.
   */
  drawLassoRect (startX, currentX, startY, currentY) {
    const x1 = Math.min(this.dragStartPos.x, this.mouse.x);
    const x2 = Math.max(this.dragStartPos.x, this.mouse.x);
    const y1 = Math.min(this.dragStartPos.y, this.mouse.y);
    const y2 = Math.max(this.dragStartPos.y, this.mouse.y);

    // Convert relative position back to absolute
    // I.e., the mouse coordinates are in [-1; 1]
    const width = (x2 - x1) * this.plotElDim.width / 2;
    const height = (y2 - y1) * this.plotElDim.height / 2;

    // Update lasso
    fgmState.scene.remove(this.lassoObject);
    this.lassoObject = createRectFrame(width, height, COLORS.PRIMARY, 1);
    this.lassoObject.position.set(
      this.relToAbsPositionX(x1 + ((x2 - x1) / 2)),
      this.relToAbsPositionY(y1 + ((y2 - y1) / 2)) + this.scrollTop,
      Z_LASSO
    );
    fgmState.scene.add(this.lassoObject);
  }

  /**
   * Draw round lasso.
   *
   * @param {number} startX - Start X position.
   * @param {number} currentX - Current X position.
   * @param {number} startY - Start Y position.
   * @param {number} currentY - Current Y position.
   */
  drawLassoRound (startX, currentX, startY, currentY) {
    const dist = this.calcEuclideanDistance(startX, currentX, startY, currentY);

    this.lassoRoundCoords.push([
      this.relToAbsPositionX(currentX),
      this.relToAbsPositionY(currentY) + this.scrollTop
    ]);

    if (!this.lassoRoundMinMove && dist > LASSO_MIN_MOVE * this.cellSize) {
      this.lassoRoundMinMove = true;
    }

    if (this.intersects.length) {
      this.intersects.forEach((intersection) => {
        this.lassoRoundSelection[intersection.object.pile.id] = true;
      });
    }

    // Create geometry
    let curveGeometry = LINE(this.lassoRoundCoords);

    fgmState.scene.remove(this.lassoObject);

    this.lassoObject = new Mesh(curveGeometry, LASSO_MATERIAL);

    this.lassoObject.position.set(
      this.lassoObject.position.x,
      this.lassoObject.position.y,
      Z_LASSO
    );

    fgmState.scene.add(this.lassoObject);
  }

  /**
   * When in 2D, draw area of the pile by indicating the pile matrix locations.
   *
   * @param {number} piles - Piles for which the area should be drawn.
   */
  drawPilesArea (piles) {
    if (!this.isLayout1d) {
      piles.forEach((pile) => {
        if (pile.pileMatrices.length > 1) {
          const coords = [];

          pile.pileMatrices.forEach((matrix) => {
            coords.push(this.getLayoutPosition2D(
              matrix,
              this.arrangeMeasures[0],
              this.arrangeMeasures[1],
              true,
              true
            ));
          });

          if (pile.pileMatrices.length > 1) {
            const points = is2d(coords) ?
              hull(coords, 100) : this.extractBoundariesOfLine(coords);

            this.pileArea = createChMap(
              coords,
              points,
              PILE_AREA_BG,
              PILE_AREA_POINTS,
              PILE_AREA_BORDER
            );
          }

          this.pileArea.position.set(0, 0, Z_HIGHLIGHT_AREA);

          fgmState.scene.add(this.pileArea);
        }
      });
    }
  }

  /**
   * Extract the min and max points of a set of points on a line.
   *
   * @param {array} points - Array of points on a line.
   * @return {array} Two boundary points.
   */
  extractBoundariesOfLine (points) {
    let minPoint = points[0];
    let maxPoint = points[0];

    points.forEach((coord) => {
      if (
        coord[0] < minPoint[0] ||
        coord[1] < minPoint[1]
      ) {
        minPoint = coord;
      }

      if (
        coord[0] > maxPoint[0] ||
        coord[1] > maxPoint[1]
      ) {
        maxPoint = coord;
      }
    });

    return [minPoint, maxPoint];
  }

  /**
   * Extract loci object.
   *
   * @param {object} config - Fragment config.
   * @return {array} API ready loci list
   */
  extractLoci (config) {
    const chrom1 = config.fragmentsHeader.indexOf('chrom1');
    const start1 = config.fragmentsHeader.indexOf('start1');
    const end1 = config.fragmentsHeader.indexOf('end1');
    const chrom2 = config.fragmentsHeader.indexOf('chrom2');
    const start2 = config.fragmentsHeader.indexOf('start2');
    const end2 = config.fragmentsHeader.indexOf('end2');
    const dataset = config.fragmentsHeader.indexOf('dataset');
    const zoomOutLevel = config.fragmentsHeader.indexOf('zoomOutLevel');

    if (-1 in [
      chrom1, start1, end1, chrom2, start2, end2, dataset, zoomOutLevel
    ]) {
      logger.error('Config broken. Missing mandatory headers.');
      return;
    }

    return config.fragments.map(fragment => [
      fragment[chrom1],
      fragment[start1],
      fragment[end1],
      fragment[chrom2],
      fragment[start2],
      fragment[end2],
      fragment[dataset],
      fragment[zoomOutLevel]
    ]);
  }

  /**
   * Flip X and Y axis in 2D scatterplot view.
   */
  flipXY () {
    if (this.arrangeMeasures.length !== 2) { return; }

    let arrangeMeasures;

    try {
      arrangeMeasures = this.store.getState().present
        .decompose.fragments.arrangeMeasures;
    } catch (e) {
      logger.error('State is corrupted', e);
    }

    this.store.dispatch(setArrangeMeasures(arrangeMeasures.reverse()));
  }

  // /**
  //  * [focusOn description]
  //  *
  //  * @param {[type]} nodes - [description]
  //  * @return {[type]} [description]
  //  */
  // focusOn (nodes) {
  //   fgmState.focusNodes = nodes;

  //   // update sizes
  //   this.matrixWidth = this.cellSize * fgmState.focusNodes.length;
  //   this.matrixWidthHalf = this.matrixWidth / 2;

  //   fgmState.calculateDistanceMatrix();

  //   // update highlight frame
  //   fgmState.scene.remove(this.highlightFrame);
  //   this.highlightFrame = createRectFrame(
  //     this.matrixWidth, this.matrixWidth, 0x000000, HIGHLIGHT_FRAME_LINE_WIDTH
  //   );
  //   fgmState.scene.add(this.highlightFrame);

  //   // redraw
  //   this.piles.forEach(pile => pile.frameUpdate());
  //   this.redrawPiles();
  //   this.updateLayout().then(() => {
  //     this.render();
  //   });
  // }

  /**
   * Toggle footer
   */
  footerToggle () {
    this.footerIsExpanded = !this.footerIsExpanded;
  }

  /**
   * [getCurrentPiling description]
   *
   * @return {[type]} [description]
   */
  getCurrentPiling () {
    const piling = [];

    this.piles.forEach(
      pile => piling.push(fgmState.matrices.indexOf(pile.getMatrix(0)))
    );

    return piling;
  }

  /**
   * Get lasso-based pile selection
   *
   * @param {number} startX - Get local start X position.
   * @param {number} currentX - Get local current X position.
   * @param {number} startY - Get local start Y position.
   * @param {number} currentY - Get local current Y position.
   */
  getLassoRectSelection (startX, currentX, startY, currentY) {
    const pilesSelected = [];

    let x1 = this.relToAbsPositionX(
      Math.min(this.dragStartPos.x, this.mouse.x)
    );
    let x2 = this.relToAbsPositionX(
      Math.max(this.dragStartPos.x, this.mouse.x)
    );
    let y1 = this.relToAbsPositionY(
      Math.min(this.dragStartPos.y, this.mouse.y)
    );
    let y2 = this.relToAbsPositionY(
      Math.max(this.dragStartPos.y, this.mouse.y)
    );

    this.piles.forEach((pile) => {
      let x = pile.getPos().x;
      let y = pile.getPos().y;

      if (
        x + this.matrixWidthHalf >= x1 &&
        x < x2 &&
        y - this.matrixWidthHalf >= y1 &&
        y < y2
      ) {
        pilesSelected.push(pile);
      }
    });

    return pilesSelected;
  }

  /**
   * Get selection of round lasso.
   *
   * @return {array} Slected piles.
   */
  getLassoRoundSelection () {
    return Object.keys(this.lassoRoundSelection).map(
      pileId => fgmState.pilesIdx[pileId]
    );
  }

  /**
   * Get position for a pile.
   *
   * @param {number} pileSortIndex - Pile sort index.
   * @param {string} pileSortIndex - Pile sort index.
   * @param {boolean} abs - If `true` the position needs to be adjusted to the
   *   WebGL coordinates.
   * @return {object} Object with x and y coordinates
   */
  getLayoutPosition (pile, measures, abs) {
    const numArrMeasures = measures.length;

    if (numArrMeasures === 2 && !fgmState.trashIsActive) {
      return this.getLayoutPosition2D(
        pile,
        measures[0],
        measures[1],
        abs
      );
    }

    if (
      (numArrMeasures > 2 && !fgmState.trashIsActive) ||
      (numArrMeasures === 1 && measures[0] === CLUSTER_TSNE)
    ) {
      return this.getLayoutPositionMD(pile, abs);
    }

    return this.getLayoutPosition1D(pile.rank, abs);
  }

  /**
   * Get position for a pile given the current sort order.
   *
   * @param {number} pileSortIndex - Pile sort index.
   * @param {boolean} abs - If `true` the position needs to be adjusted to the
   *   WebGL coordinates.
   * @return {object} Object with x and y coordinates
   */
  getLayoutPosition1D (pileSortIndex, abs) {
    let i = (pileSortIndex % this.gridNumCols);
    let j = Math.trunc(pileSortIndex / this.gridNumCols);

    if (fgmState.isHilbertCurve) {
      [i, j] = hilbertCurve(this.hilbertCurveLevel, pileSortIndex);
    }

    let x = (fgmState.gridCellWidthInclSpacing * i) || MARGIN_LEFT;
    let y = (j * fgmState.gridCellHeightInclSpacing) || MARGIN_TOP;

    if (abs) {
      x += fgmState.gridCellWidthInclSpacingHalf;
      y = -y - fgmState.gridCellHeightInclSpacingHalf;
    }

    return { x, y };
  }

  /**
   * Get pile position for 2 dimenions.
   *
   * @param {object} pile - Pile to be poisioned.
   * @param {string} measureX - Measure ID for X axis.
   * @param {string} measureY - Measure ID for Y axis.
   * @param {boolean} abs - If `true` the position needs to be adjusted to the
   *   WebGL coordinates.
   * @param {boolean} asArray - If `true` return an array instead of an object.
   * @return {object} Object with x and y coordinates.
   */
  getLayoutPosition2D (pile, measureX, measureY, abs, asArray) {
    let relX = this.scale2dX(pile.measures[measureX]);
    let relY = this.scale2dY(pile.measures[measureY]);

    const padding = MATRIX_FRAME_THICKNESS_MAX / 2;

    // Note: the oddness of adding and substraction a multiple of 16 stems from
    // the display of the two axis (1rem == 16px)
    let x = 16 + padding + (
      relX *
      (
        this.plotElDim.width -
        this.matrixWidth -
        MATRIX_FRAME_THICKNESS_MAX -
        (1.5 * 16)
      )
    );

    let y = 16 + padding + (
      (1 - relY) *
      (
        this.plotElDim.height -
        this.matrixWidth -
        MATRIX_FRAME_THICKNESS_MAX -
        (1.5 * 16)
      )
    );

    if (abs) {
      x += this.matrixWidthHalf;
      y = -y - this.matrixWidthHalf;
    }

    if (asArray) {
      return [x, y];
    }

    return { x, y };
  }

  /**
   * Get pile position for multi dimensional clustering.
   *
   * @param {object} pile - Pile to be poisioned.
   * @param {boolean} abs - If `true` the position needs to be adjusted to the
   *   WebGL coordinates.
   * @return {object} Object with x and y coordinates.
   */
  getLayoutPositionMD (pile, abs) {
    return {
      x: this.relToAbsPositionXFgm(this.clusterPos[pile.idNumeric].x),
      y: this.relToAbsPositionYFgm(this.clusterPos[pile.idNumeric].y)
    };
  }

  /**
   * Niceify numeric measure
   *
   * @param {number} measure - Measure to be nicefied.
   * @return {number} Niceified value.
   */
  nicefyMeasure (measure) {
    let nicefied = measure;

    if (parseInt(measure, 10) !== measure) {
      // Float
      nicefied = Math.round(measure * 1000) / 1000;
    }

    return nicefied;
  }

  /**
   * Get matrices of piles
   *
   * @param {array} piles - Piles.
   * @return {array} List of matrices.
   */
  getPilesMatrices (piles) {
    return piles
      .map(pile => pile.pileMatrices)
      .reduce((a, b) => a.concat(b), []);
  }

  /**
   * Get and save the client rectangle of the base element.
   *
   * @return {object} Client rectangle object of the base element.
   */
  getPlotElDim () {
    fgmState.plotElDim = this.plotEl.getBoundingClientRect();

    return this.plotElDim;
  }

  groupByCategorySelectChangeHandler (event) {
    this.categoryForGrouping = event.target.value;
  }

  getPilesFromMatrices (matrices) {
    return matrices.reduce((piles, matrix) => {
      piles[matrix.pile.id] = true;

      return piles;
    }, {});
  }

  groupByCategory (category = this.categoryForGrouping) {
    if (this.colorsUsed.some(cat => cat.id === category)) {
      // Group by color

      const piles = this.getPilesFromMatrices(this.colorsMatrixIdx[category]);
      const batchPileStacking = {
        [Object.keys(piles)[0]]: Object.keys(piles).slice(1)
      };

      this.pileUp(batchPileStacking);
    } else {
      // Group by predefined category
    }
  }

  /**
   * Group snippets and piles by grid.
   *
   * @description
   * Everything in a grid cell will be piled up.
   */
  groupByGrid () {
    const gridPiles = [];

    // Add every pile to the grid it is located in
    this.piles.forEach((pile) => {
      const column = Math.floor(pile.x / fgmState.gridCellWidthInclSpacing);
      const row = Math.floor(-pile.y / fgmState.gridCellHeightInclSpacing);
      const index = ((row - 1) * this.gridNumCols) + column;

      if (gridPiles[index]) {
        gridPiles[index].push(pile);
      } else {
        gridPiles[index] = [pile];
      }
    });

    const batchPileStacking = {};

    gridPiles
      .filter(gridPile => gridPile.length > 1)
      .forEach((gridPile) => {
        batchPileStacking[gridPile[0].id] = gridPile.slice(1).map(
          pile => pile.id
        );
      });

    this.pileUp(batchPileStacking);
  }

  /**
   * Automatically groups piles such that the user doesn't have to scroll
   * anymore.
   *
   * @description
   * This function stacks up snippets by pairwise similarity.
   */
  groupBySimilarity () {
    const toBePiled = this.piles.length - this.visiblePilesMax;

    if (toBePiled <= 0) {
      return;
    }

    // Get a copy of the pointers to piles
    const _piles = this.piles.slice();

    // Sort piles by their ranking
    _piles.sort((a, b) => a.rank - b.rank);

    // Calculate the pairwise distance between ordered matrices
    const pairwiseDistances = _piles.map((pile, index) => {
      if (index === 0) {
        return Infinity;
      }

      return this.calcDistanceEucl(
        Matrix.flatten(_piles[index - 1].avgMatrix),
        Matrix.flatten(_piles[index].avgMatrix)
      );
    });

    // Sort piles by distance
    const pilesIdxSortedByDistance = pairwiseDistances
      .map((distance, index) => ({ distance, index }))
      .sort((a, b) => b.distance - a.distance);

    // Create an augmented array of all piles for silent stacking
    const pilesAugmented = _piles.map(pile => ({
      isStackedUp: false,
      pile,
      pileStack: []
    }));

    const getTargetPile = function (piles, index) {
      if (piles[index].isStackedUp) {
        return getTargetPile(pilesAugmented, index - 1);
      }
      return pilesAugmented[index];
    };

    // Silentely stack up piles
    for (let i = 0; i < toBePiled; i++) {
      const pileId = pilesIdxSortedByDistance.pop();

      const targetPile = getTargetPile(pilesAugmented, pileId.index - 1);
      const sourcePile = pilesAugmented[pileId.index];

      targetPile.pileStack.push(sourcePile.pile.id, ...sourcePile.pileStack);

      // Reset the source pile's pile stack
      sourcePile.isStackedUp = true;
    }

    const batchPileStacking = {};

    // Reduce to batch piling
    pilesAugmented
      .filter(pile => !pile.isStackedUp && pile.pileStack.length > 0)
      .forEach((pile) => {
        batchPileStacking[pile.pile.id] = pile.pileStack;
      });

    this.store.dispatch(stackPiles(batchPileStacking));
  }

  /**
   * Lasso is round change handler.
   */
  gridCellSizeLockChangeHandler () {
    if (!this.gridCellSizeLock) {
      this.store.dispatch(setGridCellSizeLockAndGridSize({
        gridCellSizeLock: !this.gridCellSizeLock,
        gridSize: fgmState.cellSize
      }));
    } else {
      this.store.dispatch(setGridCellSizeLock(!this.gridCellSizeLock));
    }

    return true;
  }

  /**
   * Cell size change handler.
   *
   * @param {object} event - Chaneg event object.
   */
  gridSizeChangeHandler (event) {
    this.isGridShown = false;
    this.gridSizeTmp = undefined;

    if (this.gridCellSizeLock) {
      logger.error(
        'Wow! The grid size is linked to the cell size. Can\'t change that.'
      );
      return;
    }

    try {
      this.store.dispatch(setGridSize(event.target.value));
    } catch (e) {
      logger.error('Dispatching the changed grid size failed', e);
    }
  }

  /**
   * Gridf size input handler.
   *
   * @param {object} event - Chaneg event object.
   */
  gridSizeInputHandler (event) {
    this.gridSizeTmp = event.target.value;
    this.calcGrid(true);
  }

  /**
   * Gridf size mouse down handler.
   *
   * @param {object} event - Mouse down event object.
   */
  gridSizeMousedownHandler (event) {
    this.gridSizeTmp = event.target.value;
    this.showGrid();

    return true;
  }

  /**
   * Grid size mouse up handler.
   *
   * @param {object} event - Mouse up event object.
   */
  gridSizeMouseupHandler (event) {
    this.gridSizeTmp = undefined;
    this.hideGrid();

    return true;
  }

  /**
   * Helper method to show an error message
   *
   * @param {string} message - Error to be shown
   */
  hasErrored (message) {
    this.isErrored = true;
    this.errorMsg = message;
  }

  /**
   * Handle and disptach Hilber curve changes.
   */
  hilbertCurveChangeHandler () {
    this.store.dispatch(setHilbertCurve(!fgmState.isHilbertCurve));

    return true;
  }

  /**
   * Highlight a pile.
   *
   * @param {object} pile - Pile to be highlighted.
   */
  highlightPile (pile) {
    if (fgmState.previousHoveredPile && fgmState.previousHoveredPile !== pile) {
      fgmState.previousHoveredPile.frameReset();
    }

    if (typeof pile !== 'undefined') {
      pile.frameHighlight();
    }
  }

  /**
   * HiGlass sub selection change handler.
   */
  higlassSubSelectionChangeHandler () {
    this.store.dispatch(setHiglassSubSelection(!this.higlassSubSelection));

    return true;
  }

  /**
   * General init
   */
  init () {
    this.getPlotElDim();

    this.initPlotWindow();
    this.initShader();
    this.initWebGl();
    this.initEventListeners();

    this.tSneWorker = this.createWorkerTsne();

    this.plotEl.appendChild(this.canvas);

    this.resolve.isInitBase();
  }

  /**
   * Combine the config and raw matrix to the final data model
   *
   * @param {object} config - Fragment config.
   * @param {array} rawMatrices - Raw matrices.
   * @return {object} Object with the config and combined raw matrices.
   */
  initData (config, rawMatrices) {
    const header = ['matrix', ...config.fragmentsHeader];
    const fragments = config.fragments.map(
      (fragment, index) => [rawMatrices[index], ...fragment]
    );

    this.dataIdxMatrix = 0;
    this.dataIdxChrom1 = header.indexOf('chrom1');
    this.dataIdxStart1 = header.indexOf('start1');
    this.dataIdxEnd1 = header.indexOf('end1');
    this.dataIdxStrand1 = header.indexOf('strand1');
    this.dataIdxChrom2 = header.indexOf('chrom2');
    this.dataIdxStart2 = header.indexOf('start2');
    this.dataIdxEnd2 = header.indexOf('end2');
    this.dataIdxStrand2 = header.indexOf('strand2');
    this.dataIdxDataset = header.indexOf('dataset');
    this.dataIdxZoomOutLevel = header.indexOf('zoomOutLevel');

    const usedIdx = [
      this.dataIdxMatrix,
      this.dataIdxChrom1,
      this.dataIdxStart1,
      this.dataIdxEnd1,
      this.dataIdxStrand1,
      this.dataIdxChrom2,
      this.dataIdxStart2,
      this.dataIdxEnd2,
      this.dataIdxStrand2,
      this.dataIdxDataset,
      this.dataIdxZoomOutLevel
    ];

    if (-1 in usedIdx) {
      logger.error('Data broken. Missing mandatory header fields.');
      return;
    }

    // Extract measures
    this.initMeasures(header, usedIdx);

    this.selectMeasure(this.arrangeMeasures, fgmState.measures);

    // Let the multi/select component know
    this.event.publish(
      `${EVENT_BASE_NAME}.${this.arrangeSelectedEventId}.update`
    );

    return { header, fragments };
  }

  /**
   * Initialize event listeners
   */
  initEventListeners () {
    this.canvas.addEventListener(
      'click', event => event.preventDefault(), false
    );

    this.canvas.addEventListener(
      'contextmenu', this.canvasContentMenuHandler.bind(this), false
    );

    this.canvas.addEventListener(
      'dblclick', event => event.preventDefault(), false
    );

    this.canvas.addEventListener(
      'mousedown', this.canvasMouseDownHandler.bind(this), false
    );

    this.canvas.addEventListener(
      'mouseleave', (event) => {
        this.canvasMouseUpHandler(event, true);
      }, false
    );

    this.canvas.addEventListener(
      'mousemove', this.canvasMouseMoveHandler.bind(this), false
    );

    this.canvas.addEventListener(
      'mouseup', this.canvasMouseUpHandler.bind(this), false
    );

    this.canvas.addEventListener(
      'mousewheel', this.canvasMouseWheelHandler.bind(this), false
    );

    this.event.subscribe(
      `${EVENT_BASE_NAME}.${this.arrangeSelectedEventId}`,
      this.arrangeChangeHandler.bind(this)
    );

    this.event.subscribe(
      'app.keyDownAlt',
      this.keyDownAltHandler.bind(this)
    );

    this.event.subscribe(
      'app.keyUp',
      this.keyUpHandler.bind(this)
    );
  }

  /**
   * Initialize the lasso.
   */
  initLasso () {
    this.lassoIsActive = true;
    this.lassoRoundCoords = [];
    this.lassoRoundMinMove = false;
    this.lassoRoundSelection = {};
  }

  /**
   * Init matrix instances
   *
   * @param {array} fragments - Matrix fragments
   */
  initMatrices (fragments) {
    fgmState.matrices = [];

    fragments.forEach((fragment, index) => {
      const measures = {};

      Object.keys(this.dataMeasures).forEach((measure) => {
        measures[measure] = fragment[this.dataMeasures[measure]];
      });

      const matrix = new Matrix(
        index,
        fragment[this.dataIdxMatrix],
        {
          chrom1: fragment[this.dataIdxChrom1],
          start1: fragment[this.dataIdxStart1],
          end1: fragment[this.dataIdxEnd1],
          chrom2: fragment[this.dataIdxChrom2],
          start2: fragment[this.dataIdxStart2],
          end2: fragment[this.dataIdxEnd2]
        },
        {
          strand1: fragment[this.dataIdxStrand1],
          strand2: fragment[this.dataIdxStrand2]
        },
        measures
      );

      fgmState.matrices.push(matrix);
      fgmState.matricesIdx[matrix.id] = matrix;
    });
  }

  /**
   * Initialize measures from data.
   *
   * @param {array} header - Data header that contains the measures.
   * @param {array} usedIdx - List of used indices of the header.
   */
  initMeasures (header, usedIdx) {
    this.dataMeasures = [];
    fgmState.measures = [];

    header.forEach((field, index) => {
      if (!(index in usedIdx) && field[0] !== '_') {
        this.dataMeasures[field] = index;
        fgmState.measures.push({
          id: field,
          name: this.wurstCaseToNice(field)
        });
        fgmState.dataMeasuresMax[field] = 0;
      }
    });
  }

  /**
   * Initialize piles
   *
   * @param {array} matrices - List of matrices.
   * @param {object} pileConfig - Pile configuration object.
   */
  initPiles (matrices, pileConfig = {}) {
    if (this.checkPileConfig(matrices, pileConfig)) {
      this.update(true);
    } else {
      const pilesNew = {};

      matrices.map(matrix => matrix.id).forEach((matrixId) => {
        pilesNew[matrixId] = [matrixId];
      });

      this.store.dispatch(setPiles(pilesNew));
    }
  }

  /**
   * Initialize the fragment plot.
   *
   * @param {object} data - Data object with the fragments.
   */
  initPlot (data) {
    if (data.fragments.length === 0) {
      this.noData = true;
      logger.error('No data available.');
      return;
    }

    this.fragDims = data.fragments[0][this.dataIdxMatrix].length;

    this.calcGrid();

    this.highlightFrame = createRectFrame(
      this.matrixWidth,
      this.matrixWidth,
      COLORS.PRIMARY,
      HIGHLIGHT_FRAME_LINE_WIDTH
    );

    this.initMatrices(data.fragments);

    let piles;

    try {
      piles = this.store.getState().present.decompose.fragments.piles;
    } catch (e) {
      logger.debug('State not ready yet.');
    }

    this.isInitialized = true;

    this.initPiles(fgmState.matrices, piles);

    this.resolve.isInitFully();
  }

  /**
   * Fix plot window height.
   */
  initPlotWindow () {
    this.plotWindowCss = {
      height: `${this.plotElDim.height}px`
    };
  }

  /**
   * [initShader description]
   *
   * @return {[type]} [description]
   */
  initShader () {
    try {
      fgmState.shaderMaterial = new ShaderMaterial({
        vertexShader: document.querySelector('#shader-vertex').textContent,
        fragmentShader: document.querySelector('#shader-fragment').textContent,
        blending: NormalBlending,
        depthTest: true,
        transparent: true,
        side: DoubleSide,
        linewidth: 2
      });
    } catch (e) {
      this.isErrored = true;
      this.errorMsg = 'Failed to initialize shader.';

      logger.error('Failed to initialize shader.', e);
    }
  }

  /**
   * Initialize the canvas container.
   */
  initWebGl () {
    this.camera = new OrthographicCamera(
      this.plotElDim.width / -2,  // left
      this.plotElDim.width / 2,  // right
      this.plotElDim.height / 2,  // top
      this.plotElDim.height / -2,  // bottom
      1,  // near
      11  // far
    );

    this.camera.position.z = 10;
    this.camera.position.x = (this.plotElDim.width / 2);
    this.scrollLimitTop = MARGIN_TOP - (this.plotElDim.height / 2);
    this.camera.position.y = this.scrollLimitTop;

    this.renderer = new WebGLRenderer(WEB_GL_CONFIG);
    this.renderer.setSize(this.plotElDim.width, this.plotElDim.height);
    this.renderer.setClearColor(0xffffff, 0);

    this.canvas = this.renderer.domElement;
    this.origin = new Vector3();

    this.mouse = new Vector2();
    this.raycaster = new Raycaster();

    fgmState.scene.add(this.camera);
  }

  /**
   * Inspect a pile.
   *
   * @param {object} pile - Pile to be inspected.
   */
  inspectPile (pile) {
    console.log('Inspect that thing', pile);
  }

  /**
   * [isSameOrdering description]
   *
   * @param {[type]} o1 - [description]
   * @param {[type]} o2 - [description]
   * @return  {Boolean}          - [description]
   */
  isSameOrdering (o1, o2) {
    if (!o1 || !o2) {
      return false;
    }

    if (o1.length !== o2.length) {
      return false;
    }

    let same = true;

    for (let i = 0; i < o1.length; i++) {
      if (o1[i] !== o2[i]) {
        same = false;
        break;
      }
    }

    return same;
  }

  /**
   * Handle ALT key-down  events.
   */
  keyDownAltHandler () {
    this.keyAltIsDown = true;

    const downDelta = Date.now() - this.keyAltDownTime;

    this.keyAltDownTime = Date.now();

    if (downDelta < DBL_CLICK_DELAY_TIME) {
      this.footerToggle();
    }
  }

  /**
   * Handle ALT key-up  events.
   */
  keyUpHandler () {
    this.keyAltIsDown = false;
  }

  /**
   * Lasso is round change handler.
   */
  lassoIsRoundChangeHandler () {
    this.store.dispatch(setLassoIsRound(!this.lassoIsRound));

    return true;
  }

  /**
   * Load fragment matrices.
   *
   * @param {object} config - Config.
   * @return {object} A promise resolving to `true` if the data is successfully
   *   loaded.
   */
  loadData (config) {
    this.isLoading = true;

    const loadData = new Promise((resolve, reject) => {
      let dataUrl;

      const queryString = config.apiParams ?
        this.prepareQueryString(config.apiParams) : '';

      try {
        dataUrl = `${config.api}${queryString}`;
      } catch (e) {
        this.hasErrored('Config is broken');
        reject(Error(this.errorMsg));
      }

      const postData = {
        loci: this.extractLoci(config)
      };

      json(dataUrl)
        .header('Content-Type', 'application/json')
        .post(JSON.stringify(postData), (error, results) => {
          if (error) {
            this.hasErrored('Could not load data');
            reject(Error(this.errorMsg));
          } else {
            this.isLoading = false;
            this.data = this.initData(
              config, results.fragments
            );
            resolve(this.data);
          }
        });
    });

    loadData
      .then(results => this.resolve.isDataLoaded(results))
      .catch(error => this.reject.isDataLoaded(error));
  }

  /**
   * Three JS font loader.
   */
  loadFont () {
    const fontLoader = new FontLoader();

    fontLoader.load(FONT_URL, (font) => {
      fgmState.font = font;
      this.resolve.isFontLoaded();
    });
  }

  /**
   * [matrixTimeComparator description]
   *
   * @param {[type]} a - [description]
   * @param {[type]} b - [description]
   * @return {[type]} [description]
   */
  matrixTimeComparator (a, b) {
    return parseInt(a.id, 10) - parseInt(b.id, 10);
  }

  /**
   * Calculate global position???
   */
  matricesCalcGlobalPos () {
    fgmState.matrices.forEach((matrix) => {
      let offset = this.chromInfoData[`chr${matrix.locus.chrom1}`].offset;

      matrix.locus.globalStart1 = offset + matrix.locus.start1;
      matrix.locus.globalEnd1 = offset + matrix.locus.end1;

      offset = this.chromInfoData[`chr${matrix.locus.chrom2}`].offset;

      matrix.locus.globalStart2 = offset + matrix.locus.start2;
      matrix.locus.globalEnd2 = offset + matrix.locus.end2;
    });

    this.matricesGlobalPosCalced = true;
  }

  /**
   * Matrix frame encoding change handler.
   *
   * @param {object} event - Event object.
   */
  matrixFrameEncodingChangeHandler (event) {
    try {
      let val = event.target.selectedOptions[0].value;
      if (!event.target.selectedOptions[0].value.length) {
        val = MATRIX_FRAME_ENCODING;
      }

      this.store.dispatch(setMatrixFrameEncoding(val));
    } catch (error) {
      logger.error('Matrix frame encoding could not be set.', error);
    }
  }

  /**
   * Matrix orientation change handler.
   *
   * @param {object} event - Event object.
   */
  matrixOrientationChangeHandler (event) {
    try {
      this.store.dispatch(
        setMatrixOrientation(
          parseInt(event.target.selectedOptions[0].value, 10)
        )
      );
    } catch (error) {
      logger.error('Matrix orientation could not be set.', error);
    }
  }

  /**
   * Handle general mouse moves
   */
  mouseMoveGeneralHandler () {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check if the user mouses over a strand arrow
    this.intersects = this.raycaster.intersectObjects(this.strandArrowRects);

    if (this.intersects.length) {
      this.hoveredStrandArrow = this.intersects[0].object;
      this.previousHoveredStrandArrow = this.hoveredStrandArrow;
    } else if (this.previousHoveredStrandArrow) {
      this.previousHoveredStrandArrow = undefined;
    }

    // Check if we intersect with a pile
    this.intersects = this.raycaster.intersectObjects(this.pileMeshes);

    if (this.intersects.length) {
      this.mouseOverPileHandler(this.intersects[0].object);
    } else if (fgmState.previousHoveredPile) {
      this.mouseOutPileHandler();
    }

    // Draw rectangular lasso
    if (
      this.lassoIsActive ||
      (this.mouseWentDown && !fgmState.hoveredPile)
    ) {
      if (!this.lassoIsActive) { this.initLasso(); }

      this.drawLasso(
        this.dragStartPos.x,
        this.mouse.x,
        this.dragStartPos.y,
        this.mouse.y
      );
    }
  }

  /**
   * Handle mouse over pile
   *
   * @param {object} pileMesh - Pile mesh being moused over.
   */
  mouseOverPileHandler (pileMesh) {
    const y = pileMesh.position.y;

    fgmState.hoveredPile = pileMesh.pile;

    fgmState.hoveredPile.elevateTo(Z_HIGHLIGHT);

    // Preview single matrices of piles with multiple matrices
    if (fgmState.hoveredPile.pileMatrices.length > 1) {
      const absY = this.relToAbsPositionY(this.mouse.y);

      if (absY > y + fgmState.hoveredPile.matrixWidthHalf) {
        const deltaY = absY - (y + fgmState.hoveredPile.matrixWidthHalf);
        const index = Math.floor(deltaY / fgmState.hoveredPile.previewSize);

        fgmState.hoveredPile.showSingle(
          fgmState.hoveredPile.getMatrixPreview(index)
        );
      } else {
        fgmState.hoveredPile.showSingle();
      }
    }

    fgmState.hoveredPile.updateLabels();

    // Hovering over a new pile
    if (
      fgmState.previousHoveredPile !== fgmState.hoveredPile &&
      !this.isLassoActive
    ) {
      this.highlightPile();
      this.removePileArea();

      this.drawPilesArea([fgmState.hoveredPile]);
      fgmState.hoveredPile.scaleMouseEntered = fgmState.hoveredPile.scale;

      if (
        fgmState.previousHoveredPile &&
        !this.pilesZoomed[fgmState.previousHoveredPile.id]
      ) {
        fgmState.previousHoveredPile.setScale().frameCreate().draw();
      }
    }

    fgmState.previousHoveredPile = fgmState.hoveredPile;

    this.render();
  }

  /**
   * Handle pile mouse out events.
   */
  mouseOutPileHandler () {
    fgmState.hoveredPile = undefined;

    this.highlightPile();

    if (fgmState.hoveredGapPile) {
      const pile = fgmState.hoveredGapPile;
      fgmState.hoveredGapPile = undefined;
      pile.draw();
    }

    if (fgmState.previousHoveredPile) {
      this.event.publish(
        'decompose.fgm.pileMouseLeave',
        fgmState.previousHoveredPile.pileMatrices.map(matrix => matrix.id)
      );

      if (!this.pilesZoomed[fgmState.previousHoveredPile.id]) {
        fgmState.previousHoveredPile.setScale().frameCreate().draw();
      }

      fgmState.previousHoveredPile.elevateTo(Z_BASE);
      fgmState.previousHoveredPile.showSingle(undefined);
      fgmState.previousHoveredPile.setCoverMatrixMode(this.coverDispMode);
      this.highlightFrame.visible = false;
      fgmState.previousHoveredPile.draw(false, true);
      fgmState.previousHoveredPile = undefined;
    }

    this.removePileArea();
  }

  /**
   * Move multiple files and animate the move
   *
   * @param {array} piles - Piles to be moved.
   * @param {array} locations - Locations the piles should be moved to.
   * @return {object} Promise resolving when the animation is done.
   */
  movePilesAnimated (piles, locations) {
    // Duration in seconds
    const durationSec = DURATION * 0.001;

    // Convert to seconds
    let timeLeft = durationSec;

    return new Promise((resolve, reject) => {
      let firstTime = true;

      // Store initial pile position difference
      const diff = {};

      let then = 0;

      const animate = (now) => {
        // Convert to seconds
        now *= 0.001;

        // Set then equal to now the first time
        if (firstTime) {
          then = now;
        }

        // Sum up time passed
        timeLeft = Math.max(timeLeft - (now - then), 0);

        // Remember the current time for the next frame.
        then = now;

        // Get the fraction we should have already moved
        const fraction = timeLeft / durationSec;

        piles.forEach((pile, index) => {
          if (firstTime) {
            diff[pile.id] = {
              x: (locations[index].x - pile.x),
              y: (locations[index].y - pile.y)
            };
          }

          pile.moveTo(
            locations[index].x - (diff[pile.id].x * fraction),
            locations[index].y - (diff[pile.id].y * fraction),
            true
          );
        });

        this.render();

        firstTime = false;

        if (timeLeft > 0) {
          window.requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      window.requestAnimationFrame(animate);
    });
  }

  /**
   * Assign random colors
   *
   * @param {object} event - Event object.
   * @return {object} Self.
   */
  pileAssignBW (event) {
    this.removeFromColorMatrixIdx(event.pile.pileMatrices);

    const colorSettings = {};

    event.pile.pileMatrices.forEach((matrix) => {
      colorSettings[matrix.id] = -1;
    });

    this.store.dispatch(setMatricesColors(colorSettings));
  }

  /**
   * Assign random colors
   *
   * @param {object} event - Event object.
   * @return {object} Self.
   */
  pileAssignColor (event) {
    this.removeFromColorMatrixIdx(event.pile.pileMatrices);

    const colorSettings = {};

    event.pile.pileMatrices.forEach((matrix) => {
      colorSettings[matrix.id] = event.color;
    });

    this.store.dispatch(setMatricesColors(colorSettings));
  }

  /**
   * Create a new instance
   *
   * @param {number} pileId - Pile ID.
   * @return {object} New or retrieved pile
   */
  pileCreate (pileId) {
    if (!fgmState.pilesIdx[pileId]) {
      const pile = new Pile(
        pileId,
        fgmState.scene,
        fgmState.scale,
        this.fragDims
      );

      fgmState.pilesIdx[pileId] = pile;
      fgmState.piles.push(pile);
    }

    return fgmState.pilesIdx[pileId];
  }

  /**
   * Piles a set of matrices onto a target pile removes it from source pile, and
   * updates the layout.
   *
   * @param {object} config - Pile up config object.
   * @param {boolean} noAnimation - If `true` animation is skipped.
   */
  pileUp (config, noAnimation) {
    let animation;

    const targetPiles = [];
    const piles = [];
    const pilesDestination = [];

    Object.keys(config).forEach((targetPileId) => {
      const targetPile = fgmState.pilesIdx[targetPileId];
      const sourcePiles = config[targetPileId];

      const centerX = (
        targetPile.x +
        sourcePiles.reduce(
          (sum, pileId) => sum + fgmState.pilesIdx[pileId].x, 0
        )
      ) / (sourcePiles.length + 1);

      const centerY = (
        targetPile.y +
        sourcePiles.reduce(
          (sum, pileId) => sum + fgmState.pilesIdx[pileId].y, 0
        )
      ) / (sourcePiles.length + 1);

      piles.push(targetPile);
      piles.push(...sourcePiles.map(pileId => fgmState.pilesIdx[pileId]));

      pilesDestination.push(...new Array(sourcePiles.length + 1).fill(
        { x: centerX, y: centerY }
      ));

      targetPile.elevateTo(Z_STACK_PILE_TARGET);

      targetPiles.push(targetPile);
    });

    if (fgmState.animation && !noAnimation) {
      animation = this.movePilesAnimated(piles, pilesDestination);
    } else {
      animation = Promise.resolve();
    }

    animation.finally(() => {
      targetPiles.forEach((pile) => { pile.elevateTo(Z_BASE); });

      this.store.dispatch(stackPiles(config));
    });
  }

  /**
   * Build query string from object and URI encode values
   *
   * @param {object} queries - Key-value list of queries.
   * @return {string} Query string.
   */
  prepareQueryString (queries) {
    try {
      return `?${
        Object
          .keys(queries)
          .map(query => `${query}=${encodeURIComponent(queries[query])}`)
          .join('&')
      }`;
    } catch (e) {
      return '';
    }
  }

  /**
   * Rank matrices according to some measure
   *
   * @param {array} piles - Piles to be ranked.
   * @param {string} measure - Measure ID
   * @param {boolean} desc - If `true` rank descending by measure.
   */
  rank (piles, measure, desc) {
    if (measure) {
      // First we get the measurement
      piles.forEach((pile) => {
        pile.assessMeasures([measure]);
      });
    }

    // Next, we create a new simplified array that will actually be sorted.
    // Note: we won't sort the original pile array but instead only assign a
    // rank.
    const pilesSortHelper = piles.map((pile, index) => {
      const baseRank = pile.isTrashed ? index : pile.idNumeric;

      return {
        id: pile.id,
        value: measure ? pile.measures[measure] : baseRank
      };
    });

    const sortOrder = desc ? -1 : 1;

    // Then we sort
    pilesSortHelper.sort(sortByValue(sortOrder));

    // Finally, assign rank
    pilesSortHelper.forEach((pileSortHelper, index) => {
      fgmState.pilesIdx[pileSortHelper.id].rank = index;
    });
  }

  /**
   * Redraw piles.
   *
   * @param {array} piles - List of piles to be redrawn.
   */
  redrawPiles (piles = this.piles) {
    piles.forEach(pile => pile.draw());
  }

  /**
   * Rescale piles.
   *
   * @param {array} piles - List of piles to be redrawn.
   */
  rescalePiles (piles = this.piles) {
    piles.forEach(pile => pile.setScale());
  }

  /**
   * Convert local to global positions.
   *
   * @param {number} x - Local x position.
   * @param {number} y - Local y position.
   * @return {array} Array with global positions of form `[x, y]`.
   */
  relToAbsPosition (x, y) {
    return [
      this.relToAbsPositionX(x),
      this.relToAbsPositionY(y)
    ];
  }

  /**
   * Convert local to global X positions.
   *
   * @param {number} x - Local x position.
   * @return {number} Global X position.
   */
  relToAbsPositionX (x) {
    return ((x + 1) / 2 * this.plotElDim.width);
  }

  /**
   * Convert local to global X positions for fragments.
   *
   * @param {number} x - Local x position.
   * @return {number} Global X position.
   */
  relToAbsPositionXFgm (x) {
    return ((x + 1) / 2 * (this.plotElDim.width - this.matrixWidth)) + this.matrixWidthHalf;
  }

  /**
   * Convert local to global Y positions.
   *
   * @param {number} x - Local Y position.
   * @return {number} Global Y position.
   */
  relToAbsPositionY (y) {
    return ((y - 1) / 2 * this.plotElDim.height);
  }

  /**
   * Convert local to global Y positions for fragments.
   *
   * @param {number} x - Local Y position.
   * @return {number} Global Y position.
   */
  relToAbsPositionYFgm (y) {
    return ((y - 1) / 2 * (this.plotElDim.height - this.matrixWidth)) - this.matrixWidthHalf;
  }

  /**
   * Remove pile matrices from color matrix index.
   *
   * @param {array} matrices - List of matrices to be removed from the index.
   */
  removeFromColorMatrixIdx (matrices) {
    matrices.forEach((matrix) => {
      if (typeof matrix.color !== 'undefined') {
        try {
          // Try to remove pile from index
          const prevColor = this.store.getState()
            .present.decompose.fragments.matricesColors[matrix.id];

          const pos = this.colorsMatrixIdx[prevColor].indexOf(matrix.id);

          if (pos >= 0) {
            this.colorsMatrixIdx[prevColor].splice(pos, 1);
          }
        } catch (e) {
          logger.error('State corrupted');
        }
      }
    });
  }

  /**
   * [removeFromPile description]
   *
   * @param {[type]} pile - [description]
   * @return {[type]} [description]
   */
  removeFromPile (pile) {
    logger.warning('`removeFromPile()` not implemented yet.');
  }

  /**
   * Remove drawn pile area.
   */
  removePileArea () {
    if (!this.pileArea) { return; }

    fgmState.scene.remove(this.pileArea);
    this.pileArea = undefined;
  }

  /**
   * [render description]
   *
   * @return {[type]} [description]
   */
  render () {
    this.renderer.render(fgmState.scene, this.camera);
  }

  /**
   * Scale pile.
   *
   * @param {number} wheelDelta - Wheel movement.
   */
  scalePile (pile, wheelDelta) {
    const force = Math.log(Math.abs(wheelDelta));
    const momentum = wheelDelta > 0 ? force : -force;

    const newScale = Math.min(
      Math.max(
        pile.scaleMouseEntered,
        pile.scale * (1 + (0.1 * momentum))
      ),
      pile.scaleMouseEntered * 5
    );

    pile.setScale(newScale).frameCreate().draw();
  }

  /**
   * Scroll the snippets plot.
   *
   * @param {number} wheelDelta - Wheel movement.
   */
  scrollView (wheelDelta) {
    let cameraPosY = this.camera.position.y;

    if (wheelDelta > 0) {
      cameraPosY = Math.min(
        cameraPosY + wheelDelta, this.scrollLimitTop
      );
    } else {
      cameraPosY = Math.max(
        cameraPosY + wheelDelta, this.scrollLimitBottom
      );
    }

    this.scrollTop = cameraPosY - this.scrollLimitTop;

    this.camera.position.setY(cameraPosY);
  }

  /**
   * Set pile cover mode.
   *
   * @param {number} mode - Number defines the cover matrix mode.
   * @param {array} piles - Piles for which to set the cover matrix mode.
   */
  setPileCoverMode (mode, piles) {
    piles.forEach((pile) => { pile.setCoverMatrixMode(mode); });
  }

  // /**
  //  * [setSimilarityPiling description]
  //  *
  //  * @param {[type]} value - [description]
  //  */
  // setSimilarityPiling (value) {
  //   this.calculatePiles(value);
  // }

  /**
   * Helper method for selecting selected measures
   *
   * @param {array} selectedMeasures - Array of selected measure IDs.
   * @param {array} measures - Array of measure objects.
   */
  selectMeasure (selectedMeasures, measures) {
    selectedMeasures.forEach((selectedMeasure) => {
      measures
        .filter(measure => measure.id === selectedMeasure)
        .forEach((measure) => { measure.isSelected = true; });
    });
  }

  // /**
  //  * [setPiling description]
  //  *
  //  * @param {[type]} newPiling - [description]
  //  */
  // setPiling (newPiling) {
  //   this.piles.forEach(pile => this.destroyPile(pile));

  //   this.piles = [];

  //   let matrices = [];
  //   let l = 0;

  //   for (let i = 1; i <= newPiling.length; i++) {
  //     matrices = [];

  //     if (i < newPiling.length) {
  //       for (let j = l; j < newPiling[i]; j++) {
  //         matrices.push(matrices[j]);
  //       }
  //     } else if (l < matrices.length) {
  //       for (let j = l; j < matrices.length; j++) {
  //         matrices.push(matrices[j]);
  //       }
  //     } else {
  //       break;
  //     }

  //     const newPile = new Pile(
  //       this.piles.length,
  //       fgmState.scene,
  //       fgmState.scale,
  //       this.fragDims
  //     );

  //     this.piles.push(newPile);
  //     newPile.addMatrices(matrices);

  //     this.sortByOriginalOrder(newPile);
  //     newPile.setCoverMatrixMode(this.coverDispMode);
  //     newPile.draw();

  //     l = newPiling[i];
  //   }

  //   this.isLoading = true;

  //   this.updateLayout().then(() => {
  //     this.render();
  //   });
  // }

  /**
   * [setNodeOrder description]
   *
   * @param {[type]} piles - [description]
   * @param {[type]} order - [description]
   */
  setNodeOrder (piles, order) {
    for (let i = 0; i < piles.length; i++) {
      piles[i].setNodeOrder(order);
    }
  }

  /**
   * [setPilingMethod description]
   *
   * @param {[type]} method - [description]
   */
  setPilingMethod (method) {
    this.pilingMethod = method;
  }

  /**
   * Set the scroll bottom limiit
   *
   * @param {number} numFragments - Number of fragmets.
   */
  setScrollLimit (numFragments = this.piles.length) {
    const contentHeight = fgmState.gridCellHeightInclSpacing *
      Math.ceil(numFragments / this.gridNumCols);

    const scrollHeight = contentHeight - this.plotElDim.height;

    if (scrollHeight > 0) {
      this.scrollLimitBottom = this.scrollLimitTop - scrollHeight;
    } else {
      this.scrollLimitBottom = this.scrollLimitTop;
    }
  }

  /**
   * Show grid temporarily
   */
  showGrid () {
    this.isGridShown = true;
  }

  /**
   * [showMatrixSimilarity description]
   *
   * @description
   * Takes a seed pile and shows how similarall the other piles / matrices are.
   * The similarity between two piles is themean of the distances between all
   * matrices from p1 to all matrices to p2 (bigraph).
   *
   * @param {[type]} pile - [description]
   * @return {[type]} [description]
   */
  showMatrixSimilarity (pile) {
    let pileIndex = this.piles.indexOf(pile);

    this.piles.forEach((otherPile, index) => {
      otherPile.showSimilarity(
        this.pileDistanceColor(this.pdMat[pileIndex][index])
      );
    });
  }

  /**
   * Show pile menu.
   *
   * @param {object} pile - Associated pile.
   */
  showPileMenu (pile) {
    if (pile) {
      this.highlightPile(pile);

      this.pileMenuPile = pile;
      this.isPileMenuBottomUp = false;
      const position = {
        right: document.body.clientWidth - event.clientX + 16  // 16px == 1rem
      };

      if (document.body.clientHeight - event.clientY < 100) {
        position.bottom = document.body.clientHeight - event.clientY;
        this.isPileMenuBottomUp = true;
      } else {
        position.top = event.clientY;
      }

      this.pileMenuPosition = position;
      this.isPileMenuShow = true;
    } else {
      this.isPileMenuShow = false;
      this.pileMenuPile = undefined;
    }
  }

  /**
   * Change handler for showing special cells
   *
   * @return {boolean} `True` to not keep the event form bubbling up.
   */
  showSpecialCellsChangeHandler () {
    this.store.dispatch(setShowSpecialCells(!fgmState.showSpecialCells));

    return true;
  }

  /**
   * Hide grid.
   */
  hideGrid () {
    this.isGridShown = false;
  }

  /**
   * Hide trashed piles
   */
  hideTrash () {
    this.piles.forEach((pile) => {
      pile.hide();
    });

    fgmState.trashIsActive = false;

    this.piles.forEach((pile) => {
      pile.frameUpdate().frameCreate().draw();
    });

    this.assessMeasuresMax();
    this.calcGrid();
    this.setScrollLimit();
    this.updateLayout(this.piles, this.arrangeMeasures, true)
      .then(() => { this.render(); });
  }

  /**
   * Show trashed piles
   */
  showTrash () {
    this.piles.forEach((pile) => {
      pile.hide();
    });

    fgmState.trashIsActive = true;

    this.piles.forEach((pile) => {
      pile.frameUpdate().frameCreate().draw();
    });

    this.calcGrid();
    this.setScrollLimit();
    this.updateLayout(this.piles, [], true)
      .then(() => { this.render(); });
  }

  /**
   * Sorts matrices in pile according to time
   *
   * @param {[type]} pile - [description]
   * @return {[type]} [description]
   */
  sortByOriginalOrder (pile) {
    pile.pileMatrices.sort(this.matrixTimeComparator);
  }

  // /**
  //  * Splits a pile at the position of the passed matrix. The passed matrix
  //  * becomes the base for the new pile.
  //  *
  //  * @param {array} matrix - Matrix
  //  * @param {boolean} noAnimation - If `true` force no animation.
  //  */
  // splitPile (matrix, noAnimation) {
  //   if (noAnimation) {
  //     let pileSrc = matrix.pile;
  //     let pileNew = new Pile(
  //       this.piles.length,
  //       fgmState.scene,
  //       fgmState.scale,
  //       this.fragDims
  //     );

  //     pileNew.colored = pileSrc.colored;
  //     this.piles.splice(this.piles.indexOf(pileSrc) + 1, 0, pileNew);

  //     let m = [];
  //     for (let i = pileSrc.getMatrixPosition(matrix); i < pileSrc.size(); i++) {
  //       // Needs refactoring
  //       m.push(pileSrc.getMatrix(i));
  //     }

  //     this.pileUp(m, pileNew);

  //     pileNew.draw();
  //     pileSrc.draw();

  //     this.updateLayout().then(() => {
  //       this.render();
  //     });
  //   } else {
  //     // Needs refactoring
  //     // this.pilingAnimations.push(SplitAnimation(matrix));
  //     // this.startAnimations();
  //   }
  // }

  // /**
  //  * Starts all animations in pilingAnimations array.
  //  */
  // startAnimations () {
  //   clearInterval(this.interval);

  //   this.interval = setInterval(() => {
  //     this.pilingAnimations.forEach((pileAnimation, index) => {
  //       pileAnimation.step();
  //       if (pileAnimation.done) {
  //         this.pilingAnimations.splice(index, 1);
  //       }
  //     });

  //     if (this.pilingAnimations.length === 0) {
  //       clearInterval(this.interval);
  //       this.interval = undefined;
  //       this.pilingAnimations = [];
  //       this.updateLayout().then(() => {
  //         this.render();
  //       });
  //     }

  //     this.render();
  //   }, 500 / FPS);
  // }

  /**
   * Handle all piles display mode changes
   *
   * @param {object} event - Change event object.
   */
  toggleCoverDispMode () {
    this.store.dispatch(
      setCoverDispMode(this.coverDispMode !== MODE_MEAN ? MODE_MEAN : MODE_STD)
    );
  }

  /**
   * Toggle trash.
   */
  toggleTrash () {
    if (this.trashSize) {
      if (fgmState.trashIsActive) {
        this.hideTrash();
      } else {
        this.showTrash();
      }
    }
  }

  /**
   * [unshowMatrixSimilarity description]
   *
   * @return {[type]} [description]
   */
  unshowMatrixSimilarity () {
    this.piles.forEach(pile => pile.resetSimilarity());
  }

  /**
   * Root state update handler
   *
   * @param {boolean} init - If `true` it's part of the init cycle.
   */
  update (init) {
    try {
      const state = this.store.getState().present.decompose;
      const stateFgm = state.fragments;
      const stateHgl = state.higlass;

      const update = {};
      const ready = [];

      ready.push(this.updatePlotSize(state.columns, update));
      ready.push(this.updateHglSelectionView(stateHgl.config));
      ready.push(this.updateHglSelectionViewDomains(state.higlass.selectionView, update));

      ready.push(this.updateAnimation(stateFgm.animation));
      ready.push(this.updateArrangeMeasures(stateFgm.arrangeMeasures, update));
      ready.push(this.updateCoverDispMode(stateFgm.coverDispMode, update));
      ready.push(this.updateCellSize(stateFgm.cellSize, update));
      ready.push(this.updateConfig(stateFgm.config));
      ready.push(this.updateGridSize(stateFgm.gridSize, update));
      ready.push(this.updateGridCellSizeLock(stateFgm.gridCellSizeLock, update));
      ready.push(this.updateHilbertCurve(stateFgm.hilbertCurve, update));
      ready.push(this.updateHglSubSelection(stateFgm.higlassSubSelection, update));
      ready.push(this.updateLassoIsRound(stateFgm.lassoIsRound));
      ready.push(this.updateMatrixColors(stateFgm.matricesColors, update));
      ready.push(this.updateMatrixFrameEncoding(stateFgm.matrixFrameEncoding, update, init));
      ready.push(this.updateMatrixOrientation(stateFgm.matrixOrientation, update));
      ready.push(this.updatePiles(stateFgm.piles, update));
      ready.push(this.updateShowSpecialCells(stateFgm.showSpecialCells, update));

      Promise.all(ready).finally(() => {
        this.updateRendering(update);
      });
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  /**
   * Handler rendering after updates.
   *
   * @param {object} update - Object that states what to update
   */
  updateRendering (update) {
    if (this.isInitialized) {
      if (update.webgl) {
        this.updateWebGl();
      }

      if (update.grid) {
        this.calcGrid();
      }

      if (update.pileFrames) {
        this.piles.forEach(pile => pile.frameUpdate());
      }

      if (update.pileFramesRecreate) {
        this.piles.forEach(pile => pile.frameCreate());
      }

      if (
        (update.piles || update.pileFramesRecreate) &&
        !update.drawPilesAfter
      ) {
        this.redrawPiles();
      }

      if (update.scrollLimit) {
        this.setScrollLimit();
      }

      if (this.isInitialized) {
        this.render();
      }

      if (update.layout) {
        window.requestAnimationFrame(() => {
          this.updateLayout(
            this.piles,
            fgmState.trashIsActive ? [] : this.arrangeMeasures
          ).then(() => {
            this.render();
          });
        });
      }

      if (update.drawPilesAfter) {
        this.redrawPiles();
        this.render();
      }
    }
  }

  /**
   * Update animation state.
   *
   * @param {boolean} animation - If `true` visual changes will be animated.
   */
  updateAnimation (animation) {
    fgmState.animation = animation;

    return Promise.resolve();
  }

  /**
   * Update the arrange measures.
   *
   * @param {array} arrangeMeasures - Array of measure IDs.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateArrangeMeasures (arrangeMeasures, update) {
    const _arrangeMeasures = arrangeMeasures || ARRANGE_MEASURES;

    if (this.arrangeMeasures === _arrangeMeasures) {
      return;
    }

    this.arrangeMeasures = _arrangeMeasures;

    if (
      this.arrangeMeasures.length === 1 &&
      this.arrangeMeasures[0] === CLUSTER_TSNE
    ) {
      fgmState.isLayout2d = false;
      fgmState.isLayoutMd = true;
      fgmState.scale = 0.25;
    } else {
      this.arrangeMeasuresReadible = this.arrangeMeasures.map(
        measure => this.wurstCaseToNice(measure)
      );

      this.selectMeasure(this.arrangeMeasures, fgmState.measures);

      if (this.arrangeMeasures.length > 1) {
        fgmState.isLayout2d = this.arrangeMeasures.length === 2;
        fgmState.isLayoutMd = !fgmState.isLayout2d;
        fgmState.scale = 0.25;
      } else {
        fgmState.isLayout2d = false;
        fgmState.isLayoutMd = false;
        fgmState.scale = 1;
      }
    }

    update.grid = true;
    update.piles = true;
    update.pileFramesRecreate = true;
    update.layout = true;

    return Promise.resolve();
  }

  /**
   * Update the display mode of all piles.
   *
   * @param {number} coverDispMode - Display mode number.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateCoverDispMode (coverDispMode, update) {
    if (this.coverDispMode === coverDispMode) {
      return;
    }

    this.coverDispMode = coverDispMode;

    update.grid = true;
    update.piles = true;

    if (this.isInitialized) {
      this.setPileCoverMode(this.coverDispMode, this.piles);
    }

    return Promise.resolve();
  }

  /**
   * Update the cell size.
   *
   * @param {number} size - New cell size.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateCellSize (size, update) {
    if (fgmState.cellSize === size) { return; }

    fgmState.cellSize = size;

    update.piles = true;
    update.pileFramesRecreate = true;
  }

  /**
   * Handle updating the config.
   *
   * @param {object} newConfig - New config
   */
  updateConfig (newConfig) {
    if (
      this.config !== newConfig &&
      Object.keys(newConfig).length > 0
    ) {
      this.config = newConfig;
      this.loadData(this.config);
    }

    return Promise.resolve();
  }

  /**
   * Update the grid cell size.
   *
   * @param {number} newSize - New grid size.
   * @param {object} update - Update object to be updated in-place.
   */
  updateGridSize (size, update) {
    if (fgmState.gridSize === size) { return; }

    fgmState.gridSize = size;

    update.grid = true;
    update.layout = true;
    update.scrollLimit = true;

    return Promise.resolve();
  }

  /**
   * Update grid to cell size lock.
   *
   * @param {boolean} gridCellSizeLock - If `true` grid size is locked to the
   *   cell size.
   */
  updateGridCellSizeLock (gridCellSizeLock, update) {
    this.gridCellSizeLock = gridCellSizeLock;

    return Promise.resolve();
  }

  /**
   * Update hilbert curve status.
   *
   * @param {boolean} isHilbertCurve - If `true` order in 1D by Hilbert curve.
   * @param {object} update - Update object to be updated in-place.
   */
  updateHilbertCurve (isHilbertCurve, update) {
    if (fgmState.isHilbertCurve === isHilbertCurve) { return; }

    fgmState.isHilbertCurve = isHilbertCurve;

    if (!isHilbertCurve) { fgmState.scale = 1; }

    update.grid = true;
    update.layout = true;
    update.pileFramesRecreate = true;
    update.scrollLimit = true;

    return Promise.resolve();
  }

  /**
   * Check if HiGlass has a selection view.
   *
   * @param {object} hglConfig - HiGLass config.
   */
  updateHglSelectionView (hglConfig) {
    try {
      this.hglSelectionView = hglConfig.views.some(view => view.selectionView);
    } catch (e) {
      this.hglSelectionView = false;
    }

    return Promise.resolve();
  }

  /**
   * Check if HiGlass has a selection view.
   *
   * @param {object} hglConfig - HiGLass config.
   */
  updateHglSelectionViewDomains (domains, update) {
    if (
      this.hglSelectionViewDomains === domains ||
      arraysEqual(this.hglSelectionViewDomains, domains)
    ) {
      return;
    }

    this.hglSelectionViewDomains = domains;

    // this.determinMatrixVisibility();

    // update.piles = true;
    // update.pilesForce = true;
    // update.pileFrames = true;
    // update.layout = true;
    // update.scrollLimit = true;

    return Promise.resolve();
  }

  /**
   * Update HiGlass sub-selection.
   *
   * @param {boolean} higlassSubSelection - If `true` piles are selected based
   *   on a HiGlass view.
   */
  updateHglSubSelection (higlassSubSelection, update) {
    if (this.higlassSubSelection === higlassSubSelection) {
      return;
    }

    this.higlassSubSelection = higlassSubSelection;

    update.piles = true;
    update.pileFrames = true;
    update.layout = true;
    update.scrollLimit = true;

    return Promise.resolve();
  }

  /**
   * Update lasso is round.
   *
   * @param {boolean} lassoIsRound - If `true` lasso is round.
   */
  updateLassoIsRound (lassoIsRound) {
    this.lassoIsRound = lassoIsRound;

    return Promise.resolve();
  }

  /**
   * Update every pile.
   *
   * @param {array} piles - Piles to be re-arranged.
   * @param {array} measures - Measures used for arraning.
   * @param {boolean} noAnimation - If `true` the piles are not animated.
   * @return {object} Promise resolving when to layout if fully updated.
   */
  updateLayout (
    piles = this.piles,
    measures = this.arrangeMeasures,
    noAnimation = false
  ) {
    return new Promise((resolve, reject) => {
      const arranged = this.arrange(piles, measures);

      arranged
        .then(() => {
          if (!noAnimation) {
            return this.movePilesAnimated(
              piles,
              piles.map(pile => this.getLayoutPosition(pile, measures, true))
            );
          }

          // Don't animate
          piles.forEach((pile) => {
            const pos = this.getLayoutPosition(pile, measures, true);
            pile.moveTo(pos.x, pos.y, true);
          });

          resolve();
        })
        .catch((error) => {
          logger.error('Error arranging snippets', error);
          reject(error);
        });
    });
  }

  /**
   * Update matrices colors.
   *
   * @param {object} matricesColors - Matrix color configurations.
   * @param {object} update - Update object to bve updated in-place.
   * @param {boolean} force - If `true` force update.
   */
  updateMatrixColors (matricesColors, update, force) {
    if (
      (this.matricesColors === matricesColors || !this.isInitialized) &&
      !force
    ) { return; }

    this.matricesColors = matricesColors;

    const colorsUsedTmp = {};

    fgmState.matrices.forEach((matrix) => {
      if (typeof this.matricesColors[matrix.id] !== 'undefined') {
        const color = this.matricesColors[matrix.id];

        matrix.color = color;

        colorsUsedTmp[color] = true;

        if (this.colorsMatrixIdx[color]) {
          this.colorsMatrixIdx[color].push(matrix);
        } else {
          this.colorsMatrixIdx[color] = [matrix];
        }
      } else if (typeof matrix.color !== 'undefined') {
        // Unset previously colored matrix
        matrix.color = undefined;
      }
    });

    this.colorsUsed = Object.keys(colorsUsedTmp)
      .map(color => ({ id: color, name: this.wurstCaseToNice(color) }));

    update.piles = true;

    return Promise.resolve();
  }

  /**
   * Update the matrix frame encoding of all matrices.
   *
   * @param {string} encoding - Matrix measure.
   * @param {object} update - Update object to bve updated in-place.
   * @param {boolean} force - If `true` force update.
   */
  updateMatrixFrameEncoding (encoding, update, force) {
    if (
      (fgmState.matrixFrameEncoding === encoding || !this.isInitialized) &&
      !force
    ) { return; }

    fgmState.matrixFrameEncoding = encoding;

    update.pileFrames = true;

    return Promise.resolve();
  }

  /**
   * Update the orientation of all matrices.
   *
   * @param {number} orientation - Matrix orientation number.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateMatrixOrientation (orientation, update) {
    if (fgmState.matrixOrientation === orientation) {
      return;
    }

    fgmState.matrixOrientation = orientation;

    update.piles = true;

    return Promise.resolve();
  }

  /**
   * Update piles
   *
   * @param {object} pileConfigs - Config object
   * @param {object} update - Update object to bve updated in-place.
   * @param {boolean} forced - If `true` force update
   */
  updatePiles (pileConfigs, update, forced) {
    if (
      (this.pileConfigs === pileConfigs || !this.isInitialized) &&
      !forced &&
      !update.pilesForce
    ) {
      return;
    }

    this.pileConfigs = pileConfigs;
    this.isDispersable = false;

    const ready = [];

    Object.keys(pileConfigs)
      .map(pileId => ({
        id: pileId,
        matrixIds: pileConfigs[pileId]
      }))
      .forEach((pileConfig) => {
        let pile = fgmState.pilesIdx[pileConfig.id];

        if (pileConfig.matrixIds.length) {
          if (!pile) {
            pile = this.pileCreate(pileConfig.id);
            this.destroyAltPile(pileConfig.id);
          }

          ready.push(pile.setMatrices(
            pileConfig.matrixIds
              .map(matrixId => fgmState.matrices[matrixId])
              .filter(matrix => matrix.visible)
          ));

          if (!this.isDispersable) {
            this.isDispersable = (
              pile.pileMatrices.length > 1 &&
              (
                (fgmState.trashIsActive && pile.isTrashed) ||
                (!fgmState.trashIsActive && !pile.isTrashed)
              )
            );
          }

          if (pile.pileMatrices.length === 0) {
            pile.hide();
          }

          if (fgmState.trashIsActive) {
            if (pile.isTrashed && pile.isDrawn) {
              pile.hide();
            }

            if (!this.trashSize) {
              this.hideTrash();
            }
          } else if (pileConfig.id[0] === '_') {
            pile.trash();
          } else if (pile.isTrashed) {
            pile.recover();
          } else if (!pile.isDrawn) {
            if (
              this.fromDisperse &&
              this.fromDisperse[pile.id]
            ) {
              // To make it look like a real disperse
              pile.draw().moveTo(
                this.fromDisperse[pile.id].x,
                this.fromDisperse[pile.id].y,
                true
              );
            }
          }
        } else if (pile) {
          pile.destroy();
        }
      });

    this.fromDisperse = undefined;

    if (!fgmState.trashIsActive) {
      this.assessMeasuresMax();
    }

    update.layout = true;
    update.scrollLimit = true;
    update.drawPilesAfter = true;

    return Promise.all(ready);
  }

  /**
   * Handle updating the grid if necessary
   *
   * @param {object} columns - Decompose column information.
   * @param {object} update - Update object to bve updated in-place.
   */
  updatePlotSize (columns, update) {
    if (this.decomposeColums === columns) {
      return;
    }

    this.decomposeColums = columns;

    update.grid = true;
    update.webgl = true;

    return Promise.resolve();
  }

  /**
   * Update piles when special cells are shown or hidden
   *
   * @param {boolean} showSpecialCells - If `true` show special cells.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateShowSpecialCells (showSpecialCells, update) {
    if (fgmState.showSpecialCells === showSpecialCells) {
      return;
    }

    fgmState.showSpecialCells = showSpecialCells;

    update.piles = true;

    return Promise.resolve();
  }

  /**
   * Initialize the canvas container.
   */
  updateWebGl () {
    if (this.isInitialized) {
      this.getPlotElDim();

      this.camera.left = this.plotElDim.width / -2;
      this.camera.right = this.plotElDim.width / 2;
      this.camera.top = this.plotElDim.height / 2;
      this.camera.bottom = this.plotElDim.height / -2;

      this.camera.position.x = (this.plotElDim.width / 2);
      this.scrollLimitTop = MARGIN_TOP - (this.plotElDim.height / 2);
      this.camera.position.y = this.scrollLimitTop;

      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.plotElDim.width, this.plotElDim.height);
    }

    return Promise.resolve();
  }

  /**
   * Nicefy that wurstified string
   *
   * @param {string} str - Wurstified string to be nicefied.
   * @return {string} Nicefied string.
   */
  wurstCaseToNice (str) {
    return `${str[0].toUpperCase()}${str.slice(1).replace(/[-_]/g, ' ')}`;
  }
}
