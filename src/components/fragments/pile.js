// Aurelia
import { LogManager } from 'aurelia-framework';

import { stats } from 'science';

import {
  BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, TextGeometry
} from 'three';

import menuCommands from 'components/fragments/pile-menu-commands';

import {
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
  SHADER_ATTRIBUTES
} from 'components/fragments/fragments-defaults';

import fgmState from 'components/fragments/fragments-state';

import {
  add2dSqrtBuffRect,
  addBufferedRect,
  cellValue,
  createRect,
  createRectFrame,
  createText,
  makeBuffer3f
} from 'components/fragments/fragments-utils';


const logger = LogManager.getLogger('pile');  // eslint-disable-line no-unused-vars


export default class Pile {
  constructor (id, scene, scale, dims) {
    this.cellFrame = createRectFrame(
      fgmState.cellSize, fgmState.cellSize, 0xff0000, 1
    );
    this.colored = false;
    this.coverMatrix = [];
    this.coverMatrixMode = 0;
    this.dims = dims;
    this.geometry = new BufferGeometry({ attributes: SHADER_ATTRIBUTES });
    this.highlighted = false;
    this.id = id;
    this.orderedLocally = false;
    this.pileMatrices = [];
    this.render = true;
    this.scale = scale;
    this.scene = scene;
    this.showNodeLabels = false;
    this.x = 0;
    this.y = 0;

    this.updateFrame();
  }

  /****************************** Getter / Setter *****************************/

  get matrixWidth () {
    return this.dims * fgmState.cellSize;
  }

  get matrixWidthHalf () {
    return this.matrixWidth / 2;
  }

  get singleMatrix () {
    if (this.pileMatrices.length === 1) {
      return this.pileMatrices[0];
    }

    return false;
  }

  /**
   * Standard deviation
   *
   * @return {number} Standard deviation.
   */
  get std () {
    return Math.sqrt(this.variance);
  }

  /**
   * Variance
   *
   * @return {number} Variance.
   */
  get variance () {
    const x = this.aggregateX();
    const n = x.reduce((a, b) => a + b, 0);

    let xHalfLen = (x.length - 1) / 2;
    let std = 0;

    if (x.length % 2) {
      xHalfLen = (x.length - 1) / 2;
      std = x.reduce(
        (a, b, index) => a + (((index - xHalfLen) ** 2) * b), 0
      ) / n;
    } else {
      xHalfLen = (x.length - 2) / 2;

      // In the following we slice the array in two halfs such that the two
      // middle bins of the original array consitute for zero variance.
      // First half
      std = x.slice(0, xHalfLen)
        .reduce((a, b, index) => a + (((index - xHalfLen) ** 2) * b), 0);

      // Second half
      std += x.slice(xHalfLen + 1)
        .reduce((a, b, index) => a + ((index ** 2) * b), 0);

      std /= n;
    }

    return std;
  }


  /********************************** Methods *********************************/

  aggregateX (dim) {
    const aggregate = new Float32Array(this.dims);

    this.pileMatrices
      .map(pile => pile.matrix)
      .forEach((matrix) => {
        matrix.forEach((row) => {
          row.forEach((cell, index) => {
            aggregate[index] += cell;
          });
        });
      });

    return aggregate;
  }

  aggregateY () {
    const aggregate = new Float32Array(this.dims);

    this.pileMatrices
      .map(pile => pile.matrix)
      .forEach((matrix) => {
        matrix.forEach((row) => {
          row.forEach((cell, index) => {
            aggregate[index] += cell;
          });
        });
      });

    return aggregate;
  }

  /**
   * Adds a set of matrices to this pile.
   *
   * @param {array} matrices - Array of fgmState.matrices.
   * @return {object} Self.
   */
  addMatrices (matrices) {
    this.pileMatrices.push(...matrices);
    matrices.forEach((matrix) => { matrix.pile = this; });

    this.calculateCoverMatrix();

    logger.debug('pile.addmatrices', matrices, this.pileMatrices);

    return this;
  }

