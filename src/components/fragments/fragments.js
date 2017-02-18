// Aurelia
import { inject, LogManager } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import {
  DoubleSide,
  FontLoader,
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
import MpState from 'components/fragments/fragments-state';

// Utils etc.
import {
  addPiles,
  setAnimation,
  setArrangeMetrics,
  setCellSize,
  setCoverDispMode,
  setShowSpecialCells
} from 'components/fragments/fragments-actions';

import {
  ARRANGE_METRICS,
  CELL_SIZE,
  CLICK_DELAY_TIME,
  COLOR_PRIMARY,
  DBL_CLICK_DELAY_TIME,
  DURATION,
  FONT_URL,
  FPS,
  HIGHLIGHT_FRAME_LINE_WIDTH,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP,
  MATRIX_GAP_HORIZONTAL,
  MATRIX_GAP_VERTICAL,
  METRIC_DIST_DIAG,
  METRIC_NOISE,
  METRIC_SHARPNESS,
  METRIC_SIZE,
  MODE_MEAN,
  MODE_TREND,
  MODE_VARIANCE,
  MODE_DIFFERENCE,
  PILING_DIRECTION,
  PREVIEW_SIZE,
  WEB_GL_CONFIG,
  Z_BASE,
  Z_DRAG,
  Z_HIGHLIGHT,
  Z_LASSO
} from 'components/fragments/fragments-defaults';

import Pile from 'components/fragments/pile';

import Matrix from 'components/fragments/matrix';

import {
  calculateClusterPiling,
  calculateDistances,
  createRectFrame
} from 'components/fragments/fragments-utils';

import { EVENT_BASE_NAME } from 'components/multi-select/multi-select-defaults';


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


@inject(EventAggregator, States, MpState)
export class Fragments {
  constructor (eventAggregator, states, mpState) {
    this.event = eventAggregator;

    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.fragments = {};

    this.fgmState = mpState;

    this.fgmState.cellSize = CELL_SIZE;
    this.maxDistance = 0;
    this.pilingMethod = 'clustered';
    this.matrixStrings = '';
    this.piles = []; // contains all piles. Each pile contains matrices, not indices
    this.matrixPos = []; // index of pile in layout array
    this.matrices = []; // contains all matrices
    this.matricesPileIndex = []; // contains pile index for each matrix.
    this.selectedMatrices = [];
    this.dragActive = false;
    this.openedPileRoot = undefined;
    this.openedPileMatrices = [];
    this.shiftDown = false;
    this.rightClick = false;
    this.allPileOrdering = [];
     // Array containing the orderings for all piles, when not all nodes are
     // focused on.
    this.focusNodeAllPileOrdering = [];

    this.nodes = [];
    this.focusNodes = [];  // currently visible nodes (changed by the user)

    this._isLoadedSession = false;
    this._isSavedSession = false;
    this.fragScale = 1;

    this.pileIDCount = 0;
    this.startPile = 0;
    this.maxValue = 0;
    this.fragDims = 0;  // Fragment dimensions

    // If the user changes the focus nodes, matrix similarity must be recalculated
    // before automatic piling. Distance calculation is performed on the server.
    this.dMat = [];
    this.pdMat = [];  // contains similarity between piles
    this.pdMax = 0;

    this.pilingAnimations = [];

    this.mouseIsDown = false;
    this.lassoRectIsActive = false;
    this.mouseWentDown = false;
    this.fgmState.showSpecialCells = false;

    this.isLoading = true;

    this.mouseClickCounter = 0;

    this.coverDispModes = [{
      id: MODE_MEAN,
      name: 'Mean'
    }, {
      id: MODE_TREND,
      name: 'Trend'
    }, {
      id: MODE_VARIANCE,
      name: 'Variance'
    }, {
      id: MODE_DIFFERENCE,
      name: 'Difference'
    }];

    this.arrangeSelectedEventId = 'fgm.arrange';
    this.metrics = [{
      id: METRIC_SIZE,
      name: 'Size'
    }, {
      id: METRIC_DIST_DIAG,
      name: 'Distance'
    }, {
      id: METRIC_NOISE,
      name: 'Noise'
    }, {
      id: METRIC_SHARPNESS,
      name: 'Sharpness'
    }];

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

    this.isDataLoaded = new Promise((resolve, reject) => {
      this.resolve.isDataLoaded = resolve;
      this.reject.isDataLoaded = reject;
    });

    this.isFontLoaded = new Promise((resolve, reject) => {
      this.resolve.isFontLoaded = resolve;
      this.reject.isFontLoaded = reject;
    });

    this.update();

    Promise
      .all([this.isDataLoaded, this.isFontLoaded, this.isAttached])
      .then(() => { this.initPlot(this.data); })
      .catch((error) => {
        logger.error('Failed to initialize the fragment plot', error);
      });

    this.event.subscribe(
      `${EVENT_BASE_NAME}.${this.arrangeSelectedEventId}`,
      this.arrangeChangeHandler.bind(this)
    );
  }

  attached () {
    this.loadFont();

    this.getPlotElDim();

    this.initShader();
    this.initWebGl();
    this.initEventListeners();

    this.plotEl.appendChild(this.canvas);

    this.resolve.isAttached(true);
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  get cellSize () {
    return this.fgmState.cellSize;
  }

  get plotElDim () {
    return this._plotElDim;
  }

  get rowSpacingExtra () {
    const spacing = (this.plotElDim.width - (
      this.numColumns * this.matrixWidth
      ) - ((this.numColumns - 1) * MATRIX_GAP_HORIZONTAL)) / (this.numColumns - 1);
    return spacing;
  }

  get numColumns () {
    return Math.floor(
      (this.plotElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
      (this.matrixWidth + MATRIX_GAP_HORIZONTAL)
    );
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

  get matrixHeightInclSpacing () {
    return this.matrixWidth + MATRIX_GAP_VERTICAL;
  }

  get matrixWidth () {
    return this.fragDims * this.fgmState.cellSize;
  }

  get matrixWidthInclSpacing () {
    return this.matrixWidth + this.rowSpacingExtra + MATRIX_GAP_HORIZONTAL;
  }

  get matrixWidthHalf () {
    return this.matrixWidth / 2;
  }

  get rawMatrices () {
    return this.fgmState.matrices.map(matrix => matrix.matrix);
  }


  /* ---------------------------- Custom Methods ---------------------------- */

  /**
   * Arranges piles according to the given metrics.
   *
   * @description
   * This is the entry point for arranging
   *
   * @param {array} piles - All piles.
   * @param {array} metrics - Selected metrics.
   * @return {[type]}             [description]
   */
  arrange (piles, metrics) {
    if (metrics.length === 1) {
      this.rank(piles, metrics[0]);
    }

    // if (metrics.length === 2) {
    // }

    // if (metrics.length > 2) {
    // }
  }

  /**
   * Handles changes of animation
   *
   * @param {boolean} animation - If `true` vbisual changes will be animated.
   */
  animationChangeHandler () {
    this.store.dispatch(setAnimation(!this.fgmState.animation));
  }

  /**
   * Handles changes of arrange metrics amd dispatches the appropriate action.
   *
   * @param {array} metrics - List of metrics to arrange piles.
   */
  arrangeChangeHandler (metrics) {
    let arrangeMetrics;

    try {
      arrangeMetrics = metrics.map(metric => metric.id);
    } catch (e) {
      arrangeMetrics = [];
    }

    this.store.dispatch(setArrangeMetrics(arrangeMetrics));
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
   * [calculatePiles description]
   *
   * @param {[type]} value - [description]
   * @return {[type]} [description]
   */
  calculatePiles (value) {
    this.isLoading = true;

    this.setPiling(calculateClusterPiling(value, this.fgmState.matrices, this.dMat));
  }

  /**
   * Handle click events
   *
   * @param {object} event - Event object
   */
  canvasClickHandler (event) {
    if (this.mouseIsDown) {
      return;
    }

    if (this.hoveredTool) {
      this.hoveredTool.trigger(this.hoveredTool.pile);
      this.render();
      this.hoveredTool = undefined;
    } else if (this.hoveredGapPile) {
      this.pileBackwards(this.fgmState.hoveredGapPile);
      this.fgmState.hoveredGapPile = undefined;
    } else if (this.hoveredMatrix) {
      this.splitPile(this.hoveredMatrix);
      this.hoveredMatrix = undefined;
    }

    if (this.fgmState.hoveredPile) {
      // Re-draw hovered pile to show menu.
      this.fgmState.hoveredPile.draw();
    }

    this.render();
  }

  /**
   * Handle double click events.
   *
   * @param {object} event - Event object.
   */
  canvasDblClickHandler (event) {
    // Disabled for now
    // if (
    //   this.fgmState.hoveredPile &&
    //   this.fgmState.hoveredPile !== this.openedPile
    // ) {
    //   this.openedPileRoot = this.fgmState.hoveredPile;
    // } else {
    //   this.openedPile = this.fgmState.hoveredPile;
    // }

    if (this.fgmState.hoveredPile) {
      this.depileMyAss = this.fgmState.hoveredPile;
      this.depile(this.fgmState.hoveredPile);
      this.fgmState.hoveredPile = undefined;
    }
  }

  /**
   * Mouse down handler
   *
   * @param {object} event - Event object
   */
  canvasMouseDownHandler (event) {
    this.mouseWentDown = true;
    this.mouseIsDown = true;
    this.dragStartPos = {
      x: this.mouse.x,
      y: this.mouse.y
    };

    this.mouseDownTime = Date.now();

    // // test if mouse dwells on a matrix -> open pile
    // if (
    //   this.fgmState.hoveredPile &&
    //   this.fgmState.hoveredPile.size > 1 &&
    //   typeof this.hoveredMatrix === 'undefined'
    // ) {
    //   this.mouseIsDownTimer = setInterval(() => {
    //     this.openedPileRoot = this.fgmState.hoveredPile;
    //     this.openedPileMatricesNum = this.fgmState.hoveredPile
    //       .pileMatrices.length - 1;
    //     this.depile(this.openedPileRoot);
    //     clearInterval(this.mouseIsDownTimer);
    //   }, 500);
    // }
  }

  /**
   * Handle mouse over pile
   *
   * @param {object} pileMesh - Pile mesh being moused over.
   */
  mouseOverPileHandler (pileMesh) {
    let x = pileMesh.position.x;
    let y = pileMesh.position.y;

    if (this.fgmState.hoveredPile !== pileMesh.pile) {
      this.closePileMenu();
    }

    this.fgmState.hoveredPile = pileMesh.pile;

    if (!this.lassoRectIsActive) {
      this.highlightPile(this.fgmState.hoveredPile);
    }

    // Preview single matrices of piles with multiple matrices
    if (this.fgmState.hoveredPile.pileMatrices.length > 1) {
      if (this.mouse.y > y + this.matrixWidthHalf) {
        let d = this.mouse.y - (y + this.matrixWidthHalf);
        let i = Math.floor(d / PREVIEW_SIZE);
        this.fgmState.hoveredPile.showSingle(
          this.fgmState.hoveredPile.getMatrix(i)
        );
        this.hoveredMatrix = this.fgmState.hoveredPile.getMatrix(i);
      } else {
        this.fgmState.hoveredPile.showSingle(undefined);
        this.resetHighlightedPile();
      }
    }

    // Check if we're hovering a gap
    if (this.relToAbsPositionX(this.mouse.x) > x + this.matrixWidthHalf) {
      this.fgmState.hoveredGapPile = this.fgmState.hoveredPile;
    } else if (this.hoveredGapPile) {
      this.hoveredGapPile.draw();
      this.fgmState.hoveredGapPile = undefined;
    }

    this.hoveredCell = undefined;

    if (event.shiftKey) {
      // test which cell is hovered.
      let col = Math.floor((this.mouse.x - (x - this.matrixWidthHalf)) / this.fgmState.cellSize);
      let row = Math.floor(-(this.mouse.y - (y + this.matrixWidthHalf)) / this.fgmState.cellSize);
      if (
        row >= 0 ||
        row < this.fgmState.focusNodes.length ||
        col >= 0 ||
        col < this.fgmState.focusNodes.length
      ) {
        this.fgmState.hoveredPile.updateLabels(true);
        this.hoveredCell = { row, col };
      }
    }

    for (let i = 0; i < this.fgmState.piles.length; i++) {
      this.fgmState.piles[i].updateHoveredCell();
      this.fgmState.piles[i].updateLabels(false);
    }

    this.fgmState.hoveredPile.updateLabels(true);

    this.previousHoveredPile = this.fgmState.hoveredPile;
  }

  /**
   * Handle pile mouse out events.
   */
  mouseOutPileHandler () {
    this.fgmState.hoveredPile = undefined;

    this.highlightPile();

    if (this.hoveredGapPile) {
      const pile = this.hoveredGapPile;
      this.fgmState.hoveredGapPile = undefined;
      pile.draw();
    }

    if (this.previousHoveredPile) {
      this.previousHoveredPile.showSingle(undefined);
      this.highlightFrame.visible = false;
      this.previousHoveredPile.coverMatrixMode = this.coverDispMode;
      this.previousHoveredPile.draw();
      this.previousHoveredPile = undefined;
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

    this.fgmState.scene.updateMatrixWorld();
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
      this.fgmState.hoveredPile &&
      this.fgmState.piles.indexOf(this.fgmState.hoveredPile) > 0 &&
      !this.lassoRectIsActive
    ) {
      this.dragPileStartHandler();
    } else {
      this.mouseMoveGeneralHandler();
    }

    // Remove menu is no pile is hovered
    if (!this.fgmState.hoveredPile) {
      this.closePileMenu();
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
   *
   * @param {object} event - Event object.
   */
  canvasMouseClickHandler (event) {
    this.mouseDownTimeDelta = Date.now() - this.mouseDownTime;

    if (Date.now() - this.mouseDownTime < CLICK_DELAY_TIME) {
      this.mouseClickCounter += 1;

      switch (this.mouseClickCounter) {
        case 2:
          clearTimeout(this.mouseClickTimeout);
          this.canvasDblClickHandler(event);
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
   * Handle mouse up events on the canvas.
   *
   * @param {object} event - Mouse up event.
   */
  canvasMouseUpHandler (event) {
    event.preventDefault();

    this.fgmState.scene.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
    this.fgmState.scene.remove(this.lassoObject);
    this.mouseIsDown = false;

    if (this.openedPileRoot) {
      this.closeOpenedPile(this.openedPileRoot);
    } else if (this.dragPile) {
      // place pile on top of previous pile
      if (!this.fgmState.hoveredPile) {
        // Move pile back to original position
        let pos = this.getLayoutPosition(this.dragPile);
        this.dragPile.moveTo(pos.x, pos.y);
        this.dragPile.elevateTo(Z_BASE);
      } else {
        // Pile up the two piles
        this.pileUp([this.dragPile], this.fgmState.hoveredPile);
      }

      this.dragPile = undefined;
    } else if (this.lassoRectIsActive) {
      this.getLassoRectSelection(
        this.dragStartPos.x, this.mouse.x, this.dragStartPos.y, this.mouse.y
      );
    } else {
      this.canvasMouseClickHandler(event);
    }

    this.dragStartPos = undefined;
    this.mouseWentDown = false;
    this.lassoRectIsActive = false;

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
    let openedPileIndex = this.fgmState.piles.indexOf(this.openedPileRoot);

    for (let i = 0; i <= this.openedPileMatricesNum; i++) {
      piles.push(this.fgmState.piles[openedPileIndex + i]);
    }

    this.pileUp(piles, this.fgmState.piles[openedPileIndex]);

    this.startAnimations();
    this.openedPileRoot = undefined;
    this.openedPileMatricesNum = 0;
  }

  /**
   * Close pile menu.
   */
  closePileMenu () {
    this.fgmState.visiblePileTools.forEach((visiblePileTool) => {
      this.fgmState.scene.remove(visiblePileTool);
    });
    this.fgmState.visiblePileTools = [];
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
    const matrices = [];

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

    this.fgmState.piles.forEach((pile) => {
      let x = pile.getPos().x;
      let y = pile.getPos().y;

      if (
        x + this.matrixWidthHalf >= x1 &&
        x < x2 &&
        y - this.matrixWidthHalf >= y1 &&
        y < y2
      ) {
        pilesSelected.push(pile);
        matrices.push(...pile.pileMatrices);
      }
    });

    if (matrices.length > 1) {
      this.pileUp(pilesSelected.slice(1), pilesSelected[0]);
    }
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
   * @param {object} pile - Pile to be depiled.
   */
  depile (pile) {
    if (pile.pileMatrices.length <= 1) {
      return;
    }

    let newPiles = [];
    let matrices = [];

    matrices.push(...pile.pileMatrices);

    // Remove all except the first matrix
    matrices.slice(1).forEach((matrix) => {
      const pileNew = new Pile(
        matrix.id,
        this.scene,
        this.fragScale,
        this.fragDims
      );

      pileNew.colored = pile.colored;
      this.fgmState.piles.push(pileNew);

      pileNew.addMatrices([matrix]);
      pileNew.draw();
      newPiles.push(pileNew);
    });

    pile.removeMatrices(matrices.slice(1));

    pile.draw();
    this.updateLayout();

    // Need refactoring
    // if (animated) {
    //   pilingAnimations.push(
    //     new DepileAnimation(
    //       newPiles,
    //       {
    //         x: pile.x,
    //         y: pile.y
    //       }
    //     )
    //   );
    //   startAnimations();
    // }

    this.render();
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
   * [destroyPile description]
   *
   * @param {[type]} pile - [description]
   * @return {[type]} [description]
   */
  destroyPile (pile) {
    pile.destroy();

    this.fgmState.piles.splice(this.fgmState.piles.indexOf(pile), 1);

    if (this.previousHoveredPile === pile) {
      this.previousHoveredPile = undefined;
    }

    if (this.fgmState.hoveredGapPile === pile) {
      this.fgmState.hoveredGapPile = undefined;
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
    this.fgmState.hoveredPile = undefined;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Check if we intersect with a pile
    this.intersects = this.raycaster.intersectObjects(
      this.fgmState.pileMeshes.filter(
        pileMesh => pileMesh !== this.dragPile.mesh
      )
    );

    if (this.intersects.length) {
      this.fgmState.hoveredPile = this.intersects[0].object.pile;
    }

    this.dragPile.moveTo(
      this.relToAbsPositionX(this.mouse.x),
      this.relToAbsPositionY(this.mouse.y),
      true
    );
  }

  /**
   * Draw rectangular lasso.
   *
   * @param {number} startX - [description]
   * @param {number} currentX - [description]
   * @param {number} startY - [description]
   * @param {number} currentY - [description]
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
    this.fgmState.scene.remove(this.lassoObject);
    this.lassoObject = createRectFrame(width, height, COLOR_PRIMARY, 1);
    this.lassoObject.position.set(
      ...this.relToAbsPosition(x1 + ((x2 - x1) / 2), y1 + ((y2 - y1) / 2)), Z_LASSO
    );
    this.fgmState.scene.add(this.lassoObject);
  }

  /**
   * Drag start handler
   */
  dragPileStartHandler () {
    // Don't do raycasting. "Freeze" the current state of
    // highlighte items and move matrix with cursor.
    this.dragPile = this.fgmState.hoveredPile;
    this.dragPile.moveTo(
      this.relToAbsPositionX(this.mouse.x),
      this.relToAbsPositionY(this.mouse.y),
      true
    );
    this.dragPile.elevateTo(Z_DRAG);
  }

  /**
   * [focusOn description]
   *
   * @param {[type]} nodes - [description]
   * @return {[type]} [description]
   */
  focusOn (nodes) {
    this.fgmState.focusNodes = nodes;

    // update sizes
    this.matrixWidth = this.fgmState.cellSize * this.fgmState.focusNodes.length;
    this.matrixWidthHalf = this.matrixWidth / 2;

    this.fgmState.calculateDistanceMatrix();

    // update highlight frame
    this.fgmState.scene.remove(this.highlightFrame);
    this.highlightFrame = createRectFrame(
      this.matrixWidth, this.matrixWidth, 0x000000, HIGHLIGHT_FRAME_LINE_WIDTH
    );
    this.fgmState.scene.add(this.highlightFrame);

    // redraw
    this.fgmState.piles.forEach(pile => pile.updateFrame());
    this.redrawPiles(this.fgmState.piles);
    this.updateLayout(0, true);
    this.render();
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

    this.fgmState.piles.forEach(
      pile => piling.push(this.fgmState.matrices.indexOf(pile.getMatrix(0)))
    );

    return piling;
  }

  /**
   * Get position for a pile.
   *
   * @param {number} pileSortIndex - Pile sort index.
   * @return {object} Object with x and y coordinates
   */
  getLayoutPosition (pile) {
    const numArrMets = this.arrangeMetrics.length;

    // if (numArrMets === 2) {
    //   return this.getLayoutPosition2D(pile.ranking);
    // }

    // if (numArrMets > 2) {
    //   return this.getLayoutPosition2D(pile.ranking);
    // }

    return this.getLayoutPosition1D(pile.rank);
  }

  /**
   * Get position for a pile given the current sort order.
   *
   * @param {number} pileSortIndex - Pile sort index.
   * @return {object} Object with x and y coordinates
   */
  getLayoutPosition1D (pileSortIndex) {
    const numCol = this.numColumns;

    let x;
    let y;

    if (PILING_DIRECTION === 'horizontal') {
      x = (
        this.matrixWidthInclSpacing * (pileSortIndex % numCol)
      ) || MARGIN_LEFT;

      y = (
        Math.trunc(pileSortIndex / numCol) *
        (this.matrixWidth + MATRIX_GAP_VERTICAL)
      ) || MARGIN_TOP;

      return { x, y };
    }

    let col = Math.floor(pileSortIndex % this.numColumns);
    y = MARGIN_TOP;
    let currh = 0;
    let temp;

    for (let i = 0; i < this.fgmState.piles.length; i++) {
      if (i > 0 && i % this.numColumns === 0) {  // when new row starts
        if (i > pileSortIndex) {
          break;
        } else {
          y += currh + this.matrixWidth + MATRIX_GAP_VERTICAL;
          currh = 0;
        }
      }

      temp = this.fgmState.piles[i].size() * 2;  // 2 = preview height

      if (temp > currh) {
        currh = temp;
      }
    }

    return {
      x: MARGIN_LEFT + (
        col * (this.matrixWidth + MATRIX_GAP_HORIZONTAL)
      ) + this.matrixWidthHalf,
      y: y + currh
    };
  }

  /**
   * Get a pile or create a new instance
   *
   * @param {number} pileId - Pile ID.
   * @return {object} New or retrieved pile
   */
  getOrCreatePile (pileId) {
    if (!this.fgmState.pilesIdx[pileId]) {
      const pile = new Pile(
        pileId,
        this.fgmState.scene,
        this.fragScale,
        this.fragDims
      );

      this.fgmState.pilesIdx[pileId] = pile;
      this.fgmState.piles.push(pile);
    }

    return this.fgmState.pilesIdx[pileId];
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
    this._plotElDim = this.plotEl.getBoundingClientRect();

    return this.plotElDim;
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
    this.fgmState.matrices.forEach(matrix => matrix.g_course.style('opacity', '1'));
  }

  /**
   * Highlight a pile.
   *
   * @param {object} pile - Pile to be highlighted.
   */
  highlightPile (pile) {
    if (typeof pile !== 'undefined') {
      this.highlightFrame.position.set(pile.x, pile.y, Z_HIGHLIGHT);
      this.highlightFrame.visible = true;
      this.fgmState.scene.add(this.highlightFrame);
    } else {
      this.fgmState.scene.remove(this.highlightFrame);
    }
  }

  /**
   * [initEventListeners description]
   *
   * @return {[type]} [description]
   */
  initEventListeners () {
    this.canvas.addEventListener(
      'click', event => event.preventDefault()
    );
    this.canvas.addEventListener(
      'dblclick', event => event.preventDefault()
    );
    this.canvas.addEventListener(
      'mousedown', this.canvasMouseDownHandler.bind(this)
    );
    this.canvas.addEventListener(
      'mousemove', this.canvasMouseMoveHandler.bind(this)
    );
    this.canvas.addEventListener(
      'mouseup', this.canvasMouseUpHandler.bind(this)
    );
    this.canvas.addEventListener(
      'mousewheel', this.canvasMouseWheelHandler.bind(this), false
    );
  }

  /**
   * Init matrix instances
   *
   * @param {array} fragments - Matrix fragments
   */
  initMatrices (fragments) {
    fragments.forEach((fragment, index) => {
      this.fgmState.matrices.push(new Matrix(
        index,
        fragment.matrix,
        {
          xStart: fragment.start1,
          xEnd: fragment.end1,
          yStart: fragment.start2,
          yEnd: fragment.end2
        }
      ));
    });
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
   * Initialize piles
   *
   * @param {array} matrices - List of matrices.
   * @param {object} pileConfig - Pile configuration object.
   */
  initPiles (matrices, pileConfig = {}) {
    if (this.checkPileConfig(matrices, pileConfig)) {
      this.updatePiles(pileConfig, true);
    } else {
      const pilesNew = {};

      matrices.map(matrix => matrix.id).forEach((matrixId) => {
        pilesNew[matrixId] = [matrixId];
      });

      this.store.dispatch(addPiles(pilesNew));
    }
  }

  /**
   * Initialize the fragment plot.
   *
   * @param {object} data - Data object with the fragments.
   */
  initPlot (data) {
    this.fragDims = data.dims;

    this.highlightFrame = createRectFrame(
      this.matrixWidth,
      this.matrixWidth,
      COLOR_PRIMARY,
      HIGHLIGHT_FRAME_LINE_WIDTH
    );

    this.initMatrices(data.fragments);

    let piles;

    try {
      piles = this.store.getState().present.decompose.fragments.piles;
    } catch (e) {
      logger.debug('State not ready yet.');
    }

    this.initPiles(this.fgmState.matrices, piles);

    this.isInitialized = true;
  }

  /**
   * [initShader description]
   *
   * @return {[type]} [description]
   */
  initShader () {
    try {
      this.fgmState.shaderMaterial = new ShaderMaterial({
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

    this.fgmState.scene.add(this.camera);
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
   * Load fragments.
   *
   * @param {object} config - Config.
   * @return {object} A promise resolving to `true` if the data is successfully
   *   loaded.
   */
  loadData (config) {
    const loadData = new Promise((resolve, reject) => {
      let dataUrl;

      const queryString = this.prepareQueryString(config.queries);

      try {
        dataUrl = `${config.endpoint}${queryString}`;
      } catch (e) {
        this.hasErrored('Config is broken');
        reject(Error(this.errorMsg));
      }

      json(dataUrl, (error, results) => {
        if (error) {
          this.hasErrored('Could not load data');
          reject(Error(this.errorMsg));
        } else {
          this.isLoading = false;
          this.data = results;  // Just for convenience
          resolve(results);
        }
      });
    });

    loadData
      .then(results => this.resolve.isDataLoaded(results))
      .catch(error => this.reject.isDataLoaded(error));
  }

  loadFont () {
    const fontLoader = new FontLoader();

    fontLoader.load(FONT_URL, (font) => {
      this.fgmState.font = font;
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

    // test for menu-mouse over
    if (this.fgmState.visiblePileTools.length > 0) {
      let intersects = this.raycaster
        .intersectObjects(this.fgmState.visiblePileTools);
      if (intersects.length > 0) {
        this.hoveredTool = intersects[0].object.pileTool;

        if (this.hoveredTool.triggerEvent === 'hover') {
          this.hoveredTool.trigger(this.fgmState.hoveredPile);
        }
        return;
      }
    }

    // Check if we intersect with a pile
    this.intersects = this.raycaster.intersectObjects(this.fgmState.pileMeshes);

    if (this.intersects.length) {
      this.mouseOverPileHandler(this.intersects[0].object);
    } else if (this.previousHoveredPile) {
      this.mouseOutPileHandler();
    }

    // Draw rectangular lasso
    if (
      this.lassoRectIsActive ||
      (
        this.mouseWentDown && !this.fgmState.hoveredPile
      )
    ) {
      this.lassoRectIsActive = true;
      this.drawLassoRect(
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
    let pileIndex = this.fgmState.piles.indexOf(pile);
    let piles = [];

    if (pile.size === 1) {
      for (let j = pileIndex; j >= 0; j--) {
        if (j === 0 || this.fgmState.piles[j - 1].size() > 1) {
          this.pileUp(piles, this.fgmState.piles[j]);
          return;
        }

        piles.push(...this.fgmState.piles[j]);
      }
    } else if (this.fgmState.piles.indexOf(pile) > 0) {
      this.pileUp(
        pile,
        this.fgmState.piles[this.fgmState.piles.indexOf(pile) - 1]
      );
    }

    this.startAnimations();
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

    // Duration in seconds
    const durationSec = DURATION * 0.001;

    // Convert to seconds
    let timeLeft = durationSec;

    if (this.fgmState.animation && !noAnimation) {
      animation = new Promise((resolve, reject) => {
        let firstTime = true;

        targetPile.elevateTo(1);

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

          piles.forEach((pile) => {
            if (firstTime) {
              diff[pile.id] = {
                x: (targetPile.x - pile.x),
                y: (targetPile.y - pile.y)
              };
            }

            pile.moveTo(
              targetPile.x - (diff[pile.id].x * fraction),
              targetPile.y - (diff[pile.id].y * fraction),
              true
            );
          });

          this.render();

          firstTime = false;

          if (timeLeft > 0) {
            window.requestAnimationFrame(animate);
          } else {
            targetPile.elevateTo(0);
            resolve();
          }
        };

        window.requestAnimationFrame(animate);
      });
    } else {
      animation = Promise.resolve();
    }

    animation.finally(() => {
      const matrices = this.getPilesMatrices(piles);

      matrices.forEach((matrix) => {
        let sourcePile = matrix.pile;

        if (sourcePile !== targetPile) {
          this.destroyPile(sourcePile);
        }
      });

      targetPile.addMatrices(matrices);
      this.sortByOriginalOrder(targetPile);

      this.redrawPiles(this.fgmState.piles);

      this.updateLayout();
      this.render();
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
   * Rank matrices according to the metric
   *
   * @param {array} piles - Piles to be ranked.
   * @param {string} metric - Matric ID
   * @param {boolean} desc - If `true` rank descending by metric.
   */
  rank (piles, metric, desc) {
    if (metric) {
      // First we calculate the actual value
      piles.forEach((pile) => {
        pile.calculateMetrics([metric]);
      });
    }

    // Next, we create a new simplified array that will actually be sorted.
    // Note: we won't sort the original pile array but instead only assign a
    // rank.
    const pilesSortHelper = piles.map(pile => ({
      id: pile.id,
      value: metric ? pile.metrics[metric] : pile.id
    }));

    const sortOrder = desc ? -1 : 1;

    // Then we sort
    pilesSortHelper.sort(sortByValue(sortOrder));

    // Finally, assign rank
    pilesSortHelper.forEach((pileSortHelper, index) => {
      this.fgmState.pilesIdx[pileSortHelper.id].rank = index;
    });
  }

  /**
   * Redraw piles.
   *
   * @param {array} piles - List of piles to be redrawn.
   */
  redrawPiles (piles) {
    piles.forEach(pile => pile.draw());
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
    this.renderer.render(this.fgmState.scene, this.camera);
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
        this.fgmState.piles.length,
        this.fgmState.scene,
        this.fragScale,
        this.fragDims
      );

      pileNew.colored = pileSrc.colored;
      this.fgmState.piles.splice(this.fgmState.piles.indexOf(pileSrc) + 1, 0, pileNew);

      let m = [];
      for (let i = pileSrc.getMatrixPosition(matrix); i < pileSrc.size(); i++) {
        // Needs refactoring
        m.push(pileSrc.getMatrix(i));
      }

      this.pileUp(m, pileNew);
      this.updateLayout(this.fgmState.piles.indexOf(pileNew) - 1, true);

      pileNew.draw();
      pileSrc.draw();

      this.render();
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
        this.updateLayout();
        this.pilingAnimations = [];
      }

      this.render();
    }, 500 / FPS);
  }

  /**
   * [setPiling description]
   *
   * @param {[type]} newPiling - [description]
   */
  setPiling (newPiling) {
    this.fgmState.piles.forEach(pile => this.destroyPile(pile));

    this.fgmState.piles = [];

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
        this.fgmState.piles.length,
        this.fgmState.scene,
        this.fragScale,
        this.fragDims
      );

      this.fgmState.piles.push(newPile);
      newPile.addMatrices(matrices);

      this.sortByOriginalOrder(newPile);
      newPile.setCoverMatrixMode(this.coverDispMode);
      newPile.draw();

      l = newPiling[i];
    }

    this.isLoading = true;

    this.updateLayout(0, false);
    this.render();
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
  setScrollLimit (numFragments) {
    const contentHeight = this.matrixHeightInclSpacing *
      Math.ceil(numFragments / this.numColumns);

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
    let pileIndex = this.fgmState.piles.indexOf(pile);

    this.fgmState.piles.forEach((otherPile, index) => {
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
    this.store.dispatch(setShowSpecialCells(!this.fgmState.showSpecialCells));

    return true;
  }

  /**
   * [unshowMatrixSimilarity description]
   *
   * @return {[type]} [description]
   */
  unshowMatrixSimilarity () {
    this.fgmState.piles.forEach(pile => pile.resetSimilarity());
  }

  /**
   * Root state update handler
   */
  update () {
    try {
      const state = this.store.getState().present.decompose.fragments;

      console.log(state);

      this.updateAnimation(state.animation);
      this.updateArrangeMetrics(state.arrangeMetrics);
      this.updateCoverDispMode(state.coverDispMode);
      this.updateCellSize(state.cellSize);
      this.updateConfig(state.config);
      this.updatePiles(state.piles);
      this.updateShowSpecialCells(state.showSpecialCells);
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  /**
   * Update animation state.
   *
   * @param {boolean} animation - If `true` visual changes will be animated.
   */
  updateAnimation (animation) {
    this.fgmState.animation = animation;
  }

  /**
   * Update the arrange metrics.
   *
   * @param {array} arrangeMetrics - Array of metric IDs.
   */
  updateArrangeMetrics (arrangeMetrics) {
    this.arrangeMetrics = arrangeMetrics || ARRANGE_METRICS;

    this.arrangeMetrics.forEach((arrangeMetric) => {
      this.metrics
        .filter(metric => metric.id === arrangeMetric)
        .forEach((metric) => { metric.isSelected = true; });
    });

    if (this.isInitialized) {
      this.arrange(this.fgmState.piles, this.arrangeMetrics);
      this.updateLayout();
      this.render();
    }
  }

  /**
   * Update the display mode of all piles.
   *
   * @param {number} coverDispMode - Display mode number.
   */
  updateCoverDispMode (coverDispMode) {
    this.coverDispMode = coverDispMode;

    if (this.isInitialized) {
      this.setPileMode(this.coverDispMode, this.fgmState.piles);
      this.redrawPiles(this.fgmState.piles);
      this.render();
    }
  }

  /**
   * Update the cell size and rerender the piles
   *
   * @param {number} newSize - New cell size
   */
  updateCellSize (newSize) {
    this.fgmState.cellSize = newSize;

    if (this.isInitialized) {
      this.fgmState.piles.forEach(pile => pile.updateFrame());

      // Update highlighting frame
      this.fgmState.scene.remove(this.highlightFrame);
      this.highlightFrame = createRectFrame(
        this.matrixWidth,
        this.matrixWidth,
        COLOR_PRIMARY,
        HIGHLIGHT_FRAME_LINE_WIDTH
      );
      this.fgmState.scene.add(this.highlightFrame);

      this.updateLayout(0, true);
      this.redrawPiles(this.fgmState.piles);
      this.setScrollLimit(this.data.fragments.length);
      this.render();
    }
  }

  /**
   * [updateConfig description]
   *
   * @param {[type]} newConfig - [description]
   * @return {[type]} [description]
   */
  updateConfig (newConfig) {
    if (this.fragments.config !== newConfig) {
      this.fragments.config = newConfig;
      this.loadData(this.fragments.config);
    }
  }

  /**
   * Update every pile
   *
   * @param {number} pileRank - Rank of pile.
   */
  updateLayout (pileRank = 0) {
    if (this.arrangeMetrics.length === 1) {
      this.rank(this.fgmState.piles, this.arrangeMetrics[0]);
    }

    if (this.arrangeMetrics.length === 0) {
      this.rank(this.fgmState.piles);
    }

    this.fgmState.piles
      // Needs to be changed or disabled for 2D
      .filter(pile => pile.rank >= pileRank)
      .forEach((pile, index) => {
        const pos = this.getLayoutPosition(pile);
        pile.moveTo(pos.x, pos.y);
      });
  }

  /**
   * Update piles
   *
   * @param {object} pileConfig - Config object
   * @param {boolean} forced - If `true` force update
   */
  updatePiles (pileConfig, forced) {
    if (this.pileConfig !== pileConfig && (this.isInitialized || forced)) {
      this.pileConfig = pileConfig;

      Object.keys(pileConfig).forEach((pileId) => {
        console.log('ass', pileId);
        const pile = this.getOrCreatePile(pileId);
        const matrixIds = pileConfig[pileId];
        const matrices = matrixIds.map(
          matrixIndex => this.fgmState.matrices[matrixIndex]
        );

        pile.setMatrices(matrices).draw();
      });

      console.log(this.fgmState.pilesIdx);

      this.calculateDistanceMatrix();
      this.arrange(this.fgmState.piles, this.arrangeMetrics);
      this.updateLayout();
      this.setScrollLimit(this.fgmState.piles.length);
      this.render();
    }
  }

  /**
   * Update piles when special cells are shown or hidden
   *
   * @param {boolean} showSpecialCells - If `true` show special cells.
   */
  updateShowSpecialCells (showSpecialCells) {
    this.fgmState.showSpecialCells = showSpecialCells;

    if (this.isInitialized) {
      this.redrawPiles(this.fgmState.piles);
      this.render();
    }
  }
}
