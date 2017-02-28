// Aurelia
import {
  bindable,
  inject,
  LogManager
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

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


// Third party
import { json } from 'd3';

// Injectables
import States from 'services/states';

// Utils etc.
import {
  // addPiles,
  dispersePiles,
  setAnimation,
  setArrangeMeasures,
  setCellSize,
  setCoverDispMode,
  setLassoIsRound,
  setMatrixFrameEncoding,
  setMatrixOrientation,
  setPiles,
  setShowSpecialCells,
  stackPiles
} from 'components/fragments/fragments-actions';

import {
  ARRANGE_MEASURES,
  CLICK_DELAY_TIME,
  DBL_CLICK_DELAY_TIME,
  DURATION,
  FONT_URL,
  FPS,
  HIGHLIGHT_FRAME_LINE_WIDTH,
  LINE,
  LASSO_MATERIAL,
  LASSO_MIN_MOVE,
  MARGIN_BOTTOM,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP,
  MATRIX_FRAME_ENCODING,
  MATRIX_GAP_HORIZONTAL,
  MATRIX_GAP_VERTICAL,
  MATRIX_ORIENTATION_3_TO_5,
  MATRIX_ORIENTATION_5_TO_3,
  MATRIX_ORIENTATION_INITIAL,
  MATRIX_ORIENTATION_UNDEF,
  MODE_MAD,
  MODE_MEAN,
  MODE_STD,
  PILE_LABEL_HEIGHT,
  PILE_MENU_CLOSING_DELAY,
  PREVIEW_MAX,
  PREVIEW_SIZE,
  WEB_GL_CONFIG,
  Z_BASE,
  Z_DRAG,
  Z_LASSO,
  Z_STACK_PILE_TARGET,
  ZOOM_DELAY_TIME
} from 'components/fragments/fragments-defaults';

import fgmState from 'components/fragments/fragments-state';

import Pile from 'components/fragments/pile';

import Matrix from 'components/fragments/matrix';

import {
  calculateClusterPiling,
  calculateDistances,
  createRectFrame
} from 'components/fragments/fragments-utils';

import { EVENT_BASE_NAME } from 'components/multi-select/multi-select-defaults';

import COLORS from 'configs/colors';

import debounce from 'utils/debounce';

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


@inject(EventAggregator, States)
export class Fragments {
  @bindable baseElIsInit = false;

  constructor (eventAggregator, states) {
    this.event = eventAggregator;

    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.fragments = {};
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
    this.lassoRectIsActive = false;
    this.lassoRoundIsActive = false;
    this.mouseWentDown = false;
    fgmState.showSpecialCells = false;

    this.isLoading = true;

    this.mouseClickCounter = 0;

    this.closePileMenuDb = debounce(
      this.closePileMenu.bind(this),
      PILE_MENU_CLOSING_DELAY
    );

    this.arrangeMeasuresAccessPath = [
      'decompose', 'fragments', 'arrangeMeasures'
    ];

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
      'decompose.fgm.coverDispMode',
      this.changeCoverDispMode.bind(this)
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
  }

  attached () {
    this.resolve.isAttached();
  }

  baseElIsInitChanged () {
    if (this.baseElIsInit) {
      this.resolve.isBaseElInit();
    }
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  get cellSize () {
    return fgmState.cellSize * (fgmState.trashIsActive ? 1 : fgmState.scale);
  }

  get plotElDim () {
    return fgmState.plotElDim;
  }

  get pilePreviewHeight () {
    return PREVIEW_MAX * this.previewSize;
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

  get matrixWidth () {
    return this.fragDims * this.cellSize;
  }

  get matrixWidthHalf () {
    return this.matrixWidth / 2;
  }

  get piles () {
    return fgmState.trashIsActive ? fgmState.pilesTrash : fgmState.piles;
  }

  get pileMeshes () {
    return fgmState.trashIsActive ? fgmState.pileMeshesTrash : fgmState.pileMeshes;
  }

  get previewSize () {
    return this.cellSize * (this.cellSize > 3 ? 1 : PREVIEW_SIZE);
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

  get trashSize () {
    return fgmState.pilesTrash.length;
  }


  /* ---------------------------- Custom Methods ---------------------------- */


  /**
   * Handles changes of animation
   *
   * @param {boolean} animation - If `true` vbisual changes will be animated.
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
    if (!measures || !measures.length) {
      this.rank(piles);
    }

    if (measures.length === 1) {
      this.rank(piles, measures[0]);
    }

    // if (measures.length === 2) {

    // }

    // if (measures.length > 2) {
    // }
  }

  /**
   * Handles changes of arrange measures amd dispatches the appropriate action.
   *
   * @param {array} measures - List of measures to arrange piles.
   */
  arrangeChangeHandler (measures) {
    let arrangeMeasures;

    try {
      arrangeMeasures = measures.map(metric => metric.id);
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
   * Set grid properties.
   */
  calcGrid () {
    this.getPlotElDim();

    // Raw cell height and width
    this.gridCellHeight = (
      this.matrixWidth +
      this.pilePreviewHeight +
      PILE_LABEL_HEIGHT +
      MATRIX_GAP_VERTICAL
    );

    this.gridCellWidth = this.matrixWidth + MATRIX_GAP_HORIZONTAL;

    // Columns and rows
    this.gridNumCols = Math.max(Math.floor(
      (this.plotElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
      this.gridCellWidth
    ), 1);

    this.gridNumRows = Math.max(Math.floor(
      (this.plotElDim.height - MARGIN_TOP - MARGIN_BOTTOM) /
      this.gridCellHeight
    ), 1);

    this.visiblePilesMax = this.gridNumCols * this.gridNumRows;

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
  }

  /**
   * [calculatePiles description]
   *
   * @param {[type]} value - [description]
   * @return {[type]} [description]
   */
  calculatePiles (value) {
    this.isLoading = true;

    this.setPiling(calculateClusterPiling(value, fgmState.matrices, this.dMat));
  }

  /**
   * Handle click events
   */
  canvasClickHandler () {
    if (this.mouseIsDown) {
      return;
    }

    if (this.hoveredTool) {
      this.hoveredTool.trigger(this.hoveredTool.pile);

      if (this.hoveredTool.closeOnClick) {
        this.closePileMenu();
      }

      if (this.hoveredTool.unsetHighlightOnClick) {
        this.highlightPile();
      }

      this.render();

      this.hoveredTool = undefined;
    } else if (fgmState.hoveredGapPile) {
      this.pileBackwards(fgmState.hoveredGapPile);
      fgmState.hoveredGapPile = undefined;
    } else if (this.hoveredMatrix) {
      this.splitPile(this.hoveredMatrix);
      this.hoveredMatrix = undefined;
    } else if (this.hoveredStrandArrow) {
      this.hoveredStrandArrow.userData.pile.flipMatrix(
        this.hoveredStrandArrow.userData.axis
      ).draw();
    }

    if (fgmState.hoveredPile) {
      // Re-draw hovered pile to show menu.
      fgmState.hoveredPile.draw();
    }

    this.render();
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
      this.dispersePileHandler(fgmState.hoveredPile);
      fgmState.hoveredPile = undefined;
    } else if (this.pileZoomed) {
      this.pileZoomed.setScale().frameCreate().draw();
      this.pileZoomed = undefined;
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

    this.mouseDownDwelling = setTimeout(() => {
      fgmState.hoveredPile.frameSetTemp(COLORS.GREEN, 2, true).draw(true);
      this.render();
    }, ZOOM_DELAY_TIME);

    // // test if mouse dwells on a matrix -> open pile
    // if (
    //   fgmState.hoveredPile &&
    //   fgmState.hoveredPile.size > 1 &&
    //   typeof this.hoveredMatrix === 'undefined'
    // ) {
    //   this.mouseIsDownTimer = setInterval(() => {
    //     this.openedPileRoot = fgmState.hoveredPile;
    //     this.openedPileMatricesNum = fgmState.hoveredPile
    //       .pileMatrices.length - 1;
    //     this.dispersePileHandler(this.openedPileRoot);
    //     clearInterval(this.mouseIsDownTimer);
    //   }, 500);
    // }
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
   * Handle mouse over pile
   *
   * @param {object} pileMesh - Pile mesh being moused over.
   */
  mouseOverPileHandler (pileMesh) {
    let x = pileMesh.position.x;
    let y = pileMesh.position.y;

    if (fgmState.menuPile && fgmState.menuPile !== pileMesh.pile) {
      this.closePileMenu();
    }

    fgmState.hoveredPile = pileMesh.pile;

    if (!this.lassoIsActive) {
      this.highlightPile(fgmState.hoveredPile);
    }

    // Preview single matrices of piles with multiple matrices
    if (fgmState.hoveredPile.pileMatrices.length > 1) {
      const absY = this.relToAbsPositionY(this.mouse.y);

      if (absY > y + fgmState.hoveredPile.matrixWidthHalf) {
        let d = absY - (y + fgmState.hoveredPile.matrixWidthHalf);
        let i = Math.floor(d / fgmState.hoveredPile.previewSize);

        fgmState.hoveredPile.showSingle(
          fgmState.hoveredPile.getMatrix(i)
        );
        this.hoveredMatrix = fgmState.hoveredPile.getMatrix(i);
      } else {
        fgmState.hoveredPile.showSingle();
        // this.resetHighlightedPile();
      }
    }

    // Check if we're hovering a gap
    // if (this.relToAbsPositionX(this.mouse.x) > x + this.matrixWidthHalf) {
    //   fgmState.hoveredGapPile = fgmState.hoveredPile;
    // } else if (fgmState.hoveredGapPile) {
    //   fgmState.hoveredGapPile.draw();
    //   fgmState.hoveredGapPile = undefined;
    // }

    this.hoveredCell = undefined;

    if (event.shiftKey) {
      // test which cell is hovered.
      let col = Math.floor((this.mouse.x - (x - this.matrixWidthHalf)) / this.cellSize);
      let row = Math.floor(-(this.mouse.y - (y + this.matrixWidthHalf)) / this.cellSize);
      if (
        row >= 0 ||
        row < fgmState.focusNodes.length ||
        col >= 0 ||
        col < fgmState.focusNodes.length
      ) {
        fgmState.hoveredPile.updateLabels();
        this.hoveredCell = { row, col };
      }
    }

    for (let i = 0; i < this.piles.length; i++) {
      this.piles[i].updateHoveredCell();
    }

    fgmState.hoveredPile.updateLabels();

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
      fgmState.previousHoveredPile.showSingle(undefined);
      fgmState.previousHoveredPile.setCoverMatrixMode(this.coverDispMode);
      this.highlightFrame.visible = false;
      fgmState.previousHoveredPile.draw(false, true);
      fgmState.previousHoveredPile = undefined;
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
    this.hoveredMatrix = undefined;
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

    // Remove menu is no pile is hovered
    if (!fgmState.hoveredPile) {
      this.closePileMenuDb();
    }

    this.mouseWentDown = false;
    this.render();
  }

  /**
   * Handle mouse clicks manually
   *
   * @description
   * Single and double mouse clicks interfere with mouse up events when
   * listeneing to them separately.
   */
  canvasMouseClickHandler () {
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
          this.canvasClickHandler();
          this.mouseClickTimeout = setTimeout(() => {
            this.mouseClickCounter = 0;
          }, DBL_CLICK_DELAY_TIME);
          break;
      }
    } else {
      this.mouseClickCounter = 0;

      if (fgmState.layout2d && this.mouseDownTimeDelta > ZOOM_DELAY_TIME) {
        this.pileZoomed = fgmState.hoveredPile.scaleTo(6).frameCreate().draw();
      }
    }
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

    clearTimeout(this.mouseDownDwelling);

    let pilesSelected = [];

    if (this.openedPileRoot) {
      this.closeOpenedPile(this.openedPileRoot);
    } else if (this.dragPile) {
      // place pile on top of previous pile
      if (!fgmState.hoveredPile) {
        // Move pile back to original position
        let pos = this.getLayoutPosition(this.dragPile);
        this.dragPile.moveTo(pos.x, pos.y);
        this.dragPile.elevateTo(Z_BASE);
      } else {
        // Pile up the two piles
        this.pileUp([this.dragPile], fgmState.hoveredPile);
      }

      this.dragPile = undefined;
    } else if (this.lassoRectIsActive) {
      pilesSelected = this.getLassoRectSelection(
        this.dragStartPos.x, this.mouse.x, this.dragStartPos.y, this.mouse.y
      );
    } else if (this.lassoRoundIsActive && this.lassoRoundMinMove) {
      pilesSelected = this.getLassoRoundSelection();
    } else {
      this.canvasMouseClickHandler(event);
    }

    if (pilesSelected.length > 1) {
      this.pileUp(pilesSelected.slice(1), pilesSelected[0]);
    }

    this.dragStartPos = undefined;
    this.mouseWentDown = false;

    this.lassoIsActive = false;
    this.lassoRectIsActive = false;
    this.lassoRoundIsActive = false;

    this.render();
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

  /**
   * Close inspected pile
   *
   * @param {object} openedPile - Opened inspeced pile.
   */
  closeOpenedPile (openedPile) {
    let piles = [];
    let openedPileIndex = this.piles.indexOf(this.openedPileRoot);

    for (let i = 0; i <= this.openedPileMatricesNum; i++) {
      piles.push(this.piles[openedPileIndex + i]);
    }

    this.pileUp(piles, this.piles[openedPileIndex]);

    this.startAnimations();
    this.openedPileRoot = undefined;
    this.openedPileMatricesNum = 0;
  }

  /**
   * Close pile menu.
   */
  closePileMenu () {
    fgmState.visiblePileTools.forEach((visiblePileTool) => {
      fgmState.scene.remove(visiblePileTool);
    });
    fgmState.visiblePileTools = [];
    fgmState.menuPile = undefined;
  }

  /**
   * Handle mousewheel events
   *
   * @param {object} event - Mousewheel event.
   */
  canvasMouseWheelHandler (event) {
    event.preventDefault();

    if (event.wheelDelta > 0) {
      this.camera.position.setY(Math.min(
        this.camera.position.y + event.wheelDelta, this.scrollLimitTop
      ));
    } else {
      this.camera.position.setY(Math.max(
        this.camera.position.y + event.wheelDelta, this.scrollLimitBottom
      ));
    }

    this.render();
  }

  /**
   * Cell size changed handler.
   *
   * @param {object} event - Chaneg event object.
   */
  cellSizeChangedHandler (event) {
    try {
      this.store.dispatch(setCellSize(parseInt(event.target.value, 10)));
    } catch (e) {
      // Somthing weird happened so we'll simply ignore the change
    }
  }

  /**
   * Depile a pile
   *
   * @param {object} pile - Pile to be dispersed.
   */
  dispersePileHandler (pile) {
    this.store.dispatch(dispersePiles([pile.id]));
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
      if (!this.lassoRoundIsActive) {
        this.lassoRoundIsActive = true;
      }
      this.drawLassoRound(startX, currentX, startY, currentY);
    } else {
      if (!this.lassoRectIsActive) {
        this.lassoRectIsActive = true;
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
      ...this.relToAbsPosition(x1 + ((x2 - x1) / 2), y1 + ((y2 - y1) / 2)),
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
      this.relToAbsPositionY(currentY)
    ]);

    if (!this.lassoRoundMinMove && dist > LASSO_MIN_MOVE * this.cellSize) {
      this.lassoRoundMinMove = true;
    }

    if (this.intersects.length) {
      this.lassoRoundSelection[this.intersects[0].object.pile.id] = true;
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
   * [focusOn description]
   *
   * @param {[type]} nodes - [description]
   * @return {[type]} [description]
   */
  focusOn (nodes) {
    fgmState.focusNodes = nodes;

    // update sizes
    this.matrixWidth = this.cellSize * fgmState.focusNodes.length;
    this.matrixWidthHalf = this.matrixWidth / 2;

    fgmState.calculateDistanceMatrix();

    // update highlight frame
    fgmState.scene.remove(this.highlightFrame);
    this.highlightFrame = createRectFrame(
      this.matrixWidth, this.matrixWidth, 0x000000, HIGHLIGHT_FRAME_LINE_WIDTH
    );
    fgmState.scene.add(this.highlightFrame);

    // redraw
    this.piles.forEach(pile => pile.frameUpdate());
    this.redrawPiles();
    this.updateLayout().then(() => {
      this.render();
    });
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
    return Object.keys(
      this.lassoRoundSelection).map(pileId => fgmState.pilesIdx[pileId]
    );
  }

  /**
   * Get position for a pile.
   *
   * @param {number} pileSortIndex - Pile sort index.
   * @param {boolean} abs - If `true` the position needs to be adjusted to the
   *   WebGL coordinates.
   * @return {object} Object with x and y coordinates
   */
  getLayoutPosition (pile, abs) {
    const numArrMeasures = this.arrangeMeasures.length;

    if (numArrMeasures === 2 && !fgmState.trashIsActive) {
      return this.getLayoutPosition2D(
        pile,
        this.arrangeMeasures[0],
        this.arrangeMeasures[1],
        abs
      );
    }

    // if (numArrMets > 2) {
    //   return this.getLayoutPosition2D(pile.ranking);
    // }

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
    let x = (
      fgmState.gridCellWidthInclSpacing * (pileSortIndex % this.gridNumCols)
    ) || MARGIN_LEFT;

    let y = (
      Math.trunc(pileSortIndex / this.gridNumCols) *
      fgmState.gridCellHeightInclSpacing
    ) || MARGIN_TOP;

    if (abs) {
      x += fgmState.gridCellWidthInclSpacingHalf;
      y = -y - fgmState.gridCellHeightInclSpacingHalf;
    }

    return { x, y };
  }

  getLayoutPosition2D (pile, measureX, measureY, abs) {
    let relX = pile.measures[measureX] / fgmState.dataMeasuresMax[measureX];
    let relY = pile.measures[measureY] / fgmState.dataMeasuresMax[measureY];

    let x = relX * (
      this.plotElDim.width - fgmState.gridCellWidthInclSpacing
    );
    let y = (1 - relY) * (
      this.plotElDim.height - (1.5 * fgmState.gridCellWidthInclSpacing)
    );

    if (abs) {
      x += fgmState.gridCellWidthInclSpacingHalf;
      y = -y - fgmState.gridCellHeightInclSpacingHalf;
    }

    return { x, y };
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

  /**
   * Automatically groups piles such that the user doesn't have to scroll
   * anymore.
   *
   * @description
   * This function stacks up snippets by pairwise similarity.
   */
  groupPiles () {
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

  calcDistanceEucl (matrixA, matrixB) {
    return Math.sqrt(matrixA.reduce(
      (acc, valueA, index) =>
        acc + ((Math.max(valueA, 0) - Math.max(matrixB[index], 0)) ** 2),
      0
    ));
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
   * [hidedistance description]
   *
   * @return {[type]} [description]
   */
  hidedistance () {
    fgmState.matrices.forEach(matrix => matrix.g_course.style('opacity', '1'));
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
   * General init
   */
  init () {
    this.getPlotElDim();

    this.initShader();
    this.initWebGl();
    this.initEventListeners();

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
    this.dataMeasures = [];
    fgmState.measures = [];
    header.forEach((headerField, index) => {
      if (!(index in usedIdx)) {
        this.dataMeasures[headerField] = index;
        fgmState.measures.push({
          id: headerField,
          name: headerField[0].toUpperCase() +
            headerField.slice(1).replace(/[-_]/g, ' ')
        });
        fgmState.dataMeasuresMax[headerField] = 0;
      }
    });

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
      'dblclick', event => event.preventDefault(), false
    );

    this.canvas.addEventListener(
      'mousedown', this.canvasMouseDownHandler.bind(this), false
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
    fragments.forEach((fragment, index) => {
      const measures = {};

      Object.keys(this.dataMeasures).forEach((measure) => {
        measures[measure] = fragment[this.dataMeasures[measure]];
      });

      fgmState.matrices.push(new Matrix(
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
      ));
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
      const update = {};
      this.updatePiles(pileConfig, true, update);
      this.updateRendering(update);
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
   * Handle general mouse moves
   */
  mouseMoveGeneralHandler () {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check if the user mouses over the pile menu
    if (fgmState.visiblePileTools.length > 0) {
      let intersects = this.raycaster
        .intersectObjects(fgmState.visiblePileTools);
      if (intersects.length > 0) {
        this.hoveredTool = intersects[0].object.pileTool;

        if (this.hoveredTool.triggerEvent === 'hover') {
          this.hoveredTool.trigger(fgmState.hoveredPile);
        }
        return;
      }
    }

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
      (
        this.mouseWentDown && !fgmState.hoveredPile
      )
    ) {
      if (!this.lassoIsActive) {
        this.initLasso();
      }

      this.drawLasso(
        this.dragStartPos.x, this.mouse.x, this.dragStartPos.y, this.mouse.y
      );
    }
  }

  /**
   * Piles all matrices prior to the selected one, including the selected one.
   *
   * @param {object} pile - Pile
   */
  pileBackwards (pile) {
    let pileIndex = this.piles.indexOf(pile);
    let piles = [];

    if (pile.size === 1) {
      for (let j = pileIndex; j >= 0; j--) {
        if (j === 0 || this.piles[j - 1].size() > 1) {
          this.pileUp(piles, this.piles[j]);
          return;
        }

        piles.push(...this.piles[j]);
      }
    } else if (this.piles.indexOf(pile) > 0) {
      this.pileUp(
        pile,
        this.piles[this.piles.indexOf(pile) - 1]
      );
    }

    this.startAnimations();
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
   * Piles a set of matrices onto a target pile removes it from source pile, and
   * updates the layout.
   *
   * @param {array} matrices - Number of matrices to be piled up
   * @param {object} targetPile - Target pile instance
   * @param {boolean} noAnimation - If `true` animation is skipped.
   */
  pileUp (piles, targetPile, noAnimation) {
    let animation;

    targetPile.elevateTo(Z_STACK_PILE_TARGET);

    if (fgmState.animation && !noAnimation) {
      animation = this.movePilesAnimated(
        piles,
        new Array(piles.length).fill(
          { x: targetPile.x, y: targetPile.y }
        )
      );
    } else {
      animation = Promise.resolve();
    }

    animation.finally(() => {
      targetPile.elevateTo(Z_BASE);

      this.store.dispatch(stackPiles({
        [targetPile.id]: piles.map(pile => pile.id)
      }));
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
   * Convert local to global Y positions.
   *
   * @param {number} x - Local Y position.
   * @return {number} Global Y position.
   */
  relToAbsPositionY (y) {
    return ((y - 1) / 2 * this.plotElDim.height);
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
   * [render description]
   *
   * @return {[type]} [description]
   */
  render () {
    this.renderer.render(fgmState.scene, this.camera);
  }

  /**
   * [setPileMode description]
   *
   * @param {[type]} mode  - [description]
   * @param {[type]} piles - [description]
   */
  setPileMode (mode, piles) {
    piles.forEach((pile) => { pile.setCoverMatrixMode(mode); });
  }

  /**
   * [setSimilarityPiling description]
   *
   * @param {[type]} value - [description]
   */
  setSimilarityPiling (value) {
    this.calculatePiles(value);
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
   * [setPiling description]
   *
   * @param {[type]} newPiling - [description]
   */
  setPiling (newPiling) {
    this.piles.forEach(pile => this.destroyPile(pile));

    this.piles = [];

    let matrices = [];
    let l = 0;

    for (let i = 1; i <= newPiling.length; i++) {
      matrices = [];

      if (i < newPiling.length) {
        for (let j = l; j < newPiling[i]; j++) {
          matrices.push(matrices[j]);
        }
      } else if (l < matrices.length) {
        for (let j = l; j < matrices.length; j++) {
          matrices.push(matrices[j]);
        }
      } else {
        break;
      }

      const newPile = new Pile(
        this.piles.length,
        fgmState.scene,
        fgmState.scale,
        this.fragDims
      );

      this.piles.push(newPile);
      newPile.addMatrices(matrices);

      this.sortByOriginalOrder(newPile);
      newPile.setCoverMatrixMode(this.coverDispMode);
      newPile.draw();

      l = newPiling[i];
    }

    this.isLoading = true;

    this.updateLayout().then(() => {
      this.render();
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
   * Change handler for showing special cells
   *
   * @return {boolean} `True` to not keep the event form bubbling up.
   */
  showSpecialCellsChangeHandler () {
    this.store.dispatch(setShowSpecialCells(!fgmState.showSpecialCells));

    return true;
  }

  /**
   * Hide trashed piles
   */
  hideTrash () {
    fgmState.trashIsActive = false;

    fgmState.pilesTrash.forEach((pile) => {
      pile.hide();
    });

    fgmState.piles.forEach((pile) => {
      pile.frameCreate();
      pile.draw();
    });

    this.calcGrid();
    this.setScrollLimit();
    this.updateLayout(this.piles, this.arrangeMeasures, true).then(() => {
      this.render();
    });
  }

  /**
   * Show trashed piles
   */
  showTrash () {
    fgmState.trashIsActive = true;

    fgmState.piles.forEach((pile) => {
      pile.hide();
    });

    fgmState.pilesTrash.forEach((pile) => {
      pile.frameCreate();
      pile.draw();
    });

    this.calcGrid();
    this.setScrollLimit();
    this.updateLayout(this.piles, [], true).then(() => {
      this.render();
    });
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
   * Splits a pile at the position of the passed matrix. The passed matrix
   * becomes the base for the new pile.
   *
   * @param {array} matrix - Matrix
   * @param {boolean} noAnimation - If `true` force no animation.
   */
  splitPile (matrix, noAnimation) {
    if (noAnimation) {
      let pileSrc = matrix.pile;
      let pileNew = new Pile(
        this.piles.length,
        fgmState.scene,
        fgmState.scale,
        this.fragDims
      );

      pileNew.colored = pileSrc.colored;
      this.piles.splice(this.piles.indexOf(pileSrc) + 1, 0, pileNew);

      let m = [];
      for (let i = pileSrc.getMatrixPosition(matrix); i < pileSrc.size(); i++) {
        // Needs refactoring
        m.push(pileSrc.getMatrix(i));
      }

      this.pileUp(m, pileNew);

      pileNew.draw();
      pileSrc.draw();

      this.updateLayout().then(() => {
        this.render();
      });
    } else {
      // Needs refactoring
      // this.pilingAnimations.push(SplitAnimation(matrix));
      // this.startAnimations();
    }
  }

  /**
   * Starts all animations in pilingAnimations array.
   */
  startAnimations () {
    clearInterval(this.interval);

    this.interval = setInterval(() => {
      this.pilingAnimations.forEach((pileAnimation, index) => {
        pileAnimation.step();
        if (pileAnimation.done) {
          this.pilingAnimations.splice(index, 1);
        }
      });

      if (this.pilingAnimations.length === 0) {
        clearInterval(this.interval);
        this.interval = undefined;
        this.pilingAnimations = [];
        this.updateLayout().then(() => {
          this.render();
        });
      }

      this.render();
    }, 500 / FPS);
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
   */
  update () {
    try {
      const state = this.store.getState().present.decompose;
      const stateFgm = state.fragments;

      const update = {};

      this.updatePlotSize(state.columns, update);

      this.updateAnimation(stateFgm.animation);
      this.updateArrangeMeasures(stateFgm.arrangeMeasures, update);
      this.updateCoverDispMode(stateFgm.coverDispMode, update);
      this.updateCellSize(stateFgm.cellSize, update);
      this.updateConfig(stateFgm.config);
      this.updateLassoIsRound(stateFgm.lassoIsRound);
      this.updateMatrixFrameEncoding(stateFgm.matrixFrameEncoding, update);
      this.updateMatrixOrientation(stateFgm.matrixOrientation, update);
      this.updatePiles(stateFgm.piles, false, update);
      this.updateShowSpecialCells(stateFgm.showSpecialCells, update);

      this.updateRendering(update);
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  updateRendering (update) {
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

    if (update.piles || update.pileFramesRecreate) {
      this.redrawPiles();
    }

    if (update.scrollLimit) {
      this.setScrollLimit();
    }

    if (this.isInitialized) {
      this.render();
    }

    if (update.layout) {
      this.updateLayout().then(() => {
        this.render();
      });
    }
  }

  /**
   * Update animation state.
   *
   * @param {boolean} animation - If `true` visual changes will be animated.
   */
  updateAnimation (animation) {
    fgmState.animation = animation;

    return 0;
  }

  /**
   * Update the arrange measures.
   *
   * @param {array} arrangeMeasures - Array of measure IDs.
   */
  updateArrangeMeasures (arrangeMeasures, update) {
    const _arrangeMeasures = arrangeMeasures || ARRANGE_MEASURES;

    if (this.arrangeMeasures === _arrangeMeasures) {
      return;
    }

    this.arrangeMeasures = _arrangeMeasures;

    this.selectMeasure(this.arrangeMeasures, fgmState.measures);

    if (this.arrangeMeasures.length > 1) {
      fgmState.layout2d = true;
      fgmState.scale = 0.25;
    } else {
      fgmState.layout2d = false;
      fgmState.scale = 1;
    }

    if (this.isInitialized) {
      update.grid = true;
      update.piles = true;
      update.pileFrames = true;
      update.layout = true;
    }
  }

  /**
   * Update the display mode of all piles.
   *
   * @param {number} coverDispMode - Display mode number.
   */
  updateCoverDispMode (coverDispMode, update) {
    if (this.coverDispMode === coverDispMode) {
      return;
    }

    this.coverDispMode = coverDispMode;

    if (this.isInitialized) {
      this.setPileMode(this.coverDispMode, this.piles);
      update.grid = true;
      update.piles = true;
    }
  }

  /**
   * Update the cell size and rerender the piles
   *
   * @param {number} newSize - New cell size
   */
  updateCellSize (newSize, update) {
    if (fgmState.cellSize === newSize) {
      return;
    }

    fgmState.cellSize = newSize;

    if (this.isInitialized) {
      update.grid = true;
      update.piles = true;
      update.pileFramesRecreate = true;
      update.layout = true;
      update.scrollLimit = true;
    }
  }

  /**
   * Handle updating the config
   *
   * @param {object} newConfig - New config
   */
  updateConfig (newConfig) {
    if (this.fragments.config !== newConfig) {
      this.fragments.config = newConfig;
      this.loadData(this.fragments.config);
    }
  }

  /**
   * Update lasso is round
   *
   * @param {boolean} lassoIsRound - If `true` lasso is round.
   */
  updateLassoIsRound (lassoIsRound) {
    this.lassoIsRound = lassoIsRound;
  }

  /**
   * Update every pile
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
      this.arrange(piles, fgmState.trashIsActive ? [] : measures);

      let animation;

      if (!noAnimation) {
        animation = this.movePilesAnimated(
          piles,
          piles.map(pile => this.getLayoutPosition(pile, true))
        );
      } else {
        animation = Promise.reject(Error('No animation'));
      }

      animation
        .catch(() => {
          piles.forEach((pile) => {
            const pos = this.getLayoutPosition(pile);
            pile.moveTo(pos.x, pos.y);
          });
        })
        .finally(() => {
          resolve();
        });
    });
  }

  /**
   * Update the matrix frame encoding of all matrices.
   *
   * @param {string} encoding - Matrix measure.
   */
  updateMatrixFrameEncoding (encoding, update) {
    if (fgmState.matrixFrameEncoding === encoding) {
      return;
    }

    fgmState.matrixFrameEncoding = encoding;

    if (this.isInitialized) {
      update.pileFrames = true;
    }
  }

  /**
   * Update the orientation of all matrices.
   *
   * @param {number} orientation - Matrix orientation number.
   */
  updateMatrixOrientation (orientation, update) {
    if (fgmState.matrixOrientation === orientation) {
      return;
    }

    fgmState.matrixOrientation = orientation;

    if (this.isInitialized) {
      update.piles = true;
    }
  }

  /**
   * Update piles
   *
   * @param {object} pileConfigs - Config object
   * @param {boolean} forced - If `true` force update
   */
  updatePiles (pileConfigs, forced, update) {
    if (this.pileConfigs !== pileConfigs && (this.isInitialized || forced)) {
      this.pileConfigs = pileConfigs;

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

            pile.setMatrices(pileConfig.matrixIds.map(
              matrixId => fgmState.matrices[matrixId]
            ));

            if (fgmState.trashIsActive) {
              if (pile.isTrashed && !pile.render) {
                pile.draw();
              } else if (pile.render) {
                pile.hide();
              }

              if (!this.trashSize) {
                this.hideTrash();
              }
            } else if (pileConfig.id[0] === '_') {
              pile.trash();
            } else if (pile.isTrashed) {
              pile.recover();
            } else {
              pile.draw();
            }
          } else if (pile) {
            pile.destroy();
          }
        });

      // this.calculateDistanceMatrix();
      this.assessMeasuresMax();

      update.layout = true;
      update.scrollLimit = true;
    }
  }

  /**
   * Handle updating the grid if necessary
   *
   * @param {object} columns - Decompose column information.
   */
  updatePlotSize (columns, update) {
    if (this.decomposeColums === columns) {
      return;
    }

    this.decomposeColums = columns;

    if (this.isInitialized) {
      update.grid = true;
      update.webgl = true;
    }
  }

  /**
   * Update piles when special cells are shown or hidden
   *
   * @param {boolean} showSpecialCells - If `true` show special cells.
   */
  updateShowSpecialCells (showSpecialCells, update) {
    if (fgmState.showSpecialCells === showSpecialCells) {
      return;
    }

    fgmState.showSpecialCells = showSpecialCells;

    if (this.isInitialized) {
      update.piles = true;
    }
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
  }
}
