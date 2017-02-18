// Aurelia
import { LogManager } from 'aurelia-framework';

import { stats } from 'science';

import {
  Box3, BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, TextGeometry
} from 'three';

import menuCommands from 'components/fragments/pile-menu-commands';

import {
  COLOR_LOW_QUALITY,
  MATRIX_GAP_HORIZONTAL,
  METRIC_DIST_DIAG,
  METRIC_NOISE,
  METRIC_SHARPNESS,
  METRIC_SIZE,
  MODE_DIFFERENCE,
  MODE_MEAN,
  MODE_TREND,
  MODE_VARIANCE,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES,
  Z_BASE,
  Z_MENU
} from 'components/fragments/fragments-defaults';

import {
  MENU_LABEL_SPACING,
  MENU_PADDING
} from 'components/fragments/pile-defaults';

import fgmState from 'components/fragments/fragments-state';

import {
  add2dSqrtBuffRect,
  addBufferedRect,
  cellValue,
  colorBlue,
  colorOrange,
  createRect,
  createRectFrame,
  createText,
  makeBuffer3f
} from 'components/fragments/fragments-utils';

import caps from 'utils/caps';

import COLORS from 'configs/colors';


const logger = LogManager.getLogger('pile');  // eslint-disable-line no-unused-vars


export default class Pile {
  constructor (id, scene, scale, dims) {
    this.cellFrame = createRectFrame(
      fgmState.cellSize, fgmState.cellSize, 0xff0000, 1
    );
    this.colored = false;
    this.coverMatrix = [];
    this.coverMatrixMode = MODE_MEAN;
    this.dims = dims;
    this.geometry = new BufferGeometry({ attributes: SHADER_ATTRIBUTES });
    this.highlighted = false;
    this.id = parseInt(id, 10);
    this.metrics = {};
    this.orderedLocally = false;
    this.pileMatrices = [];
    this.rank = this.id;
    this.render = true;
    this.scale = scale;
    this.scene = scene;
    this.showNodeLabels = false;
    this.x = 0;
    this.y = 0;

    fgmState.pilesIdx[this.id] = this;

    this.updateFrame();
  }

  /****************************** Getter / Setter *****************************/

  get matrixWidth () {
    return this.dims * fgmState.cellSize;
  }

  get matrixWidthHalf () {
    return this.matrixWidth / 2;
  }

  get isSingleMatrix () {
    const isSingleMatrix = this.pileMatrices.length === 1;

    if (isSingleMatrix && !this.singleMatrix) {
      this.singleMatrix = this.pileMatrices[0];
    }

    return isSingleMatrix;
  }

  /**
   * Returns the number of fgmState.matrices in this pile.
   *
   * @type {number}
   */
  get size () {
    return this.pileMatrices.length;
  }

  /**
   * Standard deviation
   *
   * @return {number}
   */
  get std () {
    return Math.sqrt(this.variance);
  }

  /**
   * Get the sample variance of the matrix
   *
   * @description
   * First the values across the x and y dimensions are aggregated. Next the
   * variance across `dims` number of bins is calculated. The aggregated value
   * of each bin is assumed to represent the relative number of counts.
   *
   * @return {number} Variance.
   */
  get variance () {
    const matrixAvg = this.average();

    // Get the sum
    const sum = matrixAvg.reduce(
      (a, b) => a + b.reduce((c, d) => c + d, 0), 0
    );

    let middle = (this.dims - 1) / 2;

    if (!this.dims % 2) {
      middle = (this.dims - 2) / 2;
    }

    let variance = 0;

    matrixAvg.forEach((row, i) => {
      row.forEach((cell, j) => {
        const distanceSquared = (
          ((i - middle) ** 2) +
          ((j - middle) ** 2)
        );

        variance += distanceSquared * cell;
      });
    });

    return variance / (sum || 1);
  }


  /********************************** Methods *********************************/