  /**
   * Calculate global matrix.
   *
   * @return {object} Self.
   */
  calculateCoverMatrix () {
    // Create empty this.dims x this.dims matrix
    this.coverMatrix = Array(this.dims).fill(new Float32Array(this.dims));

    let numMatrices = this.pileMatrices.length || 1;

    // Create empty matrix
    for (let i = 0; i < this.dims; i++) {
      // Sum up the values across all matrices
      for (let j = i; j < this.dims; j++) {
        this.pileMatrices.forEach((pileMatrix) => {
          this.coverMatrix[i][j] += Math.abs(
            pileMatrix.matrix[i][j]
          );
        });

        // Average values
        this.coverMatrix[i][j] /= numMatrices;

        // Fill up lower half of the matrix
        this.coverMatrix[j][i] = this.coverMatrix[i][j];
      }
    }

    return this;
  }

  /**
   * Returns whether this pile contains that matrix object
   *
   * @param {object} matrix - Matrix to be checked.
   * @return {boolean} `true` if `matrix` is on the pile.
   */
  contains (matrix) {
    return this.pileMatrices.indexOf(matrix) > -1;
  }

  /**
   * Destroy this instance.
   *
   * @return {object} Self.
   */
  destroy () {
    fgmState.pileMeshes.splice(fgmState.pileMeshes.indexOf(this.mesh), 1);
    this.geometry.dispose();
    fgmState.scene.remove(this.mesh);
    this.render = false;
    this.pileMatrices = [];

    return this;
  }

