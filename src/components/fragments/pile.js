import science from 'science';
import {
  BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, TextGeometry
} from 'three';

import menuCommands from 'components/fragments/pile-menu-commands';

import {
  CELL_SIZE_HALF,
  CELL_SIZE,
  LETTER_SPACE,
  MATRIX_GAP_HORIZONTAL,
  MODE_BARCHART,
  MODE_DIRECT_DIFFERENCE,
  MODE_DIFFERENCE,
  MODE_TREND,
  MODE_VARIABILITY,
  PILE_TOOL_SIZE,
  PILING_DIRECTION,
  PREVIEW_SIZE,
  SHADER_MATERIAL
} from 'components/fragments/defaults';

import mpState from 'components/fragments/multipiles-state';

import {
  addBufferedRect,
  cellValue,
  createRect,
  createRectFrame,
  createText,
  makeBuffer3f
} from 'components/fragments/utils';

const Pile = {
  /********************************* Variables ********************************/

  cellFrame: createRectFrame(CELL_SIZE, CELL_SIZE, 0xff0000, 1),

  colored: false,

  coverMatrixMode: 0,

  geometry: BufferGeometry(),

  globalMatrix: [],

  highlighted: false,

  id: undefined,

  mesh: undefined,

  orderedLocally: false,

  pileMatrices: [],

  render: true,

  requireOrderUpdate: true,

  scale: undefined,

  scene: undefined,

  showNodeLabels: false,

  singleMatrix: undefined,

  x: 0,

  y: 0,

  /********************************** Methods *********************************/

  /**
   * Adds a set of matrices to this pile.
   *
   * @param {[type]} mpState.matrices - Array of mpState.matrices.
   * @return {object} Self.
   */
  addMatrices (matrices) {
    let m;

    for (let i = 0; i < mpState.matrices.length; i++) {
      m = mpState.matrices[i];
      this.pileMatrices.push(m);
      m.pile = this;
    }

    this.singleMatrix = undefined;
    this.requireOrderUpdate = true;
    this.calculateGlobalMatrix();

    return this;
  },

  /**
   * Calculate global matrix.
   *
   * @return {??}  [description]
   */
  calculateGlobalMatrix () {
    this.globalMatrix = [];
    let numNodes = this.nodeOrder.length;

    for (let i = 0; i < numNodes; i++) {
      this.localNodeOrder.push(0);
      this.globalMatrix[i] = [];
      for (let j = 0; j < numNodes; j++) {
        this.globalMatrix[i][j] = 0;
      }
    }

    let times = this.pileMatrices.length;

    for (let i = 0; i < numNodes; i++) {
      for (let j = i; j < numNodes; j++) {
        for (let t = 0; t < times; t++) {
          this.globalMatrix[i][j] += Math.abs(
            this.pileMatrices[t].matrix[i][j]
          );
        }
        this.globalMatrix[i][j] /= times;
        this.globalMatrix[j][i] = this.globalMatrix[i][j];
      }
    }
  },

  /**
   * Returns whether this pile contains that matrix object
   *
   * @param {object} matrix - Matrix to be checked.
   * @return {boolean} `true` if `matrix` is on the pile.
   */
  contains (matrix) {
    return this.pileMatrices.indexOf(matrix) > -1;
  },

  /**
   * Destroy this instance.
   *
   * @return {object} Self.
   */
  destroy () {
    mpState.pileMeshes.splice(mpState.pileMeshes.indexOf(this.mesh), 1);
    this.geometry.dispose();
    mpState.scene.remove(this.mesh);
    this.render = false;
    this.pileMatrices = [];

    return this;
  },

  /**
   * Contains all the drawing routines.
   *
   * @return {object} Self.
   */
  draw () {
    let thisNodes = [];

    for (let i = 0; i < this.nodeOrder.length; i++) {
      if (mpState.focusNodes.indexOf(this.nodeOrder[i]) > -1) {
        thisNodes.push(this.nodeOrder[i]);
      }
    }

    let numMats = this.pileMatrices.length;
    let numNodes = thisNodes.length;

    // UPDATE COVER MATRIX CELLS + PILE PREVIEWS
    if (this.mesh) {
      mpState.pileMeshes.splice(mpState.pileMeshes.indexOf(this.mesh), 1);
      mpState.scene.remove(this.mesh);
    }

    this.geometry = BufferGeometry();

    let vertexPositions = [];
    let vertexColors = [];
    let x;
    let y;
    let c;
    let v;
    let ni;
    let nj;

    if (this.pileMatrices.length === 1) {
      this.singleMatrix = this.pileMatrices[0];
    }

    if (this.singleMatrix) {
      // Show that single matrix
      let m = this.singleMatrix.matrix;

      for (let i = 0; i < numNodes; i++) {
        ni = thisNodes[i];
        x = -mpState.matrixWidthHalf + (CELL_SIZE / 2) + (i * CELL_SIZE);

        for (let j = i; j < numNodes; j++) {
          nj = thisNodes[j];
          y = mpState.matrixWidthHalf - (CELL_SIZE / 2) - (j * CELL_SIZE);

          if (
            this.coverMatrixMode === MODE_DIFFERENCE &&
            mpState.piles.indexOf(this) > 0
          ) {
            v = (
              this.globalMatrix[ni][nj] -
              mpState.piles[mpState.piles.indexOf(this) - 1].globalMatrix[ni][nj]
            );
            c = 1 - Math.abs(v);
            let col;
            if (v > 0) {
              col = [c, c, 1];
            } else {
              col = [1, c, c];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );

            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
          } else if (
            this.coverMatrixMode === MODE_DIRECT_DIFFERENCE &&
            mpState.hoveredPile &&
            this !== mpState.hoveredPile
          ) {
            v = (
              mpState.piles[
                mpState.piles.indexOf(mpState.hoveredPile)
              ].globalMatrix[ni][nj] -
              this.globalMatrix[ni][nj]
            );
            c = 1 - Math.abs(v);
            let col;
            if (v < 0) {
              col = [c, c, 1];
            } else {
              col = [1, c, c];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );

            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
          } else {
            c = 1 - cellValue(m[ni][nj]);
            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              [c, c, c]
            );
            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              [c, c, c]
            );
          }
        }
      }
    } else {
      // Show cover matrix
      for (let i = 0; i < numNodes; i++) {
        ni = thisNodes[i];
        x = -mpState.matrixWidthHalf + (CELL_SIZE / 2) + (i * CELL_SIZE);

        for (let j = i; j < numNodes; j++) {
          nj = thisNodes[j];
          v = 0;
          y = mpState.matrixWidthHalf - (CELL_SIZE / 2) - (j * CELL_SIZE);

          if (this.coverMatrixMode === MODE_TREND) {
            v = (
              this.pileMatrices[this.pileMatrices.length - 1].matrix[ni][nj] -
              this.pileMatrices[0].matrix[ni][nj]
            );
            c = 1 - Math.abs(v);
            let col;
            if (v > 0) {
              col = [c, c, 1];
            } else {
              col = [1, c, c];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );

            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
          } else if (this.coverMatrixMode === MODE_VARIABILITY) {
            v = 0;
            const arr = [];

            for (let t = 1; t < numMats; t++) {
              arr.push(this.pileMatrices[t].matrix[ni][nj]);
            }

            v = science.standard_deviation(arr);
            c = 1 - Math.abs(cellValue(v));

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              [c, c, 1]
            );

            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              [c, c, 1]
            );
          } else if (this.coverMatrixMode === MODE_BARCHART) {
            let d = CELL_SIZE / numMats;

            for (let t = 0; t < numMats; t++) {
              v = 1 - this.pileMatrices[t].matrix[ni][nj];

              x = -mpState.matrixWidthHalf + (i * CELL_SIZE) + (d * t) + (d / 2);
              y = +mpState.matrixWidthHalf - ((j + 0.5) * CELL_SIZE);
              addBufferedRect(vertexPositions,
                x,
                y,
                0,
                d,
                (1 - v) * CELL_SIZE,
                vertexColors,
                [v, v, v]
              );

              x = -mpState.matrixWidthHalf + (j * CELL_SIZE) + (d * t) + (d / 2);
              y = +mpState.matrixWidthHalf - ((i + 0.5) * CELL_SIZE);

              addBufferedRect(
                vertexPositions,
                x,
                y,
                0,
                d,
                (1 - v) * CELL_SIZE,
                vertexColors,
                [v, v, v]
              );
            }
          } else if (
            this.coverMatrixMode === MODE_DIFFERENCE &&
            mpState.piles.indexOf(this) > 0
          ) {
            v = (
              this.globalMatrix[ni][nj] -
              mpState.piles[mpState.piles.indexOf(this) - 1].globalMatrix[ni][nj]
            );
            c = 1 - Math.abs(v);
            let col;
            if (v > 0) {
              col = [c, c, 1];
            } else {
              col = [1, c, c];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
          } else if (
            this.coverMatrixMode === MODE_DIRECT_DIFFERENCE &&
            mpState.hoveredPile &&
            this !== mpState.hoveredPile
          ) {
            v = (
              mpState.piles[
                mpState.piles.indexOf(mpState.hoveredPile)
              ].globalMatrix[ni][nj] -
              this.globalMatrix[ni][nj]
            );
            c = 1 - Math.abs(v);
            let col;

            if (v < 0) {
              col = [c, c, 1];
            } else {
              col = [1, c, c];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              col
            );
          } else {
            for (let t = 0; t < numMats; t++) {
              v += this.pileMatrices[t].matrix[ni][nj];
            }
            v /= numMats;
            c = 1 - Math.max(0, cellValue(v));

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              [c, c, c]
            );
            addBufferedRect(vertexPositions,
              -y,
              -x,
              0,
              CELL_SIZE,
              CELL_SIZE,
              vertexColors,
              [c, c, c]
            );
          }
        }
      }
    }

    // UPDATE PREVIEWS
    let m;
    let highlight;
    for (let t = 0; t < numMats && this.pileMatrices.length > 1; t++) {
      m = this.pileMatrices[t].matrix;
      y = mpState.matrixWidthHalf + (PREVIEW_SIZE * (t + 1));

      // test if matrix is single, if so highlight its preview
      highlight = false;
      if (this.pileMatrices[t] === this.singleMatrix) {
        highlight = true;
      }

      for (let i = 0; i < numNodes; i++) {
        v = 0;
        ni = thisNodes[i];
        for (let j = 0; j < numNodes; j++) {
          v += m[ni][thisNodes[j]];
        }
        c = 1 - cellValue(v / numNodes);
        if (highlight) {
          c -= (1 - c) * 0.7;
        }
        x = -mpState.matrixWidthHalf + (CELL_SIZE * i) + (CELL_SIZE / 2);

        if (PILING_DIRECTION === 'vertical') {
          addBufferedRect(
            vertexPositions,
            x,
            y,
            0.5,
            CELL_SIZE,
            PREVIEW_SIZE,
            vertexColors,
            [1, 1, 1]
          );
          addBufferedRect(
            vertexPositions,
            x,
            y,
            0.5,
            CELL_SIZE,
            PREVIEW_SIZE - 0.3,
            vertexColors,
            [c, c, c]
          );
        } else {
          addBufferedRect(
            vertexPositions,
            y,
            x,
            0.5,
            PREVIEW_SIZE,
            CELL_SIZE,
            vertexColors,
            [1, 1, 1]
          );
          addBufferedRect(
            vertexPositions,
            y,
            x,
            0.5,
            PREVIEW_SIZE - 0.3,
            CELL_SIZE,
            vertexColors,
            [c, c, c]
          );
        }
      }
    }

    // CREATE GAP to next matrix
    if (mpState.hoveredGapPile && mpState.hoveredGapPile === this) {
      c = [1, 0.7, 0.7];
    } else {
      c = [1, 1, 1];
    }

    addBufferedRect(
      vertexPositions,
      mpState.matrixWidthHalf + (MATRIX_GAP_HORIZONTAL / 2),
      0,
      -1,
      MATRIX_GAP_HORIZONTAL,
      mpState.matrixWidth,
      vertexColors,
      c
    );

     // CREATE + ADD MESH
    this.geometry.addAttribute(
      'position',
      BufferAttribute(makeBuffer3f(vertexPositions), 3)
    );
    this.geometry.addAttribute(
      'customColor',
      BufferAttribute(makeBuffer3f(vertexColors), 3)
    );
    this.mesh = Mesh(this.geometry, SHADER_MATERIAL);
    this.mesh.scale.set(this.scale, this.scale, this.scale);

    if (this === mpState.hoveredPile) {
      menuCommands.forEach((command, index) => {
        command.pile = this;

        let o = createRect(
          command.name.length * LETTER_SPACE, PILE_TOOL_SIZE, command.color
        );

        let f = createRectFrame(
          command.name.length * LETTER_SPACE, PILE_TOOL_SIZE, 0x000000, 5
        );

        o.add(f);

        let textGeom = TextGeometry(
          command.name,
          {
            size: 8,
            height: 1,
            curveSegments: 1,
            font: 'helvetiker'
          }
        );

        let textMaterial = MeshBasicMaterial({ color: 0xffffff });
        let label = Mesh(textGeom, textMaterial);

        o.position.set(
          (
            this.x -
            mpState.matrixWidthHalf -
            (command.name.length * LETTER_SPACE / 2)
          ),
          (
            this.y -
            2 +
            mpState.matrixWidthHalf -
            (PILE_TOOL_SIZE / 2) -
            (index * PILE_TOOL_SIZE)
          ),
          0.8
        );

        label.position.set(
          -(command.name.length * LETTER_SPACE / 2) + 2, -4, 1
        );
        o.add(label);
        o.pileTool = command;
        o.scale.set(1 / this.scale, 1 / this.scale, 0.9);
        mpState.visiblePileTools.push(o);
        mpState.scene.add(o);
      });
    }

    // ADD PILE ID LABEL
    let label = createText(
      mpState.piles.indexOf(this) + 1,
      -mpState.matrixWidthHalf - 2,
      -mpState.matrixWidthHalf - 14,
      0,
      9,
      '0x888888'
    );
    label.scale.set(1 / this.scale, 1 / this.scale, 1 / this.scale);
    this.mesh.add(label);

    // ADD MATRIX LABELS
    let labelText = '';
    if (this.pileMatrices.length > 1) {
      if (this.singleMatrix) {
        labelText = `${mpState.matrices.indexOf(
          this.singleMatrix
        )}/${this.pileMatrices.length}`;
      } else {
        labelText = `${(
          mpState.matrices.indexOf(this.pileMatrices[0]) + 1
        )}-${(
          mpState.matrices.indexOf(this.pileMatrices[this.pileMatrices.length - 1]) + 1
        )} (${this.pileMatrices.length})`;
      }

      label = createText(
        labelText,
        -mpState.matrixWidthHalf + 20,
        -mpState.matrixWidthHalf - 12,
        0,
        7,
        '0xffffff'
      );
      label.scale.set(1 / this.scale, 1 / this.scale, 1 / this.scale);
      this.mesh.add(label);
    }

    // FINISH
    this.mesh.add(this.matFrame);
    this.matFrame.position.set(-1, -1, 0.1);

    this.mesh.pile = this;
    mpState.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, 0);
    mpState.scene.add(this.mesh);
  },

  /**
   * Elevate mesh.
   *
   * @param {number} z - Level.
   * @return {object} Self.
   */
  elevateTo (z) {
    this.z = z;
    this.mesh.position.set(this.x, this.y, z);

    return this;
  },

  /**
   * Returns the last matrix in this pile
   *
   * @return {object} Last matrix on the pile.
   */
  getLast () {
    return this.pileMatrices[this.pileMatrices.length - 1];
  },

  /**
   * Get local order.
   *
   * @return {??} Local order.
   */
  getLocalOrder () {
    return this.localNodeOrder;
  },

  /**
   * Get mpState.matrices of the pile.
   *
   * @return {array} List of mpState.matrices.
   */
  getMatrices () {
    return this.pileMatrices;
  },

  /**
   * Get the matrix at a given position.
   *
   * @param {number} index - Index.
   * @return {object} Matrix
   */
  getMatrix (index) {
    return this.pileMatrices[index];
  },

  /**
   * Get the position of a matrix in the pile.
   *
   * @param {number} matrix - Matrix.
   * @return {object} Matrix position.
   */
  getMatrixPosition (matrix) {
    return this.pileMatrices.indexOf(matrix);
  },

  /**
   * Scale to ???.
   *
   * @param {Number} scale - Scale.
   */
  getPos () {
    return this.mesh.position;
  },

  /**
   * Hover gaps.
   *
   * @param   {boolean} hoverGap - If `true` hover gaps.
   */
  hoverGap (hoverGap) {
    this.hoverGap = hoverGap;

    return this;
  },

  /**
   * Inver order.
   *
   * @return {object} Self.
   */
  invertOrder () {
    this.nodeOrder = this.nodeOrder.reverse();

    return this;
  },

  /**
   * Move mesh.
   *
   * @param {number} x - X position.
   * @param {number} y - Y position.
   * @return {object} Self.
   */
  moveTo (x, y) {
    this.x = x;
    this.y = -y;
    this.mesh.position.set(x, -y, 0);

    return this;
  },

  /**
   * Remove the specifid mpState.matrices from the pile.
   *
   * @description
   * If any were the visible matrix, then make the remaining last element of the
   * pile visible. redraw the remaining labels at the correct positions.
   *
   * @param {array} mpState.matrices - Array of mpState.matrices.
   * @return {object} Self.
   */
  removeMatrices (matrices) {
    for (let i = 0; i < mpState.matrices.length; i++) {
      let m = mpState.matrices[i];
      for (let j = 0; j < this.pileMatrices.length; j++) {
        if (m === this.pileMatrices[j]) {
          this.pileMatrices.splice(j, 1);
          break;
        }
      }
    }
    this.requireOrderUpdate = true;
    this.calculateGlobalMatrix();

    return this;
  },

  /**
   * Scale to ???.
   *
   * @param {Number} scale - Scale.
   * @return {object} Self.
   */
  scaleTo (scale) {
    this.scale = scale;
    this.mesh.scale.set(scale, scale, scale);

    return this;
  },

  /**
   * Set cover matrix.
   *
   * @param {??} mode - Mode.
   * @return {object} Self.
   */
  setCoverMatrixMode (mode) {
    this.coverMatrixMode = mode;

    return this;
  },

  /**
   * Set node order.
   *
   * @param {???} nodeOrder - Node order.
   * @param {boolean} orderedLocally - If `true` is locally ordered.
   * @return {object} Self.
   */
  setNodeOrder (nodeOrder, orderedLocally) {
    if (!orderedLocally) {
      this.orderedLocally = false;
    } else {
      this.orderedLocally = orderedLocally;
    }

    this.nodeOrder = nodeOrder;

    return this;
  },

  /**
   * Show or hide node labels.
   *
   * @param {boolean} showLabels - If `true` shows node labels.
   * @return {object} Self.
   */
  showLabels (showLabels) {
    this.showNodeLabels = showLabels;

    return this;
  },

  /**
   * Show single matrix
   *
   * @param {object} matrix - Matrix to be shown.
   * @return {object} Self.
   */
  showSingle (matrix) {
    this.singleMatrix = matrix;

    return this;
  },

  /**
   * Returns the number of mpState.matrices in this pile.
   *
   * @return {number} Size of the pile.
   */
  size () {
    return this.pileMatrices.length;
  },

  /**
   * ???
   * @return {object} Self.
   */
  updateCellSize () {
    this.matFrame = createRectFrame(
      mpState.matrixWidth, mpState.matrixWidth, 0xaaaaaa, 0.1
    );

    return this;
  },

  /**
   * Frame requires update after matrix size has changed through filtering.
   *
   * @return {object} Self.
   */
  updateFrame () {
    this.matFrame = createRectFrame(
      mpState.matrixWidth, mpState.matrixWidth, 0xaaaaaa, 0.1
    );

    return this;
  },

  /**
   * Update hovered cell.
   *
   * @return {object} Self.
   */
  updateHoveredCell () {
    if (mpState.hoveredCell) {
      this.mesh.add(this.cellFrame);
      const x = (
        -mpState.matrixWidthHalf +
        (CELL_SIZE * mpState.hoveredCell.col) +
        CELL_SIZE_HALF
      );
      const y = (
        mpState.matrixWidthHalf -
        (CELL_SIZE * mpState.hoveredCell.row) -
        CELL_SIZE_HALF
      );
      this.cellFrame.position.set(x, y, 1);
    } else if (this.mesh.children.indexOf(this.cellFrame) > -1) {
      this.mesh.remove(this.cellFrame);
    }

    return this;
  },

  /**
   * Update label.
   *
   * @param {boolean} b - If `true` update label.
   * @return {object} Self.
   */
  updateLabels (updateLabels) {
    if (updateLabels && mpState.hoveredCell) {
      const x = (
        -mpState.matrixWidthHalf +
        (CELL_SIZE * mpState.hoveredCell.col) +
        CELL_SIZE_HALF
      );
      const y = (
        mpState.matrixWidthHalf -
        (CELL_SIZE * mpState.overedCell.row) -
        CELL_SIZE_HALF
      );

      let sCol = mpState.nodes[mpState.focusNodes[mpState.hoveredCell.col]].name;
      let rCol = createRect(10 * sCol.length, 12, 0xffffff);

      rCol.position.set(
        x + (10 * sCol.length / 2) - 3,
        mpState.matrixWidthHalf + 10,
        2
      );

      this.mesh.add(rCol);
      let colLabel = createText(
        sCol,
        x,
        mpState.matrixWidthHalf + 5,
        2,
        9,
        0x000000
      );

      this.mesh.add(colLabel);

      let sRow = mpState.nodes[mpState.focusNodes[mpState.hoveredCell.row]].name;
      let rRow = createRect(10 * sRow.length, 12, 0xffffff);

      rRow.position.set(
        mpState.matrixWidthHalf + 4 + (10 * sRow.length / 2),
        y + 4,
        2
      );

      this.mesh.add(rRow);

      let rowLabel = createText(
        sRow,
        +mpState.matrixWidthHalf + 5,
        y,
        2,
        9,
        0x000000
      );

      this.mesh.add(rowLabel);
    }

    return this;
  }
};

export default function PileFactory (id, scene, scale) {
  const inst = Object.create(Pile);

  inst.id = id;
  inst.scale = scale;
  inst.scene = scene;

  return inst;
}
