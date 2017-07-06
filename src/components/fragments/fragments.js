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
  closePilesInspection,
  dispersePiles,
  dispersePilesInspection,
  inspectPiles,
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
  splitPilesInspection,
  stackPiles,
  stackPilesInspection
} from 'components/fragments/fragments-actions';

import {
  API_FRAGMENTS,
  ARRANGE_MEASURES,
  CAT_CHROMOSOME,
  CAT_DATASET,
  CAT_LOCATION,
  CAT_ZOOMOUT_LEVEL,
  CLICK_DELAY_TIME,
  CLUSTER_TSNE,
  DBL_CLICK_DELAY_TIME,
  DURATION,
  FRAGMENTS_BASE_RES,
  FRAGMENT_PRECISION,
  FRAGMENT_SIZE,
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
  MODE_AVERAGE,
  MODE_VARIANCE,
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
  Z_STACK_PILE_TARGET
} from 'components/fragments/fragments-defaults';

import fgmState from 'components/fragments/fragments-state';

import Pile from 'components/fragments/pile';

import Matrix from 'components/fragments/matrix';

import {
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

  constructor (chromInfo, event, states) {
    this.event = event;
    this.chromInfo = chromInfo;

    // Link the Redux store
    this.store = states.store;
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    this.arrangeMeasures = [];
    this.attrsCatOther = [];
    this.clusterPos = {};
    this.colorsMatrixIdx = {};
    this.colorsUsed = [];
    this.maxDistance = 0;
    this.matrixStrings = '';
    this.matrixPos = []; // index of pile in layout array
    this.matrices = []; // contains all matrices
    this.matricesPileIndex = []; // contains pile index for each matrix.
    this.selectedMatrices = [];
    this.dragActive = false;
    this.pilesZoomed = {};
    this.plotWindowCss = {};
    this.scrollTop = 0;
    this.shiftDown = false;
    this.dataMeasures = {};

    this._isLoadedSession = false;
    this._isSavedSession = false;

    this.isGridShown = false;
    this.isGridShownCols = [];
    this.isGridShownRows = [];

    this.pileIDCount = 0;
    this.startPile = 0;
    this.maxValue = 0;
    this.fragDims = 0;  // Fragment dimensions
    this.scale = 1;

    this.keyAltDownTime = 0;

    this.mouseIsDown = false;
    this.lassoIsActive = false;
    this.isLassoRectActive = false;
    this.isLassoRoundActive = false;
    this.mouseWentDown = false;
    this.pileMenuPosition = {};

    this.isLoading = true;

    this.mouseClickCounter = 0;

    this.subscriptions = [];

    this.arrangeMeasuresAccessPath = [
      'explore', 'fragments', 'arrangeMeasures'
    ];

    this.attrsCatReq = [{
      id: CAT_LOCATION,
      name: 'Location'
    }, {
      id: CAT_CHROMOSOME,
      name: 'Chromosome'
    }, {
      id: CAT_DATASET,
      name: 'Dataset'
    }, {
      id: CAT_ZOOMOUT_LEVEL,
      name: 'Zoomout Level'
    }];

    this.coverDispModes = [{
      id: MODE_AVERAGE,
      name: 'Average (Mean)'
    }, {
      id: MODE_VARIANCE,
      name: 'Variance (STD)'
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

    this.isInitBase = new Promise((resolve, reject) => {
      this.resolve.isInitBase = resolve;
      this.reject.isInitBase = reject;
    });

    this.isInitFully = new Promise((resolve, reject) => {
      this.resolve.isInitFully = resolve;
      this.reject.isInitFully = reject;
    });

    this.update(false, true);

    Promise
      .all([this.isAttached, this.isBaseElInit])
      .then(() => { this.init(); })
      .catch((error) => {
        logger.error('Failed to initialize the fragment plot', error);
      });

    Promise
      .all([this.isDataLoaded, this.isInitBase])
      .then((results) => { this.initPlot(results[0]); })
      .catch((error) => {
        logger.error('Failed to initialize the fragment plot', error);
      });

    Promise
      .all([this.chromInfo.ready, this.isInitFully])
      .then(() => {
        this.matricesCalcGlobalPos();

        if (this.subSelectingPiles) {
          this.determineMatrixVisibility();
        }
      })
      .catch((error) => {
        logger.error('Failed to calculate global matrix positions', error);
      });

    this.checkBaseElIsInit();

    fgmState.render = this.render;
  }


  /* ----------------------- Aurelia-specific methods ----------------------- */

  /**
   * Called once the component is attached.
   */

  attached () {
    window.addResizeListener(this.baseEl, this.resizeHandler.bind(this));

    this.resolve.isAttached();
  }

  /**
   * Called once the component is detached.
   */
  detached () {
    this.unsubscribeStore();
    this.unsubscribeEventListeners();
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

  get coverDispMode () {
    return fgmState.coverDispMode;
  }

  set coverDispMode (value) {
    fgmState.coverDispMode = value;
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

  get isModifierKeyDown () {
    if (this.isAltKeyDown || this.isCtrlKeyDown || this.isMetaKeyDown) {
      return true;
    }

    return false;
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
      return this.pilesState;
    }

    return this.pilesState;
  }

  get pilesConfigs () {
    if (fgmState.isPilesInspection) {
      return this.pilesInspectionConfigs[
        this.pilesInspectionConfigs.length - 1
      ];
    }

    return this.pilesNormalConfigs;
  }

  get pilesState () {
    if (fgmState.isPilesInspection) {
      return fgmState.pilesInspection;
    }

    return fgmState.piles;
  }

  get pilesIdxState () {
    if (fgmState.isPilesInspection) {
      return fgmState.pilesIdxInspection;
    }

    return fgmState.pilesIdx;
  }

  get pileMeshes () {
    return fgmState.trashIsActive ?
      fgmState.pileMeshesTrash : fgmState.pileMeshes;
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

  get strandArrows () {
    return this.isTrashed ?
      fgmState.strandArrowsTrash : fgmState.strandArrows;
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
   * @param {boolean} reArrange - If `true` recalculate arrangement.
   */
  arrange (piles, measures, reArrange) {
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
        // Uses t-SNE with on the matrix snippets
        this.clusterLayout = this.calcLayoutPositionsTsne(piles, reArrange);
      } else {
        this.clusterLayout = this.calcLayoutPositionsMD(
          piles, measures, reArrange
        );
      }

      this.clusterLayout
        .then((pos) => {
          Object.keys(this.pilesConfigCached).forEach((pileId) => {
            if (pileId[0] !== '_' && this.pilesConfigCached[pileId].length) {
              this.clusterPos[pileId] = {
                x: pos[this.pilesConfigCached[pileId].__index__][0],
                y: pos[this.pilesConfigCached[pileId].__index__][1]
              };
            }
          });

          resolve();
        })
        .catch((error) => { reject(Error(error)); });
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
    if (!this.isLayout1d) {
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
        const piles = this.store.getState().present.explore.fragments.piles;
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
  calcLayoutPositionsMD (
    piles = this.piles,
    measures = this.arrangeMeasures,
    reCalculate = false
  ) {
    this.isLoading = true;

    if (!this.tsneWorker) {
      this.tSneWorker = this.createWorkerTsne();
    }

    // Pull cached results
    if (this.tsneAttrsPos && !reCalculate) {
      this.isLoading = false;
      return Promise.resolve(this.tsneAttrsPos);
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

              // Cache results
              this.tsneAttrsPos = pos;
              this.cachePileSetup();
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

  cachePileSetup (pilesConfig = this.pilesNormalConfigs, piles = this.piles) {
    this.pilesConfigCached = pilesConfig;

    this.piles.forEach((pile, index) => {
      this.pilesConfigCached[pile.id].__index__ = index;
    });
  }

  /**
   * Calculate multi-dimensional layout with t-SNE based on the matrices.
   *
   * @param {array} piles - Array of piles to be arranged.
   * @param {boolean} reCalculate - If `true` recalculate the layout.
   * @return {object} Promise resolving to the snippet positions.
   */
  calcLayoutPositionsTsne (piles = this.piles, reCalculate = false) {
    this.isLoading = true;

    if (!this.tsneWorker) {
      this.tSneWorker = this.createWorkerTsne();
    }

    // Pull cached results
    if (this.tsneDataPos && !reCalculate) {
      this.isLoading = false;
      return Promise.resolve(this.tsneDataPos);
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

              // Cache results
              this.tsneDataPos = pos;
              this.cachePileSetup();
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
            data: this.piles.map(pile => Array.from(pile.coverMatrix))
          });
        })
        .catch((error) => {
          logger.error('Couldn\'t create t-SNE worker', error);
        });
    });
  }

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
    } else if (this.hoveredStrandArrow) {
      this.hoveredStrandArrow.userData.pile.flipMatrix(
        this.hoveredStrandArrow.userData.axis
      ).draw();
    }

    if (fgmState.hoveredPile) {
      this.highlightPile(fgmState.hoveredPile);
    } else {
      this.showPileMenu();
      this.highlightPile();
    }

    this.render();

    requestNextAnimationFrame(() => {
      if (fgmState.hoveredPile) {
        // Show pile location
        this.event.publish(
          'explore.fgm.pileFocus',
          fgmState.hoveredPile.pileMatrices.map(matrix => matrix.id)
        );
      }
    });
  }

  /**
   * Handle double click events.
   */
  canvasDblClickHandler () {
    if (fgmState.hoveredPile) {
      this.dispersePilesHandler([fgmState.hoveredPile]);
      fgmState.hoveredPile = undefined;
    } else {
      Object.keys(this.pilesZoomed).forEach((pileId) => {
        this.pilesIdxState[pileId].setScale().frameCreate().draw();
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
    this.mouseDownTime = Date.now();

    if (event.which !== 1) { return; }

    event.preventDefault();

    this.mouseWentDown = true;
    this.mouseIsDown = true;
    this.dragStartPos = {
      x: this.mouse.x,
      y: this.mouse.y,
      clientX: event.clientX,
      clientY: event.clientY,
      cameraX: this.camera.position.x,
      cameraY: this.camera.position.y
    };
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
      this.mouseIsDown && this.isZoomPan
    ) {
      this.dragPlotHandler(event);
    } else if (
      this.mouseIsDown &&
      fgmState.hoveredPile &&
      this.piles.indexOf(fgmState.hoveredPile) > -1 &&
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
    this.mouseDownTimeDelta = (Date.now() - this.mouseDownTime) || 0;

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
    }
  }

  /**
   * Handle right mouse clicks.
   *
   * @param {object} event - Mouse click event.
   */
  canvasContextMenuHandler (event) {
    if (fgmState.hoveredPile) {
      event.preventDefault();
    }

    this.showPileMenu(fgmState.hoveredPile, event);
  }

  /**
   * Handle mouse up events on the canvas.
   *
   * @param {object} event - Mouse up event.
   */
  canvasMouseUpHandler (event) {
    event.preventDefault();

    fgmState.scene.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    fgmState.scene.remove(this.lassoObject);
    this.mouseIsDown = false;

    let pilesSelected = [];

    if (this.dragPile) {
      // place pile on top of previous pile
      if (!fgmState.hoveredPile) {
        // Move pile back to original position
        const pos = this.getLayoutPosition(
          this.dragPile, this.arrangeMeasures, true
        );

        this.movePilesAnimated(
          [this.dragPile],
          [{
            x: pos.x,
            y: pos.y
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
    } else {
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

    if (!this.isLayout1d) {
      if (this.isZoomPan) {
        this.scalePlot(event);
      } else if (fgmState.hoveredPile) {
        this.scalePile(fgmState.hoveredPile, event.wheelDelta);
      }
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
   * Close pile inspection.
   */
  closePilesInspectionHandler () {
    if (!fgmState.isPilesInspection) { return; }

    this.store.dispatch(closePilesInspection());
  }

  /**
   * Cluster snippets with t-SNE.
   *
   */
  clusterTsne (again) {
    if (this.isDataClustered) {
      if (again) {
        this.updateLayout(this.piles, this.arrangeMeasures, false, true);
      } else {
        // Unset cache
        this.pilesConfigCached = {};
        this.store.dispatch(setArrangeMeasures([]));
      }
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
   * Load and create t-SNE worker.
   */
  createWorkerTsne () {
    return new Promise((resolve, reject) => {
      const hash = window.hipilerConfig.workerTsneHash.length ?
        `-${window.hipilerConfig.workerTsneHash}` : '';

      const loc = window.hipilerConfig.workerLoc || 'dist';

      queue()
        .defer(text, `${loc}/tsne-worker${hash}.js`)
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
    event.pile.setCoverDispMode(event.mode).draw();

    this.render();
  }

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

    const altPile = this.pilesIdxState[altId];

    if (altPile) {
      this.destroyPiles([altPile]);
    }
  }

  /**
   * Helper method for destroying piles
   *
   * @param {object} pile - Pile to be destroyed.
   */
  destroyPiles (piles) {
    const multiple = piles.length > 1;

    piles.forEach((pile) => {
      pile.destroy(multiple);

      if (fgmState.previousHoveredPile === pile) {
        fgmState.previousHoveredPile = undefined;
        this.highlightPile();
      }
    });
  }

  /**
   * Determine if a matrix is visible.
   */
  determineMatrixVisibility () {
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
        matrix.isVisibleInSelection = true;
      } else {
        matrix.isVisibleInSelection = false;
      }
    });
  }

  /**
   * Disperse all piles.
   */
  disperseAllPiles () {
    this.dispersePilesHandler(this.piles);
  }

  checkPiledBeforeCluster (piles) {
    if (!this.tsneDataPos && !this.tsneAttrsPos) { return; }

    return !piles
      .map(pile => pile.pileMatrices)
      .reduce((acc, value) => acc.concat(value), [])
      .every(pileMatrix => this.pilesConfigCached[pileMatrix.id]);
  }

  /**
   * Disperse piles into their snippets.
   *
   * @param {object} piles - A list of piles to be dispersed.
   */
  dispersePilesHandler (piles) {
    if (this.checkPiledBeforeCluster(piles)) {
      this.dialogPromise = new Promise((resolve, reject) => {
        this.dialogDeferred = { resolve, reject };
      });
      this.dialogIsOpen = true;
      this.dialogMessage =
        'When you disperse this pile we have to re-calculate the clustering ' +
        'because the pile you\'re about to disperse has been create before  ' +
        'clustering and the location of the snippets on the cluster are ' +
        'therefore not known.';
      this.fromDisperseRecluster = true;
    } else {
      this.dialogPromise = Promise.resolve();
    }

    this.dialogPromise.then(() => {
      this.setFromDisperse(piles);

      const pilesToBeDispersed = [];

      piles.forEach((pile) => {
        pile.pileMatrices.slice(1).forEach((pileMatrix) => {
          this.fromDisperse[pileMatrix.id] = pile;
        });

        pilesToBeDispersed.push(pile.id);
      });

      if (fgmState.isPilesInspection) {
        this.store.dispatch(dispersePilesInspection(pilesToBeDispersed));
      } else {
        this.store.dispatch(dispersePiles(pilesToBeDispersed));
      }
    });
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
   * Drag start handler
   */
  dragPlotHandler (event) {
    // Don't do raycasting. "Freeze" the current state of
    // highlighte items and move matrix with cursor.
    this.dragPlot = true;

    this.camera.position.x = Math.max(
      this.plotElDim.width * 0.25 / this.scale,
      Math.min(
        this.plotElDim.width * (1 - (0.25 / this.scale)),
        this.dragStartPos.cameraX - ((
          event.clientX - this.dragStartPos.clientX
        ) / this.scale)
      )
    );

    this.camera.position.y = Math.max(
      this.scrollLimitTop - (this.plotElDim.height * (1 - (0.75 / this.scale))),
      Math.min(
        this.scrollLimitTop * 0.75 / this.scale,
        this.dragStartPos.cameraY + ((
          event.clientY - this.dragStartPos.clientY
        ) / this.scale)
      )
    );

    this.render();
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
    if (this.isKeyAltDown || this.lassoIsRound) {
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
        if (pile.pileMatrices.length < 2) { return; }

        const coords = [];

        if (this.arrangeMeasures.length === 2) {
          pile.pileMatrices.forEach((matrix) => {
            coords.push(this.getLayoutPosition2D(
              matrix,
              this.arrangeMeasures[0],
              this.arrangeMeasures[1],
              true,
              true
            ));
          });
        }

        if (
          this.clusterPos[pile.id] &&
          (
            this.arrangeMeasures.length > 2 ||
            (
              this.arrangeMeasures.length === 1 &&
              this.arrangeMeasures[0] === CLUSTER_TSNE
            )
          )
        ) {
          pile.pileMatrices.forEach((matrix) => {
            if (this.clusterPos[matrix.id]) {
              coords.push(this.getLayoutPositionMD(matrix, true));
            }
          });
        }

        if (coords.length > 1) {
          const points = is2d(coords) ?
            hull(coords, 100) : this.extractBoundariesOfLine(coords);

          this.pileArea = createChMap(
            coords,
            points,
            PILE_AREA_BG,
            PILE_AREA_POINTS,
            PILE_AREA_BORDER
          );

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
    const header = config.fragments[0];

    const chrom1 = header.indexOf('chrom1');
    const start1 = header.indexOf('start1');
    const end1 = header.indexOf('end1');
    const chrom2 = header.indexOf('chrom2');
    const start2 = header.indexOf('start2');
    const end2 = header.indexOf('end2');
    const dataset = header.indexOf('dataset');
    const zoomOutLevel = header.indexOf('zoomOutLevel');

    if (-1 in [
      chrom1, start1, end1, chrom2, start2, end2, dataset, zoomOutLevel
    ]) {
      logger.error('Config broken. Missing mandatory headers.');
      return;
    }

    return config.fragments.slice(1).map(fragment => [
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
        .explore.fragments.arrangeMeasures;
    } catch (e) {
      logger.error('State is corrupted', e);
    }

    this.store.dispatch(setArrangeMeasures(arrangeMeasures.reverse()));
  }

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
      pileId => this.pilesIdxState[pileId]
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
      return this.getLayoutPositionMD(pile);
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
   * @param {boolean} asArray - If `true` return an array instead of an object.
   * @return {object} Object with x and y coordinates.
   */
  getLayoutPositionMD (pile, asArray) {
    let x;
    let y;

    if (
      !asArray &&
      this.pilesConfigCached &&
      !arraysEqual(this.pilesConfigCached[pile.id], this.pilesConfigs[pile.id])
    ) {
      // A pile that has been created after t-SNE ran
      x = 0;
      y = 0;
      let counter = 0;

      this.pilesConfigs[pile.id].forEach((pileId) => {
        if (this.clusterPos[pileId]) {
          x += this.clusterPos[pileId].x;
          y += this.clusterPos[pileId].y;
          counter += 1;
        }
      });

      x = this.relToAbsPositionXFgm(x / counter);
      y = this.relToAbsPositionYFgm(y / counter);
    } else {
      // Individual snippet or pile
      x = this.relToAbsPositionXFgm(this.clusterPos[pile.id].x);
      y = this.relToAbsPositionYFgm(this.clusterPos[pile.id].y);
    }


    if (asArray) {
      return [x, y];
    }

    return { x, y };
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
      switch (category) {
        case CAT_LOCATION: {
          const batchPileStacking = {};
          const pilesByLocation = {};

          this.piles.forEach((pile) => {
            if (pile.pileMatrices.length === 1) {
              const matrix = pile.pileMatrices[0];
              const locus = Object.keys(matrix.locus)
                .map(key => matrix.locus[key])
                .reduce((str, value) => str.concat(value), '');

              if (pilesByLocation[locus]) {
                pilesByLocation[locus].push(pile);
              } else {
                pilesByLocation[locus] = [pile];
              }
            }
          });

          Object.keys(pilesByLocation).forEach((locus) => {
            if (pilesByLocation[locus].length > 1) {
              batchPileStacking[pilesByLocation[locus][0].id] =
                pilesByLocation[locus].slice(1).map(matrix => matrix.id);
            }
          });

          this.pileUp(batchPileStacking);
          break;
        }

        default:
          // Nothing
          break;
      }
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
      const index = (row * this.gridNumCols) + column;

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
        _piles[index - 1].coverMatrix,
        _piles[index].coverMatrix
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

    if (fgmState.isPilesInspection) {
      this.store.dispatch(stackPilesInspection(batchPileStacking));
    } else {
      this.store.dispatch(stackPiles(batchPileStacking));
    }
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
    if (this.pileHighlight) {
      this.pileHighlight.frameReset();

      this.event.publish(
        'explore.fgm.pileBlur',
        this.pileHighlight.pileMatrices.map(matrix => matrix.id)
      );

      this.pileHighlight = undefined;
    }

    if (typeof pile !== 'undefined') {
      pile.frameHighlight();
      this.pileHighlight = pile;
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
    const header = ['matrix', ...config.fragments[0]];
    const fragments = config.fragments.slice(1).map(
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
    this.preventDefault = event => event.preventDefault();

    this.canvas.addEventListener(
      'click', this.preventDefault, false
    );

    this.canvas.addEventListener(
      'contextmenu', this.canvasContextMenuHandler.bind(this), false
    );

    this.canvas.addEventListener(
      'dblclick', this.preventDefault, false
    );

    this.canvas.addEventListener(
      'mousedown', this.canvasMouseDownHandler.bind(this), false
    );

    this.canvas.addEventListener(
      'mouseleave', this.canvasMouseUpHandler.bind(this), false
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

    this.subscriptions.push(this.event.subscribe(
      `${EVENT_BASE_NAME}.${this.arrangeSelectedEventId}`,
      this.arrangeChangeHandler.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'app.keyDown',
      this.keyDownHandler.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'app.keyUp',
      this.keyUpHandler.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.coverDispMode',
      this.changeCoverDispMode.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.dispersePiles',
      this.dispersePilesHandler.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.inspectPiles',
      this.inspectPilesHandler.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileAssignColor',
      this.pileAssignColor.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileAssignBW',
      this.pileAssignBW.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.removePileArea',
      this.removePileArea.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.removeFromPile',
      this.removeFromPile.bind(this)
    ));
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

    const baseRes = this.config.fragmentsBaseRes || FRAGMENTS_BASE_RES;

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
        baseRes * (2 ** fragment[this.dataIdxZoomOutLevel]),
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
      piles = this.store.getState().present.explore.fragments.piles;
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
   * Initialize shader material.
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
    } catch (error) {
      this.isErrored = true;
      this.errorMsg = 'Failed to initialize shader.';

      logger.error('Failed to initialize shader.', error);
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

    this.cameraPosOrgX = (this.plotElDim.width / 2);
    this.cameraPosOrgY = MARGIN_TOP - (this.plotElDim.height / 2);

    this.camera.position.x = this.cameraPosOrgX;
    this.camera.position.y = this.cameraPosOrgY;
    this.camera.position.z = 10;

    this.scrollLimitTop = this.cameraPosOrgY;

    this.renderer = new WebGLRenderer(WEB_GL_CONFIG);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(
      this.plotElDim.width,
      this.plotElDim.height
    );
    this.renderer.setClearColor(0xffffff, 0);

    this.canvas = this.renderer.domElement;

    this.origin = new Vector3();
    this.mouse = new Vector2();
    this.raycaster = new Raycaster();

    fgmState.scene.add(this.camera);
  }

  /**
   * Inspect piles.
   *
   * @param {object} piles - Piles to be inspected.
   */
  inspectPilesHandler (piles) {
    this.setFromDisperse(piles);
    this.fromInspection = true;

    const pilesConfig = {};

    piles.forEach((pile) => {
      pilesConfig[pile.id] = pile.pileMatrices.map(pileMatrix => pileMatrix.id);
    });

    this.store.dispatch(inspectPiles(pilesConfig));
  }

  /**
   * Handle key-down events.
   */
  keyDownHandler (event) {
    if (event.altKey) {
      this.isAltKeyDown = true;
    }

    if (event.ctrlKey) {
      this.isCtrlKeyDown = true;
    }

    if (event.metaKey) {
      this.isMetaKeyDown = true;
    }
  }

  /**
   * Handle key-up  events.
   *
   * @param {object} event - Key up event object.
   */
  keyUpHandler (event) {
    if (!this.lastWasModifier) {
      switch (event.keyCode) {
        case 67:  // C == Cover Mode
          this.toggleCoverDispMode();
          break;

        case 83:  // S == Selection (rect lasso or swiping)
          this.lassoIsRoundChangeHandler();
          break;

        case 88:  // X == Show / hide advance menu
          this.footerToggle();
          break;

        case 90:  // Z == Zoom snippets view
          this.toggleZoomPan();
          break;

        default:
          // Nothing
          break;
      }
    }

    if (this.lastWasModifier) {
      this.lastWasModifier = false;
    }

    if (this.isModifierKeyDown) {
      this.lastWasModifier = true;
    }

    if (event.code === 'AltLeft') {
      this.isAltKeyDown = false;
    }

    if (event.code === 'ControlLeft') {
      this.isCtrlKeyDown = false;
    }

    if (event.code === 'MetaLeft') {
      this.isMetaKeyDown = false;
    }
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

    return new Promise((resolve, reject) => {
      let url;

      const params = {
        precision: config.fragmentsPrecision || FRAGMENT_PRECISION,
        dims: config.fragmentsDims || FRAGMENT_SIZE
      };

      if (config.fragmentsNoCache) {
        params['no-cache'] = 1;
      }

      if (config.fragmentsNoBalance) {
        params['no-balance'] = 1;
      }

      const queryString = this.prepareQueryString(params);

      // Remove trailing slashes
      const server = config.fragmentsServer.replace(/\/+$/, '');

      try {
        url = `${server}/${API_FRAGMENTS}/${queryString}`;
      } catch (e) {
        this.hasErrored('Config is broken');
        reject(Error(this.errorMsg));
      }

      const postData = {
        loci: this.extractLoci(config)
      };

      json(url)
        .header('Content-Type', 'application/json')
        .post(JSON.stringify(postData), (error, results) => {
          if (error) {
            this.hasErrored('Could not load data');
            this.reject.isDataLoaded(Error(this.errorMsg));
            return;
          }

          this.isLoading = false;
          const finalResults = this.initData(
            config, results.fragments
          );

          this.resolve.isDataLoaded(finalResults);
        });
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
    this.intersects = this.raycaster.intersectObjects(this.strandArrows);

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

    if (fgmState.previousHoveredPile) {
      // Reset elevation
      fgmState.previousHoveredPile.elevateTo();
    }

    fgmState.hoveredPile.elevateTo(Z_HIGHLIGHT);

    // Preview single matrices of piles with multiple matrices
    if (fgmState.hoveredPile.pileMatrices.length > 1) {
      const absY = this.relToAbsPositionY(this.mouse.y) + this.scrollTop;

      if (absY > y + fgmState.hoveredPile.matrixWidthHalf) {
        const deltaY = (
          absY - y - fgmState.hoveredPile.matrixWidthHalf -
          fgmState.hoveredPile.previewGapSize
        );
        const index = Math.floor(
          deltaY / (
            fgmState.hoveredPile.previewSize +
            fgmState.hoveredPile.previewGapSize
          )
        );

        fgmState.hoveredPile.showSingle(
          fgmState.hoveredPile.getMatrixPreview(index)
        );
      } else {
        fgmState.hoveredPile.showSingle();
      }
    }

    // Hovering over a new pile
    if (
      fgmState.previousHoveredPile !== fgmState.hoveredPile &&
      !this.isLassoActive
    ) {
      this.removePileArea();

      this.drawPilesArea([fgmState.hoveredPile]);
    }

    fgmState.previousHoveredPile = fgmState.hoveredPile;

    this.render();
  }

  /**
   * Handle pile mouse out events.
   */
  mouseOutPileHandler () {
    fgmState.hoveredPile = undefined;

    if (fgmState.previousHoveredPile) {
      fgmState.previousHoveredPile.elevateTo();
      fgmState.previousHoveredPile.showSingle(undefined);
      fgmState.previousHoveredPile.setCoverDispMode(this.coverDispMode);
      this.highlightFrame.visible = false;
      fgmState.previousHoveredPile.draw();
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
   * Create a new pile instance
   *
   * @param {number} pileId - Pile ID.
   * @return {object} New or retrieved pile
   */
  pileCreate (pileId, maxNumPiles) {
    if (!this.pilesIdxState[pileId]) {
      const pile = new Pile(
        pileId,
        fgmState.scene,
        fgmState.scale,
        this.fragDims,
        maxNumPiles
      );

      this.pilesIdxState[pileId] = pile;
      this.pilesState.push(pile);
    }

    return this.pilesIdxState[pileId];
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
      const targetPile = this.pilesIdxState[targetPileId];
      const sourcePiles = config[targetPileId];

      // Do not pile up snippets on themselves
      if (sourcePiles.indexOf(targetPile) !== -1) { return; }

      const centerX = (
        targetPile.x +
        sourcePiles.reduce(
          (sum, pileId) => sum + this.pilesIdxState[pileId].x, 0
        )
      ) / (sourcePiles.length + 1);

      const centerY = (
        targetPile.y +
        sourcePiles.reduce(
          (sum, pileId) => sum + this.pilesIdxState[pileId].y, 0
        )
      ) / (sourcePiles.length + 1);

      piles.push(targetPile);
      piles.push(...sourcePiles.map(pileId => this.pilesIdxState[pileId]));

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

      if (fgmState.isPilesInspection) {
        this.store.dispatch(stackPilesInspection(config));
      } else {
        this.store.dispatch(stackPiles(config));
      }
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
      this.pilesIdxState[pileSortHelper.id].rank = index;
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
            .present.explore.fragments.matricesColors[matrix.id];

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
   * Remove piles from an inspected pile.
   *
   * @param {array} piles - Piles to be removed from inspected pile.
   */
  removeFromPile (piles) {
    if (!fgmState.isPilesInspection) { return; }

    const configGlobal = [];
    const configInspection = {};

    piles.forEach((pile) => {
      const matrixIds = pile.pileMatrices.map(matrix => matrix.id);

      configGlobal.push(...matrixIds);
      configInspection[pile.id] = matrixIds;
    });

    const source = this.pilesInspectionConfigs[
      this.pilesInspectionConfigs.length - 1
    ].__source;

    if (source.length > 1) {
      logger.info(
        'Removing multiple piles from more than one pile is not yet supported.'
      );
      // return;
    }

    // const sourcePileId = source[0];

    // console.log(sourcePileId, configGlobal, configInspection);

    // this.store.dispatch(splitPilesInspection(
    //   sourcePileId, sourcePileId, configInspection
    // ));

    // if (fgmState.isPilesInspection) {
    //   this.store.dispatch(stackPilesInspection(config));
    // } else {
    //   this.store.dispatch(stackPiles(config));
    // }
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
   * Resize handler when the base element's dimensions change.
   */
  resizeHandler () {
    this.updateWebGl();
  }

  /**
   * Scale pile.
   *
   * @param {object} pile - Pile to be scaled.
   * @param {number} wheelDelta - Wheel movement.
   */
  scalePile (pile, wheelDelta) {
    const force = Math.log(Math.abs(wheelDelta));
    const momentum = wheelDelta > 0 ? force : -force;

    const newScale = Math.min(
      Math.max(1, pile.scale * (1 + (0.1 * momentum))), 5
    );

    pile.setScale(newScale).frameCreate().draw();
    this.pilesZoomed[pile.id] = pile;
  }

  /**
   * Scale the plot, i.e., zoom into the plot
   *
   * @param {object} event - Mousewheel event.
   */
  scalePlot (event) {
    const force = Math.log(Math.abs(event.wheelDelta));
    const momentum = event.wheelDelta > 0 ? force : -force;

    this.mouse.x = (
      ((event.clientX - this.plotElDim.left) / this.plotElDim.width) * 2
    ) - 1;

    this.mouse.y = (
      -((event.clientY - this.plotElDim.top) / this.plotElDim.height) * 2
    ) + 1;

    const maxScale = 5;
    const minScale = 1;

    const scaledX = this.mouse.x / this.scale;
    const currentRelX = (
      (this.camera.position.x - this.cameraPosOrgX) / this.cameraPosOrgX
    );
    const absRelMouseX = currentRelX + scaledX;

    const scaledY = this.mouse.y / this.scale;
    const currentRelY = (
      (this.camera.position.y - this.cameraPosOrgY) / this.cameraPosOrgY
    );
    const absRelMouseY = -(currentRelY - scaledY);
    this.scale = Math.min(
      Math.max(minScale, this.scale * (1 + (0.05 * momentum))), maxScale
    );

    const offsetX = (
      (absRelMouseX * this.cameraPosOrgX) / this.scale * (this.scale - 1)
    );
    const offsetY = (
      (absRelMouseY * this.cameraPosOrgY) / this.scale * (this.scale - 1)
    );

    this.camera.zoom = this.scale;
    this.camera.position.setX(this.cameraPosOrgX + offsetX);
    this.camera.position.setY(this.cameraPosOrgY - offsetY);
    this.camera.updateProjectionMatrix();

    this.render();
  }

  /**
   * Helper method to scroll to the top.
   */
  scrollToTop () {
    this.scrollView(Infinity);
  }

  /**
   * Helper method to scroll to the top.
   */
  scrollToMax () {
    this.scrollView(0);
  }

  /**
   * Scroll the snippets plot.
   *
   * @param {number} wheelDelta - Wheel movement.
   * @param {boolean} abs - If `true` the `wheelDelta` defines the absolute
   *   scroll top position.
   */
  scrollView (wheelDelta, abs) {
    let cameraPosY;

    if (abs) {
      this.scrollTop = wheelDelta;
      cameraPosY = this.scrollTop + this.scrollLimitTop;
    } else {
      cameraPosY = this.camera.position.y;

      if (wheelDelta > 0) {
        // Scroll to the top
        cameraPosY = Math.min(
          cameraPosY + wheelDelta, this.scrollLimitTop
        );
      } else {
        cameraPosY = Math.max(
          cameraPosY + wheelDelta, this.scrollLimitBottom
        );
      }

      this.scrollTop = cameraPosY - this.scrollLimitTop;
    }

    this.camera.position.setY(cameraPosY);
  }

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

  /**
   * Set from disperse for nice disperse animations
   *
   * @param {object} piles - A list of piles to be dispersed.
   */
  setFromDisperse (piles) {
    this.fromDisperse = {};

    const pilesToBeDispersed = [];

    piles.forEach((pile) => {
      pile.pileMatrices.slice(1).forEach((pileMatrix) => {
        this.fromDisperse[pileMatrix.id] = pile;
      });

      pilesToBeDispersed.push(pile.id);
    });
  }

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
   * Setup piles from pile config
   *
   * @param {object} pilesConfig - Piles config.
   * @param {object} ignore - Object with keys to be ignored.
   * @return {array} List of promises.
   */
  setPilesFromConfig (pilesConfig, ignore) {
    const ready = [];

    Object.keys(pilesConfig).forEach((pileId) => {
      if (ignore && ignore[pileId]) { return; }

      const matrixIds = pilesConfig[pileId];

      let pile = this.pilesIdxState[pileId];

      if (matrixIds.length) {
        // Gte or create pile
        if (!pile) {
          pile = this.pileCreate(pileId, fgmState.matrices.length);
          this.destroyAltPile(pileId);
        }

        // Add matrices onto pile
        ready.push(pile.setMatrices(
          matrixIds
            .map(matrixId => fgmState.matrices[matrixId])
            // This causes an issue when snippets are faded out. I also forgot
            // why I added this.
            // .filter(matrix => matrix.visible)
        ));

        // Check if there is a pile that is dispersable
        if (!this.isDispersable) {
          this.isDispersable = (
            pile.pileMatrices.length > 1 &&
            (
              (fgmState.trashIsActive && pile.isTrashed) ||
              (!fgmState.trashIsActive && !pile.isTrashed)
            )
          );
        }

        if (!pile.pileMatrices.length) {
          pile.hide();
        }

        if (fgmState.trashIsActive) {
          if (pile.isTrashed && pile.isDrawn) {
            pile.hide();
          }

          if (!this.trashSize) {
            this.hideTrash();
          }
        } else if (pileId[0] === '_') {
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

    return ready;
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
   * Show pile menu.
   *
   * @param {object} pile - Associated pile.
   */
  showPileMenu (pile, event) {
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
      pile.show().frameUpdate().frameCreate().draw();
    });

    // Reset last scroll pos
    if (typeof this.lastScrollPos !== 'undefined') {
      this.scrollView(this.lastScrollPos, true);
      this.lastScrollPos = undefined;
    }

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

    // Save last scroll position
    this.lastScrollPos = this.scrollTop;

    this.calcGrid();
    this.scrollToTop();
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

  /**
   * Handle all piles display mode changes
   *
   * @param {object} event - Change event object.
   */
  toggleCoverDispMode () {
    this.store.dispatch(
      setCoverDispMode(
        this.coverDispMode !== MODE_AVERAGE ? MODE_AVERAGE : MODE_VARIANCE
      )
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
   * Toggle between zoom+pan and scaling.
   */
  toggleZoomPan () {
    this.isZoomPan = !this.isLayout1d ? !this.isZoomPan : false;
  }

  /**
   * Unsubscribe from Aurelia and base event listeners.
   */
  unsubscribeEventListeners () {
    // Remove Aurelia event listeners
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = undefined;

    // Remove basic JS event listeners.
    this.canvas.removeEventListener('click', this.preventDefault);
    this.canvas.removeEventListener(
      'contextmenu', this.canvasContextMenuHandler
    );
    this.canvas.removeEventListener('dblclick', this.preventDefault);
    this.canvas.removeEventListener('mousedown', this.canvasMouseDownHandler);
    this.canvas.removeEventListener('mouseleave', this.canvasMouseUpHandler);
    this.canvas.removeEventListener('mousemove', this.canvasMouseMoveHandler);
    this.canvas.removeEventListener('mouseup', this.canvasMouseUpHandler);
    this.canvas.removeEventListener('mousewheel', this.canvasMouseWheelHandler);
  }

  /**
   * Root state update handler
   *
   * @param {boolean} init - If `true` it's part of the init rendering cycle.
   * @param {boolean} noRendering - If `true` it's part of the init setup.
   */
  update (init, noRendering) {
    try {
      const state = this.store.getState().present.explore;
      const stateFgm = state.fragments;
      const stateHgl = state.higlass;

      const update = {};
      const ready = [];

      ready.push(this.updateHglSelectionView(stateHgl.config));
      ready.push(this.updateHglSelectionViewDomains(
        state.higlass.selectionView, update)
      );
      ready.push(this.updateHglSelectionFadeOut(
        state.higlass.fragmentsSelectionFadeOut, update)
      );

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
      ready.push(this.updatePilesInspection(stateFgm.pilesInspection, update));
      ready.push(this.updatePiles(stateFgm.piles, update));
      ready.push(this.updateShowSpecialCells(stateFgm.showSpecialCells, update));

      Promise.all([this.isInitFully, ...ready]).finally(() => {
        if (!noRendering) {
          this.updateRendering(update);
        }
      });
    } catch (error) {
      logger.error('State is invalid', error);
    }
  }

  /**
   * Hide inspection mode.
   */
  hideInspection () {
    this.resetInspection();
    fgmState.piles.forEach((pile) => {
      pile.show();
    });
  }

  /**
   * Destroy inspected piles and reset the index.
   */
  resetInspection () {
    this.destroyPiles(fgmState.pilesInspection);
    fgmState.pilesInspection = [];
  }

  /**
   * Hide normal piles and reset the inspected piles
   */
  showInspection () {
    fgmState.piles.forEach((pile) => {
      pile.hide();
    });

    this.resetInspection();
  }

  /**
   * Handler rendering after updates.
   *
   * @param {object} update - Object that states what to update
   */
  updateRendering (update) {
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

    if (update.layout) {
      window.requestAnimationFrame(() => {
        this.updateLayout(
          this.piles,
          fgmState.trashIsActive ? [] : this.arrangeMeasures
        ).then(() => {
          if (update.removePileArea) {
            setTimeout(() => {
              this.removePileArea();
              this.render();
            }, 250);
          }

          this.render();
        });
      });
    }

    if (update.drawPilesAfter) {
      this.redrawPiles();
    }

    if (update.pilesOpacity) {
      this.piles.forEach(pile => pile.updateAlpha());
    }

    if (update.scrollLimit) {
      this.setScrollLimit();
    }

    if (update.scrollToTop) {
      this.scrollToTop();
    }

    if (update.scrollToMax) {
      this.scrollToMax();
    }

    this.render();
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
      return Promise.resolve();
    }

    this.arrangeMeasures = _arrangeMeasures;

    if (
      this.arrangeMeasures.length === 1 &&
      this.arrangeMeasures[0] === CLUSTER_TSNE
    ) {
      fgmState.isLayout2d = false;
      fgmState.isLayoutMd = true;
      fgmState.scale = 0.25;

      update.scrollToTop = true;
    } else {
      this.arrangeMeasuresReadible = this.arrangeMeasures.map(
        measure => this.wurstCaseToNice(measure)
      );

      this.selectMeasure(this.arrangeMeasures, fgmState.measures);

      if (this.arrangeMeasures.length > 1) {
        fgmState.isLayout2d = this.arrangeMeasures.length === 2;
        fgmState.isLayoutMd = !fgmState.isLayout2d;
        fgmState.scale = 0.25;

        update.scrollToTop = true;
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
    update.scrollLimit = true;

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
      return Promise.resolve();
    }

    this.coverDispMode = coverDispMode;

    update.grid = true;
    update.piles = true;

    return Promise.resolve();
  }

  /**
   * Update the cell size.
   *
   * @param {number} size - New cell size.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateCellSize (size, update) {
    if (fgmState.cellSize === size) { return Promise.resolve(); }

    fgmState.cellSize = size;

    update.piles = true;
    update.pileFramesRecreate = true;
    update.scrollLimit = true;
    update.scrollToMax = true;
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
    if (fgmState.gridSize === size) { return Promise.resolve(); }

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
    if (fgmState.isHilbertCurve === isHilbertCurve) {
      return Promise.resolve();
    }

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
      return Promise.resolve();
    }

    this.hglSelectionViewDomains = domains;

    this.determineMatrixVisibility();

    update.pilesOpacity = true;

    return Promise.resolve();
  }

  updateHglSelectionFadeOut (fadeOut, update) {
    if (fgmState.hglSelectionFadeOut === fadeOut) {
      return Promise.resolve();
    }

    fgmState.hglSelectionFadeOut = fadeOut;

    update.pilesOpacity = true;

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
      return Promise.resolve();
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
   * @param {boolean} reArrange - If `true` recalculate arrangement.
   * @return {object} Promise resolving when to layout if fully updated.
   */
  updateLayout (
    piles = this.piles,
    measures = this.arrangeMeasures,
    noAnimation = false,
    reArrange = false
  ) {
    return new Promise((resolve, reject) => {
      const arranged = this.arrange(
        piles, measures, reArrange || this.fromDisperseRecluster
      );

      this.fromDisperseRecluster = false;

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

          return Promise.resolve();
        })
        .then(() => {
          // Piles have been animated
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
    ) { return Promise.resolve(); }

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
    ) { return Promise.resolve(); }

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
      return Promise.resolve();
    }

    fgmState.matrixOrientation = orientation;

    update.piles = true;

    return Promise.resolve();
  }

  /**
   * Update piles.
   *
   * @param {object} pilesConfigs - Config object
   * @param {object} update - Update object to be updated in-place.
   * @param {boolean} force - If `true` force update
   */
  updatePiles (pilesConfigs, update, force) {
    if (
      (this.pilesNormalConfigs === pilesConfigs || !this.isInitialized) &&
      !force &&
      !update.pilesForce
    ) {
      return Promise.resolve();
    }

    if (fgmState.isPilesInspection) {
      return Promise.resolve();
    }

    this.pilesNormalConfigs = pilesConfigs;

    this.isDispersable = false;

    const ready = this.setPilesFromConfig(pilesConfigs);

    if (this.fromDisperse) {
      update.removePileArea = true;
    }

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
   * Update the config of pile inspection.
   *
   * @param {object} pilesInspectionConfigs - Piles inspection config object.
   * @param {object} update - Update object to be updated in-place.
   * @param {boolean} force - If `true` force update
   */
  updatePilesInspection (pilesInspectionConfigs, update, force) {
    if (
      (
        this.pilesInspectionConfigs === pilesInspectionConfigs ||
        !this.isInitialized
      ) &&
      !force &&
      !update.pilesForce
    ) {
      return Promise.resolve();
    }

    this.pilesInspectionConfigs = pilesInspectionConfigs;
    this.isDispersable = false;

    if (!this.pilesInspectionConfigs.length) {
      update.pilesForce = fgmState.isPilesInspection;
      this.hideInspection();
      fgmState.isPilesInspection = false;
      return Promise.resolve();
    }

    const newInspection = !fgmState.isPilesInspection || this.fromInspection;
    const pilesConfig = this.pilesInspectionConfigs[
      this.pilesInspectionConfigs.length - 1
    ];

    fgmState.isPilesInspection = true;

    if (newInspection) {
      this.showInspection();
    }

    const ready = this.setPilesFromConfig(
      pilesConfig,
      { __source: true }
    );

    if (this.fromDisperse) {
      update.removePileArea = true;
    }

    this.fromDisperse = undefined;

    if (!fgmState.trashIsActive) {
      this.assessMeasuresMax();
    }

    this.fromInspection = false;

    update.layout = true;
    update.scrollLimit = true;
    update.drawPilesAfter = true;
    update.inspection = true;

    return Promise.all(ready);
  }

  /**
   * Update piles when special cells are shown or hidden
   *
   * @param {boolean} showSpecialCells - If `true` show special cells.
   * @param {object} update - Update object to bve updated in-place.
   */
  updateShowSpecialCells (showSpecialCells, update) {
    if (fgmState.showSpecialCells === showSpecialCells) {
      return Promise.resolve();
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

      this.cameraPosOrgX = (this.plotElDim.width / 2);
      this.cameraPosOrgY = MARGIN_TOP - (this.plotElDim.height / 2);

      this.camera.position.x = this.cameraPosOrgX;
      this.camera.position.y = this.cameraPosOrgY;
      this.scrollLimitTop = this.cameraPosOrgY;

      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.plotElDim.width, this.plotElDim.height);

      // Rerender
      this.updateRendering({
        grid: true,
        layout: true,
        scrollLimit: true
      });
    }
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