  /**
   * Calculates the average of the matrices.
   *
   * @description
   * By default the harmonic mean is used.
   *
   * @return {array} 2D matrix
   */
  average () {
    const avg = new Array(this.dims).fill(new Float32Array(this.dims));

    for (let i = 0; i < this.dims; i++) {
      for (let j = 0; j < this.dims; j++) {
        this.pileMatrices
          .map(pile => pile.matrix)
          .forEach((matrix) => {
            if (matrix[i][j] > 0) {
              avg[i][j] += 1 / matrix[i][j];
            }
          });

        avg[i][j] = this.dims / avg[i][j];
      }
    }

    return avg;
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

    return this;
  }

  /**
   * Calculate global matrix.
   *
   * @return {object} Self.
   */
  calculateCoverMatrix () {
    // Create empty this.dims x this.dims matrix
    this.coverMatrix = new Array(this.dims).fill(new Float32Array(this.dims));

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
   * Calculates pile metrics.
   *
   * @param {array} metrics - List of metric IDs
   * @param {boolean} force - If `true` re-caclulate metrics.
   */
  calculateMetrics (metrics, force) {
    metrics.forEach((metric) => {
      try {
        this[`calculateMetric${caps(metric)}`](force);
      } catch (e) {
        logger.error(`Metric (${metric}) is unknown`);
      }
    });
  }

  /**
   * Calculates the distance to diagonal.
   *
   * @param {boolean} force - If `true` re-caclulate metric.
   */
  calculateMetricDistToDiag (force) {
    if (typeof this.metrics[METRIC_DIST_DIAG] === 'undefined' || force) {
      let size = 0;

      this.pileMatrices.forEach((matrix) => {
        size += Math.abs(matrix.locus.xEnd - matrix.locus.yStart);
      });

      this.metrics[METRIC_DIST_DIAG] = size / this.pileMatrices.length;
    }
  }

  /**
   * Calculates the noise level.
   *
   * @param {boolean} force - If `true` re-caclulate metric.
   */
  calculateMetricNoise (force) {
    if (typeof this.metrics[METRIC_NOISE] === 'undefined' || force) {
      this.metrics[METRIC_NOISE] = this.std;
    }
  }

  /**
   * Calculates the sharpness.
   *
   * @param {boolean} force - If `true` re-caclulate metric.
   */
  calculateMetricSharpness (force) {
    if (typeof this.metrics[METRIC_SHARPNESS] === 'undefined' || force) {
      this.metrics[METRIC_SHARPNESS] = this.variance;
    }
  }

  /**
   * Calculates the size.
   *
   * @param {boolean} force - If `true` re-caclulate metric.
   */
  calculateMetricSize (force) {
    if (typeof this.metrics[METRIC_SIZE] === 'undefined' || force) {
      let size = 0;

      this.pileMatrices.forEach((matrix) => {
        size += (matrix.locus.xEnd - matrix.locus.xStart) *
          (matrix.locus.yEnd - matrix.locus.yStart);
      });

      this.metrics[METRIC_SIZE] = size / this.pileMatrices.length;
    }
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
   */
  destroy () {
    fgmState.pileMeshes.splice(fgmState.pileMeshes.indexOf(this.mesh), 1);
    this.geometry.dispose();
    fgmState.scene.remove(this.mesh);
    this.render = false;
    this.pileMatrices = [];
    fgmState.piles.splice(fgmState.piles.indexOf(this), 1);
    fgmState.pilesIdx[this.id] = undefined;
  }

  /**
   * Contains all the drawing routines.
   *
   * @return {object} Self.
   */
  draw () {
    const vertexPositions = [];
    const vertexColors = [];

    // UPDATE COVER MATRIX CELLS + PILE PREVIEWS
    if (this.mesh) {
      fgmState.pileMeshes.splice(fgmState.pileMeshes.indexOf(this.mesh), 1);
      fgmState.scene.remove(this.mesh);
    }

    this.geometry = new BufferGeometry({
      attributes: SHADER_ATTRIBUTES
    });

    if (this.isSingleMatrix) {
      this.drawSingleMatrix(
        this.singleMatrix.matrix,
        vertexPositions,
        vertexColors
      );
    } else {
      this.drawMultipleMatrices(vertexPositions, vertexColors);
    }

    // Draw previews
    if (this.pileMatrices.length > 1) {
      this.drawPreviews(vertexPositions, vertexColors);
    }

    // Draw gap
    this.drawGap(vertexPositions, vertexColors);

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
      this.drawMenu();
    }

    // Draw pile labels
    this.drawPileLabel();

    // Add frame
    this.mesh.add(this.matrixFrame);
    this.matrixFrame.position.set(-1, -1, Z_BASE);

    this.mesh.pile = this;
    fgmState.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, Z_BASE);
    fgmState.scene.add(this.mesh);
  }

