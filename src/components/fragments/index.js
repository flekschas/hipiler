// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import THREE from 'three';

// Injectables
import States from 'services/states';
import MpState from 'components/fragments/multipiles-state';

// Utils etc.
import {
  SplitAnimation
} from 'components/fragments/animations';

import {
  CELL_SIZE,
  FPS,
  MARGIN_TOP,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MATRIX_GAP_HORIZONTAL,
  MATRIX_GAP_VERTICAL,
  MODE_DIRECT_DIFFERENCE,
  PILING_DIRECTION,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES
} from 'components/fragments/defaults';

import Pile from 'components/fragments/pile';

import Matrix from 'components/fragments/matrix';

import {
  calculateClusterPiling,
  calculateDistance,
  createRectFrame
} from 'components/fragments/utils';

const logger = LogManager.getLogger('fragments');

@inject(States, MpState)
export default class Fragments {
  constructor (states, mpState) {
    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));
    this.update();

    this.fragments = {};

    this.mp = mpState;

    this.cellSize = CELL_SIZE;
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
    this.orderMenu = document.getElementById('allNodeOrder');
    this.coverMatrixMenu = document.getElementById('allCover');
    this.allPileOrdering = [];
     // Array containing the orderings for all piles, when not all nodes are
     // focused on.
    this.focusNodeAllPileOrdering = [];

    this.nodes = [];
    this.focusNodes = [];  // currently visible nodes (changed by the user)

    this._isLoadedSession = false;
    this._isSavedSession = false;
    this._zoomFac = 1;

    this.pileIDCount = 0;
    this.startPile = 0;
    this.maxValue = 0;

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
  }

  attached () {
    this.getBaseElDim();

    this.initWebGl();
    this.initEventListeners();
    this.initShader();

    this.plotEl.appendChild(this.canvas);
  }

  get baseElDim () {
    return this._baseElDim;
  }

  calculateDistanceMatrix () {
    const data = calculateDistance(this.graphMatrices, this.mp.focusNodes);

    this.dMat = data.distanceMatrix;
    this.pdMat = data.distanceMatrix;
    this.maxDistance = data.maxDistance;
    this.pdMax = this.maxDistance;
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
      if (sourcePile.size() === 0 && sourcePile !== targetPile) {
        this.destroyPile(sourcePile);
      }
    }

    targetPile.addMatrices(matricesToPile);
    this.sortTime(targetPile);

    this.redrawPiles(this.mp.piles);
    this.updateLayout(0, true);
    this.render();
  }

  /**
   * Piles all matrices prior to the selected one, including the selected one.
   *
   * @param {[type]} p - [description]
   */
  pileBackwards (pile) {
    let pileIndex = this.mp.piles.indexOf(pile);
    let matrices = [];

    if (pile.size() === 1) {
      for (let j = pileIndex; j >= 0; j--) {
        if (j === 0 || this.mp.piles[j - 1].size() > 1) {
          this.pileUp(matrices, this.mp.piles[j]);
          return;
        }

        matrices.push(...this.mp.piles[j].getMatrices());
      }
    } else if (this.mp.piles.indexOf(pile) > 0) {
      this.pileUp(
        pile.pileMatrices,
        this.mp.piles[this.mp.piles.indexOf(pile) - 1]
      );
    }

    this.startAnimations();
  }

  depile (pile) {
    let newPiles = [];

    let matrices = [];
    let ix = this.mp.piles.indexOf(pile);

    matrices.push(...pile.pileMatrices);

    if (matrices.length === 1) {
      return;
    }

    for (let i = matrices.length - 1; i > 0; i--) {
      pile.removeMatrices([matrices[i]]);
      const pileNew = Pile(
        this.pileIDCount,
        this.scene,
        this._zoomFac
      );

      this.pileIDCount += 1;

      pileNew.colored = pile.colored;
      this.mp.piles.splice(ix + 1, 0, pileNew);

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
   * Splits a pile at the position of the passed matrix. The passed matrix
   * becomes the base for the new pile.
   *
   * @param   {[type]}    matrix    [description]
   * @param   {[type]}    animated  [description]
   * @return  {[type]}              [description]
   */
  splitPile (matrix, animated) {
    if (!animated) {
      let pSource = matrix.pile;
      let pNew = new Pile(
        this.mp.piles.length,
        this.mp.scene,
        this._zoomFac
      );
      pNew.colored = pSource.colored;
      this.mp.piles.splice(this.mp.piles.indexOf(pSource) + 1, 0, pNew);

      let m = [];
      for (let i = pSource.getMatrixPosition(matrix); i < pSource.size(); i++) {
        m.push(pSource.getMatrix(i));
      }

      this.pileUp(m, pNew);
      this.updateLayout(this.mp.piles.indexOf(pNew) - 1, true);

      pNew.draw();
      pSource.draw();

      this.render();
    } else {
      this.pilingAnimations.push(SplitAnimation(matrix));
      this.startAnimations();
    }
  }

  removeFromPile (pile) {
    logger.warning('`removeFromPile()` not implemented yet.');
  }

  deselectAllMatrices () {
    this.selectedMatrices.forEach(
      matrix => matrix.frame.attr('class', 'matrixbackground')
    );

    this.selectedMatrices = [];
  }

  updateLayout (pileIndex) {
    this.mp.piles.forEach((pile, index) => {
      const pos = this.getLayoutPosition(index);
      pile.moveTo(pos.x, pos.y, PILING_DIRECTION !== 'vertical');
    });
  }

  /**
   * Index indicates the matrix index, not its position in the layout
   *
   * @param {number} matrixIndex - Index of matrix.
   * @return {??} Matrix position.
   */
  getMatrixPosition (matrixIndex) {
    return this.getLayoutPosition(this.matrixPos[matrixIndex]);
  }

  getLayoutPosition (index) {
    let x;
    let y;

    if (PILING_DIRECTION === 'horizontal') {
      x = MARGIN_LEFT;
      y = MARGIN_TOP;

      for (let i = 0; i < index; i++) {
        x += this._matrixWidth + (this.mp.piles[i].size() * 2) + MATRIX_GAP_HORIZONTAL + 10;
        if (
          (
            x + this._matrixWidth + (this.mp.piles[i].size() * 2) + MATRIX_GAP_HORIZONTAL
          ) > this._courseWidth
        ) {
          x = this._matrixWidth;
          y += this._matrixWidth + MATRIX_GAP_VERTICAL;
        }
      }
      return { x, y };
    }

    let col = Math.floor(index % this._cols);
    y = MARGIN_TOP;
    let currh = 0;
    let temp;

    for (let i = 0; i < this.mp.piles.length; i++) {
      if (i > 0 && i % this._cols === 0) {  // when new row starts
        if (i > index) {
          break;
        } else {
          y += currh + this._matrixWidth + MATRIX_GAP_VERTICAL;
          currh = 0;
        }
      }

      temp = this.mp.piles[i].size() * 2;  // 2 = preview height

      if (temp > currh) {
        currh = temp;
      }
    }

    return {
      x: MARGIN_LEFT + (col * (this._matrixWidth + MATRIX_GAP_HORIZONTAL)) + this._matrixWidthHalf,
      y: y + currh
    };
  }

  // Sorts matrices in pile according to time
  sortTime (pile) {
    pile.pileMatrices.sort(this.matrixTimeComparator);
  }

  matrixTimeComparator (a, b) {
    return parseInt(a.id, 10) - parseInt(b.id, 10);
  }

  hidedistance () {
    this.mp.matrices.forEach(matrix => matrix.g_course.style('opacity', '1'));
  }

  setPileMode (mode, piles) {
    for (let i = 0; i < piles.length; i++) {
      piles[i].setCoverMatrixMode(mode);
    }
  }

  setSimilarityPiling (value) {
    this.calculatePiles(value);
  }

  destroyPile (p) {
    p.destroy();
    let i = this.mp.piles.indexOf(p);
    this.mp.piles.splice(i, 1);
    if (this.previousHoveredPile === p) {
      this.previousHoveredPile = undefined;
    }
    if (this.hoveredGapPile === p) {
      this.hoveredGapPile = undefined;
    }
  }

  calculatePiles (value) {
    this.isLoading = true;

    this.setPiling(calculateClusterPiling(value, this.mp.matrices, this.dMat));
  }

  getCurrentPiling () {
    const piling = [];

    this.mp.piles.forEach(
      pile => piling.push(this.mp.matrices.indexOf(pile.getMatrix(0)))
    );

    return piling;
  }

  setPiling (newPiling) {
    this.mp.piles.forEach(pile => this.destroyPile(pile));

    this.mp.piles = [];

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

      const newPile = Pile(
        this.mp.piles.length, this.mp.scene, this._zoomFac
      );

      this.mp.piles.push(newPile);
      newPile.addMatrices(matrices);

      this.sortTime(newPile);
      newPile.setCoverMatrixMode(this.coverMatrixMenu.selectedIndex);
      newPile.draw();

      l = newPiling[i];
    }

    this.isLoading = true;

    this.updateLayout(0, false);
    this.render();
  }

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

  setNodeOrder (piles, order) {
    for (let i = 0; i < piles.length; i++) {
      piles[i].setNodeOrder(order);
    }
  }

  setPilingMethod (method) {
    this.pilingMethod = method;
  }

  // takes a seed pile and shows how similar
  // all the other piles/matrices are.
  // the similarity between two piles is the
  // mean of the distances between all matrices
  // from p1 to all matrices to p2 (bigraph)
  showMatrixSimilarity (pile) {
    let pileIndex = this.mp.piles.indexOf(pile);

    this.mp.piles.forEach((otherPile, index) => {
      otherPile.showSimilarity(
        this.pileDistanceColor(this.pdMat[pileIndex][index])
      );
    });
  }

  unshowMatrixSimilarity () {
    this.mp.piles.forEach(pile => pile.resetSimilarity());
  }

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
      this.hoveredPile.size() > 1 &&
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

  canvasMouseMoveHandler (event) {
    event.preventDefault();

    this.hoveredTool = undefined;
    this.hoveredMatrix = undefined;

    // get mouse coordinates
    this.mp.scene.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    this.mouse = new THREE.Vector3();
    let dir = new THREE.Vector3();

    this.mouse.set(
      ((event.clientX / this.baseElDim.width) * 2) - 1,
      (-(event.clientY / this.baseElDim.width) * 2) + 1,
      -1
    );

    this.mouse.unproject(this.camera);

    this.mouse.set(
      this.mouse.x - this.canvas.offsetLeft,
      this.mouse.y + this.canvas.offsetTop,
      1
    );

    if (this.dragPile) {
      this.dragPile.moveTo(this.mouse.x, -this.mouse.y, false);
      this.dragPile.elevateTo(0.9);

      // test for hovered piles
      this.hoveredPile = undefined;

      // No mouse down (i.e. no dragging enabled)
      // do the raycasting to find hovered elements
      dir.set(0, 0, -1).transformDirection(this.camera.matrixWorld);

      this.raycaster.set(this.mouse, dir);

      let testPile = [
        this.mp.piles[this.mp.piles.indexOf(this.dragPile) - 1].mesh
      ];

      this.intersects = this.raycaster.intersectObjects(testPile);

      if (this.intersects.length > 0) {
        this.hoveredPile = this.intersects[0].object.pile;
      }

    // Test for start a new drag pile
    } else if (
      this.mouseDown &&
      this.hoveredPile &&
      this.mp.piles.indexOf(this.hoveredPile) > 0 &&
      !this.lassoActive
    ) {
      // Don't do raycasting. "Freeze" the current state of
      // highlighte items and move matrix with cursor.
      // console.log('hoveredMatrix', hoveredPile.id)
      this.dragPile = this.hoveredPile;
      this.dragPile.moveTo(this.mouse.x, -this.mouse.y, false);
      this.dragPile.elevateTo(0.9);
    } else {
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
      this.intersects = this.raycaster.intersectObjects(this.pileMeshes);
      if (this.intersects.length > 0) {
        let pileMesh = this.intersects[0].object;
        this.hoveredPile = pileMesh.pile;
        let x = pileMesh.position.x;
        let y = pileMesh.position.y;

        // TEST FOR PREVIEWS
        if (this.mouse.y > y + this._matrixWidthHalf) {
          let d = this.mouse.y - (y + this._matrixWidthHalf);
          let i = Math.floor(d / PREVIEW_SIZE);
          this.hoveredPile.showSingle(this.hoveredPile.getMatrix(i));
          this.hoveredMatrix = this.hoveredPile.getMatrix(i);
        } else {
          this.hoveredPile.showSingle(undefined);
          this.highlightNoPile();
        }

        // TEST FOR GAPS
        if (this.mouse.x > x + this._matrixWidthHalf) {
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
          let col = Math.floor((this.mouse.x - (x - this._matrixWidthHalf)) / this.cellSize);
          let row = Math.floor(-(this.mouse.y - (y + this._matrixWidthHalf)) / this.cellSize);
          if (
            row >= 0 ||
            row < this.mp.focusNodes.length ||
            col >= 0 ||
            col < this.mp.focusNodes.length
          ) {
            this.hoveredPile.updateLabels(true);
            this.hoveredCell = { row, col };
          }
        }

        for (let i = 0; i < this.mp.piles.length; i++) {
          this.mp.piles[i].updateHoveredCell();
          this.mp.piles[i].updateLabels(false);
        }

        this.hoveredPile.updateLabels(true);

        if (
          (
            !this.previousHoveredPile ||
            this.previousHoveredPile !== this.hoveredPile
          ) &&
          this.coverMatrixMenu.selectedIndex === MODE_DIRECT_DIFFERENCE) {
          this.redrawPiles(this.mp.piles);
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

        if (this.coverMatrixMenu.selectedIndex === MODE_DIRECT_DIFFERENCE) {
          this.redrawPiles(this.mp.piles);
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

        this.mp.scene.remove(this.lassoObject);
        this.lassoObject = createRectFrame(x2 - x1, y2 - y1, 0xff0000, 1);
        this.lassoObject.position.set(
          x1 + ((x2 - x1) / 2),
          y1 + ((y2 - y1) / 2),
          1
        );

        this.mp.scene.add(this.lassoObject);
      }
    }

    this.mouseWentDown = false;
    this.render();
  }

  canvasMouseUpHandler (event) {
    event.preventDefault();

    this.mp.scene.remove(this.lassoObject);

    if (this.openedPileRoot) {
      let mats = [];
      let openedPileIndex = this.mp.piles.indexOf(this.openedPileRoot);

      for (let i = 0; i <= this.openedPileMatricesNum; i++) {
        mats.push(this.mp.piles[openedPileIndex + i].pileMatrices[0]);
      }

      this.pileUp(mats, this.mp.piles[openedPileIndex]);

      this.startAnimations();
      this.openedPileRoot = undefined;
      this.openedPileMatricesNum = 0;
    } else if (this.dragPile) {
      // place pile on top of previous pile
      if (!this.hoveredPile) {
        let pos = this.getLayoutPosition(this.piles.indexOf(this.dragPile));
        this.dragPile.moveTo(pos.x, pos.y, false);
        this.dragPile.elevateTo(0);
      } else {
        this.pileUp(this.dragPile.pileMatrices, this.hoveredPile);
      }

      this.dragPile = undefined;
    } else if (this.lassoActive) {
      // Calculate lasso rectangle
      if (this.dragStartPos) {
        this.mp.scene.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
        let x;
        let y;
        let selectPiles = [];
        let p = -1;

        let x1 = Math.min(this.dragStartPos.x, this.mouse.x);
        let x2 = Math.max(this.dragStartPos.x, this.mouse.x);
        let y1 = Math.min(this.dragStartPos.y, this.mouse.y);
        let y2 = Math.max(this.dragStartPos.y, this.mouse.y);

        for (let i = 0; i < this.mp.piles.length; i++) {
          x = this.mp.piles[i].getPos().x;
          y = this.mppiles[i].getPos().y;

          if (x > x1 && x < x2 && y > y1 && y < y2) {
            if (p === -1) {
              p = i;
            }

            selectPiles.push(this.mp.piles[i]);
          }
        }

        let matrices = [];

        for (let i = 0; i < selectPiles.length; i++) {
          matrices = matrices.concat(selectPiles[i].pileMatrices);
        }

        if (matrices.length > 0) {
          this.pileUp(matrices, this.mp.piles[p]);
          this.startAnimations();
        }
      }
    }

    this.dragStartPos = undefined;
    this.mouseDown = false;
    this.mouseWentDown = false;
    this.lassoActive = false;
  }

  canvasMouseWheelHandler (event) {
    event.preventDefault();

    if (event.wheelDelta > 0) {
      let y = Math.min(this.camera.position.y + 30, this.topScrollLimit);
      this.camera.position.setY(y);
    } else {
      this.camera.position.setY(this.camera.position.y - 30);
    }

    this.render();
  }

  focusOn (nodes) {
    this.mp.focusNodes = nodes;

    // update sizes
    this._matrixWidth = this.cellSize * this.mp.focusNodes.length;
    this._matrixWidthHalf = this._matrixWidth / 2;

    this._cols = Math.floor(
      (this.baseElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
      (this.baseElDim.width + MATRIX_GAP_HORIZONTAL)
    ) - 1;

    this.mp.calculateDistanceMatrix();

    // update highlight frame
    this.mp.scene.remove(this.highlightFrame);
    this.highlightFrame = createRectFrame(
      this._matrixWidth, this._matrixWidth, 0x000000, 10
    );
    this.mp.scene.add(this.highlightFrame);

    // redraw
    this.mp.piles.forEach(pile => pile.updateFrame());
    this.redrawPiles(this.mp.piles);
    this.updateLayout(0, true);
    this.render();
  }

  initPlot (data) {
    this.mp.nodes = data.nodes;

    this.mp.nodes.forEach((node, index) => {
      this.mp.focusNodes.push(index);
      node.name = node.name.trim();
    });

    data.fragments.forEach((fragment) => {
      this.mp.dataMatrices.push(fragment.matrix);
    });

    this.calculateDistanceMatrix();

    this.numPixels = data.dim;

    // INIT LAYOUT
    this._matrixWidth = this.numPixels * this.cellSize;
    this._matrixWidthHalf = this._matrixWidth / 2;

    this.highlightFrame = createRectFrame(
      this._matrixWidth, this._matrixWidth, 0xff8100, 10
    );

    this._cols = Math.floor(
      (this.baseElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
      (this.baseElDim.width + MATRIX_GAP_HORIZONTAL)
    ) - 1;

    // INIT PILES & MATRICES (each single matrix is a pile)
    data.fragments.forEach((fragment, index) => {
      const pile = Pile(
        index,
        this.mp.scene,
        this._zoomFac
      );

      const matrix = Matrix(index, fragment.matrix);

      this.mp.piles.push(pile);
      this.mp.matrices.push(matrix);

      pile.addMatrices([matrix]);
      pile.draw();
    });

    this.updateLayout(0, false);

    this.isLoading = false;

    this.render();
  }

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

  initWebGl () {
    this.camera = new THREE.OrthographicCamera(
      this.baseElDim.width / -2,
      this.baseElDim.width / 2,
      this.baseElDim.height / 2,
      this.baseElDim.height / -2,
      1,
      11
    );

    this.camera.position.z = 10;
    this.camera.position.x = (this.baseElDim.width / 2) - 50;
    let topScrollLimit = MARGIN_TOP - (this.baseElDim.height / 2);
    this.camera.position.y = topScrollLimit;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.baseElDim.width, this.baseElDim.height);
    this.renderer.setClearColor(0xffffff, 1);

    this.canvas = this.renderer.domElement;
    this.origin = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();

    this.mp.scene.add(this.camera);
  }

  initShader () {
    try {
      THREE.ShaderMaterial({
        attributes: SHADER_ATTRIBUTES,
        vertexShader: document.querySelector('#shader-vertex').textContent,
        fragmentShader: document.querySelector('#shader-fragment').textContent,
        blending: THREE.NormalBlending,
        depthTest: true,
        transparent: true,
        side: THREE.DoubleSide,
        linewidth: 2
      });
    } catch (e) {
      logger.error('Failed to initialize shader.', e);
    }
  }

  highlightPile (pile) {
    this.highlightFrame.position.set(pile.x, pile.y, 0);
    this.highlightFrame.visible = true;
    this.mp.scene.add(this.highlightFrame);
  }

  highlightNoPile () {
    this.mp.scene.remove(this.highlightFrame);
  }

  render () {
    this.renderer.render(this.mp.scene, this.camera);

    this.visiblePileTools.forEach((visiblePileTool) => {
      this.mp.scene.remove(visiblePileTool);
    });
  }

  allCoverChanged () {
    this.setPileMode(this.coverMatrixMenu.selectedIndex, this.mp.piles);
    this.redrawPiles(this.mp.piles);
    this.render();
  }

  redrawPiles (piles) {
    piles.forEach(pile => pile.draw());
  }

  fragmentSizeChanged (event) {
    logger.debug(event);
  }

  updateCellSize (newSize) {
    this.cellSize = newSize;

    this.labelTextSpec.size = this.cellSize - 1;
    this._matrixWidth = this.mp.focusNodes.length * this.cellSize;
    this._matrixWidthHalf = this._matrixWidth / 2;

    this._cols = Math.floor(
      (this.baseElDim.width - MARGIN_LEFT - MARGIN_RIGHT) /
      (this.baseElDim.width + MATRIX_GAP_HORIZONTAL)
    ) - 1;

    this.mp.piles.forEach(pile => pile.updateCellSize());

    this.mp.scene.remove(this.highlightFrame);
    this.highlightFrame = createRectFrame(
      this._matrixWidth, this._matrixWidth, 0xff8100, 10
    );
    this.mp.scene.add(this.highlightFrame);

    this.updateLayout(0, true);
    this.redrawPiles(this.mp.piles);
    this.render();
  }

  update () {
    try {
      this.updateConfig(this.store.getState().present.decompose.fragments.config);
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  getBaseElDim () {
    this._baseElDim = this.baseEl.getBoundingClientRect();
  }

  updateConfig (newConfig) {
    if (this.fragments.config !== newConfig) {
      this.fragments.config = newConfig;
      this.render(this.fragments.config);
    }
  }
}