  /**
   * Contains all the drawing routines.
   *
   * @return {object} Self.
   */
  draw () {
    const numMatrices = this.pileMatrices.length;
    const vertexPositions = [];
    const vertexColors = [];
    let x;
    let y;
    let valueInv;  // Inverse value, i.e., 1 - abs(value)
    let value;
    let color;

    // UPDATE COVER MATRIX CELLS + PILE PREVIEWS
    if (this.mesh) {
      fgmState.pileMeshes.splice(fgmState.pileMeshes.indexOf(this.mesh), 1);
      fgmState.scene.remove(this.mesh);
    }

    this.geometry = new BufferGeometry({
      attributes: SHADER_ATTRIBUTES
    });

    if (this.singleMatrix) {
      const matrix = this.singleMatrix.matrix;

      for (let i = 0; i < this.dims; i++) {
        x = -this.matrixWidthHalf + (fgmState.cellSize / 2) + (i * fgmState.cellSize);

        for (let j = i; j < this.dims; j++) {
          y = this.matrixWidthHalf - (fgmState.cellSize / 2) - (j * fgmState.cellSize);

          if (
            this.coverMatrixMode === MODE_DIFFERENCE &&
            fgmState.piles.indexOf(this) > 0
          ) {
            value = (
              this.coverMatrix[i][j] -
              fgmState.piles[fgmState.piles.indexOf(this) - 1].coverMatrix[i][j]
            );

            valueInv = 1 - Math.abs(value);

            if (value > 0) {
              color = [valueInv, valueInv, 1];
            } else {
              color = [1, valueInv, valueInv];
            }

            add2dSqrtBuffRect(
              vertexPositions,
              x,
              y,
              fgmState.cellSize,
              vertexColors,
              color
            );
          } else if (
            this.coverMatrixMode === MODE_DIRECT_DIFFERENCE &&
            fgmState.hoveredPile &&
            this !== fgmState.hoveredPile
          ) {
            value = (
              fgmState.piles[
                fgmState.piles.indexOf(fgmState.hoveredPile)
              ].coverMatrix[i][j] -
              this.coverMatrix[i][j]
            );
            valueInv = 1 - Math.abs(value);

            if (valueInv < 0) {
              color = [valueInv, valueInv, 1];
            } else {
              color = [1, valueInv, valueInv];
            }

            add2dSqrtBuffRect(
              vertexPositions,
              x,
              y,
              fgmState.cellSize,
              vertexColors,
              color
            );
          } else {
            valueInv = 1 - cellValue(matrix[i][j]);

            add2dSqrtBuffRect(
              vertexPositions,
              x,
              y,
              fgmState.cellSize,
              vertexColors,
              [valueInv, valueInv, valueInv]
            );
          }
        }
      }
    } else {
      // Show cover matrix
      for (let i = 0; i < this.dims; i++) {
        // ni = thisNodes[i];
        x = -this.matrixWidthHalf + (fgmState.cellSize / 2) + (i * fgmState.cellSize);

        for (let j = i; j < this.dims; j++) {
          // nj = thisNodes[j];
          value = 0;
          y = this.matrixWidthHalf - (fgmState.cellSize / 2) - (j * fgmState.cellSize);

          if (this.coverMatrixMode === MODE_TREND) {
            value = (
              this.pileMatrices[this.pileMatrices.length - 1].matrix[i][j] -
              this.pileMatrices[0].matrix[i][j]
            );
            valueInv = 1 - Math.abs(value);

            if (value > 0) {
              color = [valueInv, valueInv, 1];
            } else {
              color = [1, valueInv, valueInv];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              color
            );

            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              color
            );
          } else if (this.coverMatrixMode === MODE_VARIABILITY) {
            value = 0;
            const arr = [];

            for (let t = 1; t < numMatrices; t++) {
              arr.push(this.pileMatrices[t].matrix[i][j]);
            }

            // standard deviation = varianz^2
            value = Math.sqrt(stats.variance(x));
            valueInv = 1 - Math.abs(cellValue(value));

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              [valueInv, valueInv, 1]
            );

            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              [valueInv, valueInv, 1]
            );
          } else if (this.coverMatrixMode === MODE_BARCHART) {
            let d = fgmState.cellSize / numMatrices;

            for (let t = 0; t < numMatrices; t++) {
              value = 1 - this.pileMatrices[t].matrix[i][j];

              x = -this.matrixWidthHalf + (i * fgmState.cellSize) + (d * t) + (d / 2);
              y = +this.matrixWidthHalf - ((j + 0.5) * fgmState.cellSize);
              addBufferedRect(
                vertexPositions,
                x,
                y,
                0,
                d,
                (1 - value) * fgmState.cellSize,
                vertexColors,
                [value, value, value]
              );

              x = -this.matrixWidthHalf + (j * fgmState.cellSize) + (d * t) + (d / 2);
              y = +this.matrixWidthHalf - ((i + 0.5) * fgmState.cellSize);

              addBufferedRect(
                vertexPositions,
                x,
                y,
                0,
                d,
                (1 - value) * fgmState.cellSize,
                vertexColors,
                [value, value, value]
              );
            }
          } else if (
            this.coverMatrixMode === MODE_DIFFERENCE &&
            fgmState.piles.indexOf(this) > 0
          ) {
            value = (
              this.coverMatrix[i][j] -
              fgmState.piles[fgmState.piles.indexOf(this) - 1].coverMatrix[i][j]
            );

            valueInv = 1 - Math.abs(value);

            if (value > 0) {
              color = [valueInv, valueInv, 1];
            } else {
              color = [1, valueInv, valueInv];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              color
            );
            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              color
            );
          } else if (
            this.coverMatrixMode === MODE_DIRECT_DIFFERENCE &&
            fgmState.hoveredPile &&
            this !== fgmState.hoveredPile
          ) {
            value = (
              fgmState.piles[
                fgmState.piles.indexOf(fgmState.hoveredPile)
              ].coverMatrix[i][j] -
              this.coverMatrix[i][j]
            );
            valueInv = 1 - Math.abs(value);

            if (value < 0) {
              color = [valueInv, valueInv, 1];
            } else {
              color = [1, valueInv, valueInv];
            }

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              color
            );
            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              color
            );
          } else {
            for (let t = 0; t < numMatrices; t++) {
              value += this.pileMatrices[t].matrix[i][j];
            }
            value /= numMatrices;
            valueInv = 1 - Math.max(0, cellValue(value));

            addBufferedRect(
              vertexPositions,
              x,
              y,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              [valueInv, valueInv, valueInv]
            );
            addBufferedRect(
              vertexPositions,
              -y,
              -x,
              0,
              fgmState.cellSize,
              fgmState.cellSize,
              vertexColors,
              [valueInv, valueInv, valueInv]
            );
          }
        }
      }
    }

    // UPDATE PREVIEWS
    if (this.pileMatrices > 1) {
      this.pileMatrices.forEach((matrix, index) => {
        y = this.matrixWidthHalf + (PREVIEW_SIZE * (index + 1));

        for (let i = 0; i < this.dims; i++) {
          value = 0;

          for (let j = 0; j < this.dims; j++) {
            value += matrix[i][j];
          }

          valueInv = 1 - cellValue(value / this.dims);

          x = -this.matrixWidthHalf + (fgmState.cellSize * i) + (fgmState.cellSize / 2);

          if (PILING_DIRECTION === 'vertical') {
            addBufferedRect(
              vertexPositions,
              x,
              y,
              0.5,
              fgmState.cellSize,
              PREVIEW_SIZE,
              vertexColors,
              [1, 1, 1]
            );
            addBufferedRect(
              vertexPositions,
              x,
              y,
              0.5,
              fgmState.cellSize,
              PREVIEW_SIZE - 0.3,
              vertexColors,
              [valueInv, valueInv, valueInv]
            );
          } else {
            addBufferedRect(
              vertexPositions,
              y,
              x,
              0.5,
              PREVIEW_SIZE,
              fgmState.cellSize,
              vertexColors,
              [1, 1, 1]
            );
            addBufferedRect(
              vertexPositions,
              y,
              x,
              0.5,
              PREVIEW_SIZE - 0.3,
              fgmState.cellSize,
              vertexColors,
              [valueInv, valueInv, valueInv]
            );
          }
        }
      });
    }

    // CREATE GAP to next matrix
    if (fgmState.hoveredGapPile && fgmState.hoveredGapPile === this) {
      valueInv = [1, 0.7, 0.7];
    } else {
      valueInv = [1, 1, 1];
    }

    addBufferedRect(
      vertexPositions,
      this.matrixWidthHalf + (MATRIX_GAP_HORIZONTAL / 2),
      0,
      -1,
      MATRIX_GAP_HORIZONTAL,
      this.matrixWidth,
      vertexColors,
      valueInv
    );

     // CREATE + ADD MESH
    this.geometry.addAttribute(
      'position',
      new BufferAttribute(makeBuffer3f(vertexPositions), 3)
    );

    this.geometry.addAttribute(
      'customColor',
      new BufferAttribute(makeBuffer3f(vertexColors), 3)
    );

    this.mesh = new Mesh(this.geometry, fgmState.shaderMaterial);
    this.mesh.scale.set(this.scale, this.scale, this.scale);

    if (this === fgmState.hoveredPile) {
      menuCommands.forEach((command, index) => {
        command.pile = this;

        let o = createRect(
          command.name.length * LETTER_SPACE, PILE_TOOL_SIZE, command.color
        );

        let f = createRectFrame(
          command.name.length * LETTER_SPACE, PILE_TOOL_SIZE, 0x000000, 5
        );

        o.add(f);

        let textGeom = new TextGeometry(
          command.name,
          {
            size: 8,
            height: 1,
            curveSegments: 1,
            font: 'helvetiker'
          }
        );

        let textMaterial = new MeshBasicMaterial({ color: 0xffffff });
        let label = new Mesh(textGeom, textMaterial);

        o.position.set(
          (
            this.x -
            this.matrixWidthHalf -
            (command.name.length * LETTER_SPACE / 2)
          ),
          (
            this.y -
            2 +
            this.matrixWidthHalf -
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
        fgmState.visiblePileTools.push(o);
        fgmState.scene.add(o);
      });
    }

    // ADD PILE ID LABEL
    let label = createText(
      fgmState.piles.indexOf(this) + 1,
      -this.matrixWidthHalf - 2,
      -this.matrixWidthHalf - 14,
      0,
      9,
      0x888888
    );
    label.scale.set(1 / this.scale, 1 / this.scale, 1 / this.scale);
    this.mesh.add(label);

    // ADD MATRIX LABELS
    let labelText = '';
    if (this.pileMatrices.length > 1) {
      if (this.singleMatrix) {
        labelText = `${fgmState.matrices.indexOf(
          this.singleMatrix
        )}/${this.pileMatrices.length}`;
      } else {
        labelText = `${(
          fgmState.matrices.indexOf(this.pileMatrices[0]) + 1
        )}-${(
          fgmState.matrices.indexOf(this.pileMatrices[this.pileMatrices.length - 1]) + 1
        )} (${this.pileMatrices.length})`;
      }

      label = createText(
        labelText,
        -this.matrixWidthHalf + 20,
        -this.matrixWidthHalf - 12,
        0,
        7,
        0xffffff
      );
      label.scale.set(1 / this.scale, 1 / this.scale, 1 / this.scale);
      this.mesh.add(label);
    }

    // FINISH
    this.mesh.add(this.matrixFrame);
    this.matrixFrame.position.set(-1, -1, 0.1);

    this.mesh.pile = this;
    fgmState.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, 0);
    fgmState.scene.add(this.mesh);
  }

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
  }

  /**
   * Returns the last matrix in this pile
   *
   * @return {object} Last matrix on the pile.
   */
  getLast () {
    return this.pileMatrices[this.pileMatrices.length - 1];
  }

  /**
   * Get local order.
   *
   * @return {??} Local order.
   */
  getLocalOrder () {
    return this.localNodeOrder;
  }

  /**
   * Get fgmState.matrices of the pile.
   *
   * @return {array} List of fgmState.matrices.
   */
  getMatrices () {
    return this.pileMatrices;
  }

  /**
   * Get the matrix at a given position.
   *
   * @param {number} index - Index.
   * @return {object} Matrix
   */
  getMatrix (index) {
    return this.pileMatrices[index];
  }

  /**
   * Get the position of a matrix in the pile.
   *
   * @param {number} matrix - Matrix.
   * @return {object} Matrix position.
   */
  getMatrixPosition (matrix) {
    return this.pileMatrices.indexOf(matrix);
  }

  /**
   * Scale to ???.
   *
   * @param {Number} scale - Scale.
   */
  getPos () {
    return this.mesh.position;
  }

  /**
   * Hover gaps.
   *
   * @param   {boolean} hoverGap - If `true` hover gaps.
   */
  hoverGap (hoverGap) {
    this.hoverGap = hoverGap;

    return this;
  }

  /**
   * Inver order.
   *
   * @return {object} Self.
   */
  invertOrder () {
    this.nodeOrder = this.nodeOrder.reverse();

    return this;
  }

  /**
   * Move mesh.
   *
   * @param {number} x - X position.
   * @param {number} y - Y position.
   * @return {object} Self.
   */
  moveTo (x, y) {
    this.x = x + this.matrixWidthHalf;
    this.y = -y - this.matrixWidthHalf;

    logger.debug('ass', this.x, this.y, this.matrixWidthHalf);
    this.mesh.position.set(this.x, this.y, 0);

    return this;
  }

  /**
   * Remove the specifid fgmState.matrices from the pile.
   *
   * @description
   * If any were the visible matrix, then make the remaining last element of the
   * pile visible. redraw the remaining labels at the correct positions.
   *
   * @param {array} fgmState.matrices - Array of fgmState.matrices.
   * @return {object} Self.
   */
  removeMatrices (matrices) {
    for (let i = 0; i < fgmState.matrices.length; i++) {
      let m = fgmState.matrices[i];
      for (let j = 0; j < this.pileMatrices.length; j++) {
        if (m === this.pileMatrices[j]) {
          this.pileMatrices.splice(j, 1);
          break;
        }
      }
    }

    this.calculateCoverMatrix();

    return this;
  }

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
  }

  /**
   * Set cover matrix.
   *
   * @param {??} mode - Mode.
   * @return {object} Self.
   */
  setCoverMatrixMode (mode) {
    this.coverMatrixMode = mode;

    return this;
  }

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
  }

  /**
   * Show or hide node labels.
   *
   * @param {boolean} showLabels - If `true` shows node labels.
   * @return {object} Self.
   */
  showLabels (showLabels) {
    this.showNodeLabels = showLabels;

    return this;
  }

  /**
   * Show single matrix
   *
   * @param {object} matrix - Matrix to be shown.
   * @return {object} Self.
   */
  showSingle (matrix) {
    this.singleMatrix = matrix;

    return this;
  }

  /**
   * Returns the number of fgmState.matrices in this pile.
   *
   * @return {number} Size of the pile.
   */
  size () {
    return this.pileMatrices.length;
  }

  /**
   * Frame requires update after matrix size has changed through filtering.
   *
   * @return {object} Self.
   */
  updateFrame () {
    this.matrixFrame = createRectFrame(
      this.matrixWidth, this.matrixWidth, 0xaaaaaa, 0.1
    );

    return this;
  }

  /**
   * Update hovered cell.
   *
   * @return {object} Self.
   */
  updateHoveredCell () {
    if (fgmState.hoveredCell) {
      this.mesh.add(this.cellFrame);
      const x = (
        -this.matrixWidthHalf +
        (fgmState.cellSize * fgmState.hoveredCell.col) +
        fgmState.cellSize_HALF
      );
      const y = (
        this.matrixWidthHalf -
        (fgmState.cellSize * fgmState.hoveredCell.row) -
        fgmState.cellSize_HALF
      );
      this.cellFrame.position.set(x, y, 1);
    } else if (this.mesh.children.indexOf(this.cellFrame) > -1) {
      this.mesh.remove(this.cellFrame);
    }

    return this;
  }

  /**
   * Update label.
   *
   * @param {boolean} b - If `true` update label.
   * @return {object} Self.
   */
  updateLabels (updateLabels) {
    if (updateLabels && fgmState.hoveredCell) {
      const x = (
        -this.matrixWidthHalf +
        (fgmState.cellSize * fgmState.hoveredCell.col) +
        fgmState.cellSize_HALF
      );
      const y = (
        this.matrixWidthHalf -
        (fgmState.cellSize * fgmState.overedCell.row) -
        fgmState.cellSize_HALF
      );

      let sCol = fgmState.nodes[fgmState.focusNodes[fgmState.hoveredCell.col]].name;
      let rCol = createRect(10 * sCol.length, 12, 0xffffff);

      rCol.position.set(
        x + (10 * sCol.length / 2) - 3,
        this.matrixWidthHalf + 10,
        2
      );

      this.mesh.add(rCol);
      let colLabel = createText(
        sCol,
        x,
        this.matrixWidthHalf + 5,
        2,
        9,
        0x000000
      );

      this.mesh.add(colLabel);

      let sRow = fgmState.nodes[fgmState.focusNodes[fgmState.hoveredCell.row]].name;
      let rRow = createRect(10 * sRow.length, 12, 0xffffff);

      rRow.position.set(
        this.matrixWidthHalf + 4 + (10 * sRow.length / 2),
        y + 4,
        2
      );

      this.mesh.add(rRow);

      let rowLabel = createText(
        sRow,
        +this.matrixWidthHalf + 5,
        y,
        2,
        9,
        0x000000
      );

      this.mesh.add(rowLabel);
    }

    return this;
  }
}
