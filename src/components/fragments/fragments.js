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
  setArrangeMetrics, setCellSize, setCoverDispMode, setShowSpecialCells
} from 'components/fragments/fragments-actions';

import {
  SplitAnimation
} from 'components/fragments/fragments-animations';

import {
  ARRANGE_METRICS,
  CELL_SIZE,
  FONT_URL,
  FPS,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP,
  MATRIX_GAP_HORIZONTAL,
  MATRIX_GAP_VERTICAL,
  METRIC_DIST_DIAG,
  METRIC_NOISE,
  METRIC_SHARPNESS,
  METRIC_SIZE,
  MODE_DIRECT_DIFFERENCE,
  PILING_DIRECTION,
  PREVIEW_SIZE,
  WEB_GL_CONFIG
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
    this.hoveredGapPile = undefined;
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
    this.visiblePileTools = [];

    this.pilingAnimations = [];

    this.mouseDown = false;
    this.lassoActive = false;
    this.mouseWentDown = false;
    this.fgmState.showSpecialCells = false;

    this.isLoading = true;

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
    return this.data.fragments.map(fragment => fragment.matrix);
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
    } catch (e) {
      logger.error('Display mode could not be set.');
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
   * [canvasClickHandler description]
   *
   * @param {[type]} event - [description]
   * @return {[type]} [description]
   */
  canvasClickHandler (event) {
    if (this.mouseDown) {
      return;
    }

    let pile;

    if (this.hoveredTool) {
      this.hoveredTool.trigger(this.hoveredTool.pile);
      this.render();
      this.hoveredTool = undefined;
    } else if (this.hoveredGapPile) {
      pile = this.hoveredGapPile;
      this.hoveredGapPile = undefined;
      this.pileBackwards(pile);
    } else if (this.hoveredMatrix) {
      pile = this.hoveredMatrix;
      this.hoveredMatrix = undefined;
      this.splitPile(this.hoveredMatrix);
    }
  }

  /**
   * [canvasDblClickHandler description]
   *
   * @param {[type]} event - [description]
   * @return {[type]} [description]
   */
  canvasDblClickHandler (event) {
    event.preventDefault();

    if (this.hoveredPile && this.hoveredPile !== this.openedPile) {
      this.openedPileRoot = this.hoveredPile;
    } else {
      this.openedPile = this.hoveredPile;
    }

    const pile = this.hoveredPile;

    this.hoveredPile = undefined;
    this.depile(pile);
  }

  /**
   * [canvasMouseDownHandler description]
   *
   * @param {[type]} event - [description]
   * @return {[type]} [description]
   */
  canvasMouseDownHandler (event) {
    this.mouseWentDown = true;
    this.mouseDown = true;
    this.dragStartPos = {
      x: this.mouse.x,
      y: this.mouse.y
    };

    // test if mouse dwells on a matrix -> open pile
    if (
      this.hoveredPile &&
      this.hoveredPile.size > 1 &&
      typeof this.hoveredMatrix === 'undefined'
    ) {
      this.mouseDownTimer = setInterval(() => {
        this.openedPileRoot = this.hoveredPile;
        this.openedPileMatricesNum = this.hoveredPile.pileMatrices.length - 1;
        this.depile(this.openedPileRoot);
        clearInterval(this.mouseDownTimer);
      }, 500);
    }
  }

  dragPileHandler () {
    const dir = new Vector3();

    this.dragPile.moveTo(this.mouse.x, -this.mouse.y, false);
    this.dragPile.elevateTo(0.9);

    // test for hovered piles
    this.hoveredPile = undefined;

    // No mouse down (i.e. no dragging enabled)
    // do the raycasting to find hovered elements
    dir.set(0, 0, -1).transformDirection(this.camera.matrixWorld);

    this.raycaster.set(this.mouse, dir);

    let testPile = [
      this.fgmState.piles[this.fgmState.piles.indexOf(this.dragPile) - 1].mesh
    ];

    this.intersects = this.raycaster.intersectObjects(testPile);

    if (this.intersects.length > 0) {
      this.hoveredPile = this.intersects[0].object.pile;
    }
  }

  dragPileStartHandler () {
    // Don't do raycasting. "Freeze" the current state of
    // highlighte items and move matrix with cursor.
    this.dragPile = this.hoveredPile;
    this.dragPile.moveTo(this.mouse.x, -this.mouse.y, false);
    this.dragPile.elevateTo(0.9);
  }

  mouseMoveStuffHandler () {
    const dir = new Vector3();

    this.hoveredPile = undefined;

    // No mouse down (i.e. no dragging enabled)
    // do the raycasting to find hovered elements
    dir.set(0, 0, -1).transformDirection(this.camera.matrixWorld);

    this.raycaster.set(this.mouse, dir);

    // test for menu-mouse over
    if (this.visiblePileTools.length > 0) {
      let intersects = this.raycaster.intersectObjects(this.visiblePileTools);
      if (intersects.length > 0) {
        this.hoveredTool = intersects[0].object.pileTool;
        return;
      }
    }

    // test for pile mouse over
    this.intersects = this.raycaster.intersectObjects(this.fgmState.pileMeshes);
    if (this.intersects.length > 0) {
      let pileMesh = this.intersects[0].object;
      this.hoveredPile = pileMesh.pile;
      let x = pileMesh.position.x;
      let y = pileMesh.position.y;

      // TEST FOR PREVIEWS
      if (this.mouse.y > y + this.matrixWidthHalf) {
        let d = this.mouse.y - (y + this.matrixWidthHalf);
        let i = Math.floor(d / PREVIEW_SIZE);
        this.hoveredPile.showSingle(this.hoveredPile.getMatrix(i));
        this.hoveredMatrix = this.hoveredPile.getMatrix(i);
      } else {
        this.hoveredPile.showSingle(undefined);
        this.highlightNoPile();
      }

      // TEST FOR GAPS
      if (this.mouse.x > x + this.matrixWidthHalf) {
        this.hoveredGapPile = this.hoveredPile;
      } else if (this.hoveredGapPile) {
        let p = this.hoveredGapPile;
        p.draw();
        this.hoveredGapPile = undefined;
      }

      this.hoveredPile.draw();

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
          this.hoveredPile.updateLabels(true);
          this.hoveredCell = { row, col };
        }
      }

      for (let i = 0; i < this.fgmState.piles.length; i++) {
        this.fgmState.piles[i].updateHoveredCell();
        this.fgmState.piles[i].updateLabels(false);
      }

      this.hoveredPile.updateLabels(true);

      if (
        (
          !this.previousHoveredPile ||
          this.previousHoveredPile !== this.hoveredPile
        ) &&
        this.coverDispMode === MODE_DIRECT_DIFFERENCE) {
        this.redrawPiles(this.fgmState.piles);
      }

      this.previousHoveredPile = this.hoveredPile;
    } else {
      // NOTHING HOVERED
      // _pileToolsVisible = false
      this.visiblePileTools = [];
      if (this.hoveredGapPile) {
        let p = this.hoveredGapPile;
        this.hoveredGapPile = undefined;
        p.draw();
      }

      if (this.previousHoveredPile) {
        this.previousHoveredPile.showSingle(undefined);
        this.highlightFrame.visible = false;
        this.previousHoveredPile.draw();
        this.previousHoveredPile = undefined;
      }

      if (this.coverDispMode === MODE_DIRECT_DIFFERENCE) {
        this.redrawPiles(this.fgmState.piles);
      }
    }

    // Set lassoActive if user did not start mousedown on a pile but in empty
    if (this.mouseWentDown) {
      this.lassoActive = !this.hoveredPile;
    }

    // draw lasso
    if (this.lassoActive) {
      let x1 = Math.min(this.dragStartPos.x, this.mouse.x);
      let x2 = Math.max(this.dragStartPos.x, this.mouse.x);
      let y1 = Math.min(this.dragStartPos.y, this.mouse.y);
      let y2 = Math.max(this.dragStartPos.y, this.mouse.y);

      this.fgmState.scene.remove(this.lassoObject);
      this.lassoObject = createRectFrame(x2 - x1, y2 - y1, 0xff0000, 1);
      this.lassoObject.position.set(
        x1 + ((x2 - x1) / 2),
        y1 + ((y2 - y1) / 2),
        1
      );

      this.fgmState.scene.add(this.lassoObject);
    }
  }

  /**
   * [canvasMouseMoveHandler description]
   *
   * @param {[type]} event - [description]
   * @return {[type]} [description]
   */
  canvasMouseMoveHandler (event) {
    event.preventDefault();

    this.hoveredTool = undefined;
    this.hoveredMatrix = undefined;

    // get mouse coordinates
    this.fgmState.scene.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    this.mouse.x = (
      ((event.clientX / this.plotElDim.width) * 2) - 1 - this.canvas.offsetLeft
    );

    this.mouse.y = (
      (-(event.clientY / this.plotElDim.width) * 2) + 1 + this.canvas.offsetTop
    );

    // this.mouse.set(
    //   ((event.clientX / this.plotElDim.width) * 2) - 1,
    //   (-(event.clientY / this.plotElDim.width) * 2) + 1,
    //   -1
    // );

    // this.mouse.unproject(this.camera);

    if (this.dragPile) {
      this.dragPileHandler();
    } else if (
      this.mouseDown &&
      this.hoveredPile &&
      this.fgmState.piles.indexOf(this.hoveredPile) > 0 &&
      !this.lassoActive
    ) {
      this.dragPileStartHandler();
    } else {
      this.mouseMoveStuffHandler();
    }

    this.mouseWentDown = false;
    this.render();
  }

  /**
   * [canvasMouseUpHandler description]
   *
   * @param {[type]} event - [description]
   * @return {[type]} [description]
   */
  canvasMouseUpHandler (event) {
    event.preventDefault();

    this.fgmState.scene.remove(this.lassoObject);

    if (this.openedPileRoot) {
      let mats = [];
      let openedPileIndex = this.fgmState.piles.indexOf(this.openedPileRoot);

      for (let i = 0; i <= this.openedPileMatricesNum; i++) {
        mats.push(this.fgmState.piles[openedPileIndex + i].pileMatrices[0]);
      }

      this.pileUp(mats, this.fgmState.piles[openedPileIndex]);

      this.startAnimations();
      this.openedPileRoot = undefined;
      this.openedPileMatricesNum = 0;
    } else if (this.dragPile) {
      // place pile on top of previous pile
      if (!this.hoveredPile) {
        let pos = this.getLayoutPosition(this.dragPile);
        this.dragPile.moveTo(pos.x, pos.y, false);
        this.dragPile.elevateTo(0);
      } else {
        this.pileUp(this.dragPile.pileMatrices, this.hoveredPile);
      }

      this.dragPile = undefined;
    } else if (this.lassoActive) {
      // Calculate lasso rectangle
      if (this.dragStartPos) {
        this.fgmState.scene.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
        let x;
        let y;
        let selectPiles = [];
        let p = -1;

        let x1 = Math.min(this.dragStartPos.x, this.mouse.x);
        let x2 = Math.max(this.dragStartPos.x, this.mouse.x);
        let y1 = Math.min(this.dragStartPos.y, this.mouse.y);
        let y2 = Math.max(this.dragStartPos.y, this.mouse.y);

        for (let i = 0; i < this.fgmState.piles.length; i++) {
          x = this.fgmState.piles[i].getPos().x;
          y = this.fgmState.piles[i].getPos().y;

          if (x > x1 && x < x2 && y > y1 && y < y2) {
            if (p === -1) {
              p = i;
            }

            selectPiles.push(this.fgmState.piles[i]);
          }
        }

        let matrices = [];

        for (let i = 0; i < selectPiles.length; i++) {
          matrices = matrices.concat(selectPiles[i].pileMatrices);
        }

        if (matrices.length > 0) {
          this.pileUp(matrices, this.fgmState.piles[p]);
          this.startAnimations();
        }
      }
    }

    this.dragStartPos = undefined;
    this.mouseDown = false;
    this.mouseWentDown = false;
    this.lassoActive = false;
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
   * [depile description]
   *
   * @param {[type]} pile - [description]
   * @return {[type]} [description]
   */
  depile (pile) {
    let newPiles = [];

    let matrices = [];
    let ix = this.fgmState.piles.indexOf(pile);

    matrices.push(...pile.pileMatrices);

    if (matrices.length === 1) {
      return;
    }

    for (let i = matrices.length - 1; i > 0; i--) {
      pile.removeMatrices([matrices[i]]);
      const pileNew = new Pile(
        this.pileIDCount,
        this.scene,
        this.fragScale,
        this.fragDims
      );

      this.pileIDCount += 1;

      pileNew.colored = pile.colored;
      this.fgmState.piles.splice(ix + 1, 0, pileNew);

      pileNew.addMatrices([matrices[i]]);
      pileNew.draw();
      newPiles.push(pileNew);
    }

    pile.draw();
    this.updateLayout(0, true);

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

    if (this.hoveredGapPile === pile) {
      this.hoveredGapPile = undefined;
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
      this.matrixWidth, this.matrixWidth, 0x000000, 10
    );
    this.fgmState.scene.add(this.highlightFrame);

    // redraw
    this.fgmState.piles.forEach(pile => pile.updateFrame());
    this.redrawPiles(this.fgmState.piles);
    this.updateLayout(0, true);
    this.render();
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
   * Get position for a pile.
   *
   * @param {number} pileSortIndex - Pile sort index.
   * @return {object} Object with x and y coordinates
   */
  getLayoutPosition (pile) {
    const numArrMets = this.arrangeMetrics.length;

    if (numArrMets === 1) {
      return this.getLayoutPosition1D(pile.rank);
    }

    // if (numArrMets === 2) {
    //   return this.getLayoutPosition2D(pile.ranking);
    // }

    // if (numArrMets > 2) {
    //   return this.getLayoutPosition2D(pile.ranking);
    // }

    return this.getLayoutPosition1D(pile.id);
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
   * [hidedistance description]
   *
   * @return {[type]} [description]
   */
  hidedistance () {
    this.fgmState.matrices.forEach(matrix => matrix.g_course.style('opacity', '1'));
  }

  /**
   * [highlightNoPile description]
   *
   * @return {[type]} [description]
   */
  highlightNoPile () {
    this.fgmState.scene.remove(this.highlightFrame);
  }

  /**
   * [highlightPile description]
   *
   * @param {[type]} pile - [description]
   * @return {[type]} [description]
   */
  highlightPile (pile) {
    this.highlightFrame.position.set(pile.x, pile.y, 0);
    this.highlightFrame.visible = true;
    this.fgmState.scene.add(this.highlightFrame);
  }

  /**
   * [initEventListeners description]
   *
   * @return {[type]} [description]
   */
  initEventListeners () {
    this.canvas.addEventListener(
      'click', this.canvasClickHandler.bind(this)
    );
    this.canvas.addEventListener(
      'dblclick', this.canvasDblClickHandler.bind(this)
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
   * Initialize the fragment plot.
   *
   * @param {object} data - Data object with the fragments.
   */
  initPlot (data) {
    this.fragDims = data.dims;

    this.highlightFrame = createRectFrame(
      this.matrixWidth, this.matrixWidth, 0xff8100, 10
    );

    // INIT PILES & MATRICES (each single matrix is a pile)
    data.fragments.forEach((fragment, index) => {
      const pile = new Pile(
        index,
        this.fgmState.scene,
        this.fragScale,
        this.fragDims
      );

      const locus = {
        xStart: fragment.start1,
        xEnd: fragment.end1,
        yStart: fragment.start2,
        yEnd: fragment.end2
      };

      const matrix = new Matrix(index, fragment.matrix, locus);

      this.fgmState.piles.push(pile);
      this.fgmState.matrices.push(matrix);

      pile.addMatrices([matrix]);
      pile.draw();
    });

    this.calculateDistanceMatrix();

    this.arrange(this.fgmState.piles, this.arrangeMetrics);

    this.updateLayout();

    this.setScrollLimit(data.fragments.length);

    this.render();

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
   * Orders piles by size
   *
   * @description
   * For loops, size is equivalent to _distance to the diagonal_.
   *
   * @return  {[type]}     [description]
   */
  orderBySize (piles) {

  }

  /**
   * Piles all matrices prior to the selected one, including the selected one.
   *
   * @param {[type]} p - [description]
   */
  pileBackwards (pile) {
    let pileIndex = this.fgmState.piles.indexOf(pile);
    let matrices = [];

    if (pile.size === 1) {
      for (let j = pileIndex; j >= 0; j--) {
        if (j === 0 || this.fgmState.piles[j - 1].size() > 1) {
          this.pileUp(matrices, this.fgmState.piles[j]);
          return;
        }

        matrices.push(...this.fgmState.piles[j].getMatrices());
      }
    } else if (this.fgmState.piles.indexOf(pile) > 0) {
      this.pileUp(
        pile.pileMatrices,
        this.fgmState.piles[this.fgmState.piles.indexOf(pile) - 1]
      );
    }

    this.startAnimations();
  }

  /**
   * Piles a set of matrices onto a target pile removes it from source pile, and
   * updates the layout.
   *
   * @param {array} matrices - [description]
   * @param {[type]} targetPile - [description]
   */
  pileUp (matrices, targetPile) {
    // Needs refactoring
    // this.pilingAnimations.push(new PilingAnimation(targetPile, matrices));

    let matricesToPile = matrices.slice(0);
    let m;
    let sourcePile;

    for (let i = 0; i < matricesToPile.length; i++) {
      m = matricesToPile[i];
      sourcePile = m.pile;
      sourcePile.removeMatrices([m]);
      if (sourcePile.size === 0 && sourcePile !== targetPile) {
        this.destroyPile(sourcePile);
      }
    }

    targetPile.addMatrices(matricesToPile);
    this.sortByOriginalOrder(targetPile);

    this.redrawPiles(this.fgmState.piles);
    this.updateLayout(0, true);
    this.render();
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
    // First we calculate the actual value
    piles.forEach((pile) => {
      pile.calculateMetrics([metric]);
    });

    // Next, we create a new simplified array that will actually be sorted.
    // Note: we won't sort the original pile array but instead only assign a
    // rank.
    const pilesSortHelper = piles.map(pile => ({
      id: pile.id,
      value: pile.metrics[metric]
    }));

    const sortOrder = desc ? -1 : 1;

    // Then we sort
    pilesSortHelper.sort(sortByValue(sortOrder));

    // Finally, assign rank
    pilesSortHelper.forEach((pileSortHelper, index) => {
      piles[pileSortHelper.id].rank = index;
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

    this.visiblePileTools.forEach((visiblePileTool) => {
      this.fgmState.scene.remove(visiblePileTool);
    });
  }

  /**
   * [setPileMode description]
   *
   * @param {[type]} mode  - [description]
   * @param {[type]} piles - [description]
   */
  setPileMode (mode, piles) {
    for (let i = 0; i < piles.length; i++) {
      piles[i].setCoverMatrixMode(mode);
    }
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
   * Helper method to show an error message
   *
   * @param {string} message - Error to be shown
   */
  hasErrored (message) {
    this.isErrored = true;
    this.errorMsg = message;
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
   * @param {[type]} matrix - [description]
   * @param {[type]} animated - [description]
   */
  splitPile (matrix, animated) {
    if (!animated) {
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
        m.push(pileSrc.getMatrix(i));
      }

      this.pileUp(m, pileNew);
      this.updateLayout(this.fgmState.piles.indexOf(pileNew) - 1, true);

      pileNew.draw();
      pileSrc.draw();

      this.render();
    } else {
      this.pilingAnimations.push(SplitAnimation(matrix));
      this.startAnimations();
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
    this.fgmState.showSpecialCells = !this.fgmState.showSpecialCells;

    this.store.dispatch(setShowSpecialCells(this.fgmState.showSpecialCells));

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

      this.updateArrangeMetrics(state.arrangeMetrics);
      this.updateCoverDispMode(state.coverDispMode);
      this.updateCellSize(state.cellSize);
      this.updateConfig(state.config);
      this.updateShowSpecialCells(state.showSpecialCells);
    } catch (e) {
      logger.error('State is invalid', e);
    }
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

      // this.fgmState.scene.remove(this.highlightFrame);
      // this.highlightFrame = createRectFrame(
      //   this.matrixWidth, this.matrixWidth, 0xff8100, 10
      // );
      // this.fgmState.scene.add(this.highlightFrame);

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
    this.fgmState.piles
      // Needs to be changed or disabled for 2D
      .filter(pile => pile.rank >= pileRank)
      .forEach((pile, index) => {
        const pos = this.getLayoutPosition(pile);
        pile.moveTo(pos.x, pos.y, PILING_DIRECTION !== 'vertical');
      });
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