  /**
   * Draw difference cover matrix.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} numMatrices - Number of matrices.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} i - I matrix index.
   * @param {number} j - J matrix index.
   */
  drawCoverDifference (positions, colors, numMatrices, x, y, i, j) {
    let value = (
      this.coverMatrix[i][j] -
      fgmState.piles[fgmState.piles.indexOf(this) - 1].coverMatrix[i][j]
    );

    let valueInv = 1 - Math.abs(value);
    let color = [1, valueInv, valueInv];

    if (value > 0) {
      color = [valueInv, valueInv, 1];
    }

    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      fgmState.cellSize,
      colors,
      color
    );
  }

  /**
   * Draw mean cover matrix.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} numMatrices - Number of matrices.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} i - I matrix index.
   * @param {number} j - J matrix index.
   */
  drawCoverMean (positions, colors, numMatrices, x, y, i, j) {
    let value = 0;

    this.pileMatrices.forEach((pileMatrix) => {
      // Make sure we're not subtracting low quality bins, which have a value
      // of `-1`.
      if (pileMatrix.matrix[i][j] > 0) {
        value += pileMatrix.matrix[i][j];
      }
    });

    value /= numMatrices;

    const valueInv = 1 - cellValue(value);

    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      fgmState.cellSize,
      colors,
      [valueInv, valueInv, valueInv]
    );
  }

  /**
   * Draw trend cover matrix.
   *
   * @description
   * Not sure what this means right now
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} numMatrices - Number of matrices.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} i - I matrix index.
   * @param {number} j - J matrix index.
   */
  drawCoverTrend (positions, colors, numMatrices, x, y, i, j) {
    const value = (
      this.pileMatrices[this.pileMatrices.length - 1].matrix[i][j] -
      this.pileMatrices[0].matrix[i][j]
    );
    const valueInv = 1 - Math.abs(value);

    let color = colorOrange(valueInv);

    if (value > 0) {
      color = colorBlue(valueInv);
    }

    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      fgmState.cellSize,
      colors,
      color
    );
  }

  /**
   * Draw the variance using the standard variation across matrices.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} numMatrices - Number of matrices.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} i - I matrix index.
   * @param {number} j - J matrix index.
   */
  drawCoverVariance (positions, colors, numMatrices, x, y, i, j) {
    const values = [];

    this.pileMatrices.forEach((pileMatrix) => {
      values.push(pileMatrix.matrix[i][j]);
    });

    // standard deviation = varianz^2
    const value = 1 - cellValue(Math.sqrt(stats.variance(values)));

    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      fgmState.cellSize,
      colors,
      colorOrange(value)
    );
  }

  /**
   * Draw gap between matrices.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawGap (positions, colors) {
    // Needs refactoring
    let valueInv = [1, 1, 1];

    // if (fgmState.hoveredGapPile && fgmState.hoveredGapPile === this) {
    //   valueInv = [1, 0.7, 0.7];
    // }

    addBufferedRect(
      positions,
      this.matrixWidthHalf + (MATRIX_GAP_HORIZONTAL / 2),
      0,
      -1,
      MATRIX_GAP_HORIZONTAL,
      this.matrixWidth,
      colors,
      valueInv
    );
  }

  /**
   * Draw multiple matrices.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawMultipleMatrices (positions, colors) {
    const numMatrices = this.pileMatrices.length;

    // Show cover matrix
    for (let i = 0; i < this.dims; i++) {
      let x = (
        -this.matrixWidthHalf +
        (fgmState.cellSize / 2) +
        (i * fgmState.cellSize)
      );

      for (let j = 0; j < this.dims; j++) {
        let y = (
          this.matrixWidthHalf -
          (fgmState.cellSize / 2) -
          (j * fgmState.cellSize)
        );

        switch (this.coverMatrixMode) {
          case MODE_DIFFERENCE:
            this.drawCoverDifference(positions, colors, numMatrices, x, y, i, j);
            break;
          case MODE_TREND:
            this.drawCoverTrend(positions, colors, numMatrices, x, y, i, j);
            break;
          case MODE_VARIANCE:
            this.drawCoverVariance(positions, colors, numMatrices, x, y, i, j);
            break;
          default:
            this.drawCoverMean(positions, colors, numMatrices, x, y, i, j);
            break;
        }
      }
    }
  }

  /**
   * Draw pile menu
   */
  drawMenu () {
    let maxWidth = 0;
    let labels = [];

    // Frist create labels
    menuCommands
      .filter(command => !command.stackedPileOnly || this.pileMatrices.length > 1)
      .forEach((command) => {
        command.pile = this;

        const textGeom = new TextGeometry(
          command.name.toUpperCase(),
          {
            size: 8,
            height: 1,
            curveSegments: 5,
            font: fgmState.font,
            weight: 'bold',
            bevelEnabled: false
          }
        );

        const textMaterial = new MeshBasicMaterial({ color: command.color });
        const label = new Mesh(textGeom, textMaterial);

        // Get label with
        const labelBBox = new Box3().setFromObject(label).getSize();
        const labelWidth = Math.ceil(
          labelBBox.x + MENU_LABEL_SPACING
        );
        const labelHeight = Math.ceil(
          labelBBox.y + MENU_LABEL_SPACING
        );

        const rect = createRect(
          labelWidth, labelHeight, command.background
        );

        const frame = createRectFrame(
          labelWidth, labelHeight, COLORS.BLACK, 5
        );

        rect.add(frame);
        rect.add(label);
        rect.pileTool = command;
        rect.scale.set(1 / this.scale, 1 / this.scale, 0.9);

        labels.push({
          label,
          width: labelWidth,
          height: labelHeight,
          rect,
          frame,
          marginTop: command.marginTop
        });

        maxWidth = Math.max(maxWidth, labelWidth);
      });

    let marginTop = 0;

    // Next create the rectangle and position the buttons
    labels.forEach((label, index) => {
      let x = this.x + MENU_PADDING - this.matrixWidthHalf - (label.width / 2);

      if (x < 0) {
        x = this.x + this.matrixWidthHalf - MENU_PADDING + (label.width / 2);
      }

      if (typeof label.marginTop !== 'undefined') {
        marginTop += label.marginTop;
      }

      label.rect.position.set(
        x,
        (
          this.y -
          MENU_PADDING +
          this.matrixWidthHalf -
          (label.height / 2) -
          (index * (label.height + 1)) -
          marginTop
        ),
        Z_MENU
      );

      label.label.position.set(
        -(label.width / 2) + 2, -4, 1
      );

      fgmState.visiblePileTools.push(label.rect);
      fgmState.scene.add(label.rect);
    });
  }

  /**
   * Draw pile label.
   */
  drawPileLabel () {
    let labelText;

    if (this.pileMatrices.length === 1) {
      labelText = this.id + 1;
    }

    if (this.pileMatrices.length > 1) {
      labelText = `${(
        fgmState.matrices.indexOf(this.pileMatrices[0]) + 1
      )} (${this.pileMatrices.length})`;

      if (this.singleMatrix) {
        labelText += `: ${this.singleMatrix.id + 1}`;
      }
    }

    const label = createText(
      labelText,
      -this.matrixWidthHalf - 2,
      -this.matrixWidthHalf - 13,
      0,
      8,
      COLORS.GRAY
    );

    label.scale.set(1 / this.scale, 1 / this.scale, 1 / this.scale);

    this.mesh.add(label);
  }

  /**
   * Draw pile matrix previews.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawPreviews (positions, colors) {
    this.pileMatrices.forEach((pileMatrix, index) => {
      let y = this.matrixWidthHalf + (PREVIEW_SIZE * (index + 1));

      for (let i = 0; i < this.dims; i++) {
        let value = 0;

        for (let j = 0; j < this.dims; j++) {
          value += pileMatrix.matrix[i][j];
        }

        let valueInv = 1 - cellValue(value / this.dims);

        let x = (
          -this.matrixWidthHalf +
          (fgmState.cellSize * i) +
          (fgmState.cellSize / 2)
        );

        // White border, i.e., spacing
        addBufferedRect(
          positions,
          x,
          y,
          0.5,
          fgmState.cellSize,
          PREVIEW_SIZE,
          colors,
          [1, 1, 1]
        );

        // The actual preview
        addBufferedRect(
          positions,
          x,
          y,
          0.5,
          fgmState.cellSize,
          PREVIEW_SIZE - 0.3,
          colors,
          [valueInv, valueInv, valueInv]
        );
      }
    });
  }

  /**
   * Draw a single matrix
   *
   * @param {array} matrix - Matrix to be drawn.
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawSingleMatrix (matrix, positions, colors) {
    for (let i = 0; i < this.dims; i++) {
      let x = (
        -this.matrixWidthHalf +
        (fgmState.cellSize / 2) +
        (i * fgmState.cellSize)
      );

      for (let j = 0; j < this.dims; j++) {
        let y = (
          this.matrixWidthHalf -
          (fgmState.cellSize / 2) -
          (j * fgmState.cellSize)
        );

        add2dSqrtBuffRect(
          positions,
          -y,
          -x,
          fgmState.cellSize,
          colors,
          this.getGrayTone(
            cellValue(matrix[i][j]),
            fgmState.showSpecialCells
          )
        );
      }
    }
  }

  /**
   * Elevate mesh.
   *
   * @param {number} z - Level.
   * @return {object} Self.
   */
  elevateTo (z) {
    this.mesh.position.set(this.x, this.y, z);

    return this;
  }

  /**
   * Get gray tone color from value
   *
   * @param {number} value - Valuer of the cell.
   * @param {boolean} showSpecialCells - If `true` return white for special
   *   values (e.g., low quality) instead of a color.
   * @return {array} Relative RGB array
   */
  getGrayTone (value, showSpecialCells) {
    switch (value) {
      case -1:
        if (showSpecialCells) {
          return COLOR_LOW_QUALITY;
        }

        return [1, 1, 1];

      default:
        return [1 - value, 1 - value, 1 - value];
    }
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
   * @param {boolean} abs - If `true` consider `x` and `y` as absolute
   *   positions.
   * @return {object} Self.
   */
  moveTo (x, y, abs = false) {
    this.x = x;
    this.y = y;

    if (!abs) {
      this.x += this.matrixWidthHalf;
      this.y = -this.y - this.matrixWidthHalf;
    }

    this.mesh.position.set(this.x, this.y, this.mesh.position.z);

    return this;
  }

  /**
   * Remove the specifid fgmState.matrices from the pile.
   *
   * @description
   * If any were the visible matrix, then make the remaining last element of the
   * pile visible. redraw the remaining labels at the correct positions.
   *
   * @param {array} matrices - Array of matrices.
   * @return {object} Self.
   */
  removeMatrices (matrices) {
    matrices.forEach((matrix) => {
      for (let i = this.pileMatrices.length; i > 0; --i) {
        if (matrix === this.pileMatrices[i]) {
          this.pileMatrices.splice(i, 1);
        }
      }
    });

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
   * @param {number} mode - Cover display mode number.
   * @return {object} Self.
   */
  setCoverMatrixMode (mode) {
    this.coverMatrixMode = mode;

    return this;
  }

  /**
   * Set matrices associated to this pile.
   *
   * @param {array} matrices - Array of fgmState.matrices.
   * @return {object} Self.
   */
  setMatrices (matrices) {
    this.pileMatrices = matrices;
    matrices.forEach((matrix) => { matrix.pile = this; });

    this.calculateCoverMatrix();

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
   * @param {boolean} updateLabels - If `true` update label.
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
