// Aurelia
import { LogManager } from 'aurelia-framework';

// Third party
import { queue, text } from 'd3';
import {
  ArrowHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  Vector3
} from 'three';

import {
  MATRIX_FRAME_THICKNESS,
  MATRIX_FRAME_THICKNESS_MAX,
  MODE_MAD,
  MODE_MEAN,
  MODE_STD,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES,
  Z_BASE,
  Z_PILE_MAX
} from 'components/fragments/fragments-defaults';

import pileColors from 'components/fragments/pile-colors';

import {
  COLOR_INDICATOR_HEIGHT,
  LABEL_MIN_CELL_SIZE,
  PREVIEW_LOW_QUAL_THRESHOLD,
  PREVIEW_NUM_CLUSTERS,
  STRAND_ARROW_LENGTH,
  STRAND_ARROW_HEAD_LENGTH,
  STRAND_ARROW_HEAD_WIDTH
} from 'components/fragments/pile-defaults';

import fgmState from 'components/fragments/fragments-state';

import {
  add2dSqrtBuffRect,
  addBufferedRect,
  cellValue,
  createLineFrame,
  createRect,
  createRectFrame,
  createText,
  frameValue,
  makeBuffer3f
} from 'components/fragments/fragments-utils';

import arraysEqual from 'utils/arrays-equal';

import Matrix from 'components/fragments/matrix';

import COLORS from 'configs/colors';


const logger = LogManager.getLogger('pile');


export default class Pile {
  constructor (id, scene, scale, dims, maxNumPiles) {
    this.avgMatrix = new Float32Array(dims ** 2);
    this.cellFrame = createRectFrame(
      this.cellSize, this.cellSize, 0xff0000, 1
    );
    this.clustersAvgMatrices = [];
    this.color = pileColors.gray;
    this.colored = false;
    this.colorIndicator = {};
    this.coverMatrix = [];
    this.coverMatrixMode = MODE_MEAN;
    this.dims = dims;
    this.geometry = new BufferGeometry({ attributes: SHADER_ATTRIBUTES });
    this.highlighted = false;
    this.id = id;
    this.idNumeric = parseInt(`${id}`.replace('_', ''), 10);
    this.isDrawn = false;
    this.isTrashed = false;
    this.matrixFrameThickness = MATRIX_FRAME_THICKNESS;
    this.matrixFrameColor = COLORS.GRAY_LIGHT;
    this.measures = {};
    this.orderedLocally = false;
    this.pileMatrices = [];
    this.previewsHeight = 0;
    this.rank = this.id;
    this.scale = 1;
    this.scene = scene;
    this.showNodeLabels = false;
    this.x = 0;
    this.y = 0;
    this.zBase = Z_BASE + ((Z_PILE_MAX - Z_BASE) * this.idNumeric / maxNumPiles);
    this.availableZHeight = ((Z_PILE_MAX - Z_BASE) * 1 / maxNumPiles);
    this.z = this.zBase;

    // Matrix & Preview, Preview Background, MatrixFrame, MatrixHighlightFrame,
    // Outline
    this.layers = 5;
    this.zLayerHeight = this.availableZHeight / this.layers;

    this.pilesIdxState[this.id] = this;

    this.frameCreate();
  }

  /****************************** Getter / Setter *****************************/

  get cellSize () {
    return (
      fgmState.cellSize *
      (fgmState.trashIsActive ? 1 : fgmState.scale) *
      this.scale
    );
  }

  get isLayout1d () {
    return !fgmState.isLayout2d && !fgmState.isLayoutMd;
  }

  get matrixWidth () {
    return this.dims * this.cellSize;
  }

  get matrixWidthHalf () {
    return this.matrixWidth / 2;
  }

  get piles () {
    return this.isTrashed ? fgmState.pilesTrash : this.pilesState;
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
    return this.isTrashed ? fgmState.pileMeshesTrash : fgmState.pileMeshes;
  }

  get previewSize () {
    return this.cellSize * (this.cellSize > 2 ? 1 : PREVIEW_SIZE);
  }

  get previewSpacing () {
    return this.cellSize > 2 ? 1 : 0.25;
  }

  get singleMatrix () {
    if (this._singleMatrix) {
      return this._singleMatrix;
    }

    if (this.pileMatrices.length === 1) {
      return this.pileMatrices[0];
    }

    return undefined;
  }

  /**
   * Returns the number of fgmState.matrices in this pile.
   *
   * @type {number}
   */
  get size () {
    return this.pileMatrices.length;
  }

  get strandArrowRects () {
    return this.isTrashed ?
      fgmState.strandArrowRectsTrash : fgmState.strandArrowRects;
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

    this.assessMeasures();
    this.frameUpdate(fgmState.matrixFrameEncoding);
    this.calculateAvgMatrix(this.pileMatrices, this.avgMatrix);
    this.calculateCoverMatrix();
    this.matrixClusters = this.calculateKMeansCluster();

    return this.matrixClusters;
  }

  /**
   * Assess the average measure.
   */
  assessMeasures () {
    const numMatrices = this.pileMatrices.length;

    fgmState.measures.map(measure => measure.id).forEach((measureId) => {
      try {
        this.measures[measureId] = this.pileMatrices
          .map(matrix => matrix.measures[measureId])
          .reduce((acc, value) => acc + value, 0) / numMatrices;
      } catch (e) {
        logger.error(`Measure (${measureId}) is unknown`);
      }
    });
  }

  /**
   * Calculate a-per pile average matrix.
   *
   * @param {array} matrices - Matrices to be flattened.
   * @return {array} Flat Float32 average matrix.
   */
  calculateAvgMatrix (matrices = this.pileMatrices, avgMatrix) {
    if (!avgMatrix) {
      avgMatrix = new Float32Array(this.dims ** 2);
    }

    const numMatrices = matrices.length;

    if (numMatrices > 1) {
      for (let i = 0; i < this.dims; i++) {
        for (let j = 0; j < this.dims; j++) {
          this.calculateCellMean(
            avgMatrix,
            matrices,
            i,
            j,
            numMatrices,
            true
          );
        }
      }
    } else {
      // Copy first pile matrix
      Matrix.flatten(matrices[0].matrix).forEach((cell, index) => {
        avgMatrix[index] = cell;
      });
    }

    return avgMatrix;
  }

  /**
   * Calculate cell mean absolute difference.
   *
   * @param {array} targetMatrix - Target matrix.
   * @param {array} sourceMatrices - Source matrices used for calclation.
   * @param {array} i - Index i.
   * @param {array} j - Index j.
   */
  calculateCellMad (targetMatrix, sourceMatrices, i, j, numMatrices) {
    const flatIdx = (i * this.dims) + j;
    const mean = sourceMatrices
      .map(matrix => Math.max(matrix[flatIdx], 0))
      .reduce((a, b) => a + b, 0) / sourceMatrices.length;

    targetMatrix[i][j] = sourceMatrices
      .map(matrix => Math.max(matrix[flatIdx], 0))
      .reduce((a, b) => a + Math.abs(b - mean), 0) / sourceMatrices.length;
  }

  /**
   * Calculate cell mean.
   *
   * @param {array} targetMatrix - Flat Target matrix.
   * @param {array} sourceMatrices - Source matrices used for calclation.
   * @param {array} i - Index i.
   * @param {array} j - Index j.
   * @param {boolean} flat - If `true` the target matrix is flat.
   */
  calculateCellMean (targetMatrix, sourceMatrices, i, j, numMatrices, flat) {
    let lowQualCounter = 0;

    let avg = (sourceMatrices
      .map(matrix => matrix.matrix[i][j])
      .reduce((acc, value) => {
        if (value < 0) { lowQualCounter += 1; }
        return acc + value;
      }, 0) + lowQualCounter) / numMatrices;

    if (lowQualCounter === numMatrices) {
      // We keep the low quality info in case all cells are of low quality
      avg = -1;
    }

    if (flat) {
      targetMatrix[(i * this.dims) + j] = avg;
    } else {
      targetMatrix[i][j] = avg;
    }
  }

  /**
   * Calculate cell standard deviation.
   *
   * @param {array} targetMatrix - Target matrix.
   * @param {array} sourceMatrices - Source matrices used for calclation.
   * @param {array} i - Index i.
   * @param {array} j - Index j.
   */
  calculateCellStd (targetMatrix, sourceMatrices, i, j) {
    const flatIdx = (i * this.dims) + j;
    const mean = sourceMatrices
      .map(matrix => Math.max(matrix[flatIdx], 0))
      .reduce((a, b) => a + b, 0) / sourceMatrices.length;

    targetMatrix[i][j] = Math.sqrt(sourceMatrices
      .map(matrix => Math.max(matrix[flatIdx], 0))
      .reduce(
        (a, b) => a + ((b - mean) ** 2), 0) / (sourceMatrices.length - 1)
      );
  }

  /**
   * Calculate global matrix.
   *
   * @return {object} Self.
   */
  calculateCoverMatrix () {
    const numMatrices = this.pileMatrices.length;

    this.coverMatrix = new Array(this.dims).fill(undefined);

    if (numMatrices > 1) {
      // Create empty this.dims x this.dims matrix
      this.coverMatrix = this.coverMatrix
        .map(row => new Float32Array(this.dims));

      if (
        this.coverMatrixMode === MODE_MAD ||
        this.coverMatrixMode === MODE_STD
      ) {
        for (let i = 0; i < this.dims; i++) {
          for (let j = 0; j < this.dims; j++) {
            switch (this.coverMatrixMode) {
              case MODE_MAD:
                this.calculateCellMad(
                  this.coverMatrix,
                  this.clustersAvgMatrices,
                  i,
                  j,
                  numMatrices
                );
                break;

              case MODE_STD:
                this.calculateCellStd(
                  this.coverMatrix,
                  this.clustersAvgMatrices,
                  i,
                  j,
                  numMatrices
                );
                break;

              default:
                // Nothing
                break;
            }
          }
        }
      } else {
        // Copy the average matrix from `this.avgMatrix`.
        for (let i = 0; i < this.dims; i++) {
          this.coverMatrix[i] = this.avgMatrix.slice(
            i * this.dims, (i + 1) * this.dims
          );
        }
      }
    } else {
      // Copy first pile matrix
      this.pileMatrices[0].matrix.forEach((row, index) => {
        this.coverMatrix[index] = row.slice();
      });
    }

    return this;
  }

  convertPileMatrixToMatrix (pileMatrix) {
    const matrix = Matrix.flatten(pileMatrix.matrix);
    matrix.id = pileMatrix.id;

    return matrix;
  }

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
   * Calculate K-means of matrices on the piles.
   *
   * @description
   * The clusters are non-deterministic and depend on a random start point.
   * This can optimized in the future by calculating the centroids in a
   * deterministic fashion.
   */
  calculateKMeansCluster () {
    return new Promise((resolve, reject) => {
      if (this.pileMatrices.length <= PREVIEW_NUM_CLUSTERS) {
        this.isMatricesClustered = false;
        this.clustersAvgMatrices = this.pileMatrices.map(
          pileMatrix => Matrix.flatten(pileMatrix.matrix)
        );
        resolve();
      }

      const pileMatrices = this.pileMatrices.map(
        pileMatrix => this.convertPileMatrixToMatrix(pileMatrix)
      );

      this.createWorkerClusterfck()
        .then((worker) => {
          worker.onmessage = (event) => {
            if (event.data.error) {
              logger.error('K-means clustering failed');
              reject(Error(event.data.error));
            }

            this.clusters = event.data.clusters;

            this.clustersAvgMatrices = this.clusters.map(
              cluster => this.calculateAvgMatrix(
                cluster.map(
                  matrixId => fgmState.matricesIdx[matrixId]
                )
              )
            );

            this.isMatricesClustered = true;
            resolve(this.clustersAvgMatrices);
            worker.terminate();
          };

          worker.postMessage({
            numClusters: PREVIEW_NUM_CLUSTERS,
            data: pileMatrices
          });
        })
        .catch((error) => {
          this.isMatricesClustered = false;
          logger.error('K-means clustering failed', error);
          this.clustersAvgMatrices = this.pileMatrices.map(
            pileMatrix => Matrix.flatten(pileMatrix.matrix)
          );
          resolve();
        });
    });
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
   * @param {boolean} noSplicing - If `true` pile is not spliced out of the
   *   piles array. This is useful when batch deleting with `forEach`.
   */
  destroy (noSplicing) {
    this.unsetHoverState();

    const meshIndex = this.pileMeshes.indexOf(this.mesh);

    if (meshIndex >= 0) {
      this.pileMeshes.splice(this.pileMeshes.indexOf(this.mesh), 1);
    }

    this.geometry.dispose();
    fgmState.scene.remove(this.mesh);
    this.isDrawn = false;
    this.pileMatrices = [];


    if (!noSplicing) {
      const pileIndex = this.piles.indexOf(this);

      if (pileIndex >= 0) {
        this.piles.splice(this.piles.indexOf(this), 1);
      }
    }

    this.pilesIdxState[this.id] = undefined;
    delete this.pilesIdxState[this.id];
  }

  /**
   * Contains all the drawing routines.
   *
   * @return {object} Self.
   */
  draw () {
    const positions = [];
    const colors = [];
    const isHovering = this === fgmState.hoveredPile;

    this.isColored = this.pileMatrices.some(matrix => matrix.color);

    // UPDATE COVER MATRIX CELLS + PILE PREVIEWS
    if (this.mesh) {
      this.pileMeshes.splice(this.pileMeshes.indexOf(this.mesh), 1);
      fgmState.scene.remove(this.mesh);
    }

    this.geometry = new BufferGeometry({
      attributes: SHADER_ATTRIBUTES
    });

    if (this.singleMatrix) {
      this.drawSingleMatrix(
        this.singleMatrix.matrix,
        positions,
        colors
      );
    } else {
      this.drawMultipleMatrices(positions, colors);
    }

    if (this.pileMatrices.length > 1) {
      this.drawPreviews(positions, colors);
      this.updatePileOutline();
    }

    // CREATE + ADD MESH
    this.geometry.addAttribute(
      'position',
      new BufferAttribute(makeBuffer3f(positions), 3)
    );

    this.geometry.addAttribute(
      'customColor',
      new BufferAttribute(makeBuffer3f(colors), 3)
    );

    this.mesh = new Mesh(this.geometry, fgmState.shaderMaterial);

    if (
      !(fgmState.isHilbertCurve) &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd) &&
      !(this.cellSize < LABEL_MIN_CELL_SIZE)
    ) {
      this.drawPileLabel(isHovering);
    }

    // Add frames
    this.mesh.add(this.pileOutline);
    this.pileOutline.position.set(
      0, this.previewsHeight / 2, this.zLayerHeight
    );
    this.mesh.add(this.matrixFrameHighlight);
    this.matrixFrameHighlight.position.set(
      0, 0, this.zLayerHeight * 2
    );
    this.mesh.add(this.matrixFrame);
    this.matrixFrame.position.set(
      0, 0, this.zLayerHeight * 3
    );

    this.mesh.pile = this;
    this.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, this.z);
    fgmState.scene.add(this.mesh);

    if (
      !fgmState.isHilbertCurve &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd)
    ) {
      this.drawStrandArrows(isHovering);
    }

    this.drawColorIndicator();

    this.isDrawn = true;

    return this;
  }

  /**
   * Draw color indicator bars.
   */
  drawColorIndicator () {
    const colorsUsed = this.pileMatrices.reduce((colors, matrix) => {
      if (matrix.color) {
        colors[matrix.color] = true;
      }

      return colors;
    }, {});
    const numColors = Object.keys(colorsUsed).length;

    if (!numColors) {
      return;
    }

    const width = this.matrixWidth / numColors;

    const height = COLOR_INDICATOR_HEIGHT * (this.isLayout1d ? 1 : 0.5);

    Object.keys(colorsUsed).forEach((color, index) => {
      this.colorIndicator[color] = createRect(
        width, height, COLORS[color.toUpperCase()]
      );

      this.colorIndicator[color].position.set(
        (index * width) - ((numColors - 1) * width / 2),
        -this.matrixWidthHalf - 2 - (this.matrixFrameThickness / 2),
        1
      );

      this.mesh.add(this.colorIndicator[color]);
    });
  }

  /**
   * Draw mean average deviation cover matrix.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} value - Cover matrix value.
   */
  drawCoverMad (positions, colors, x, y, value) {
    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      this.zLayerHeight * 4,
      this.cellSize,
      colors,
      pileColors.orange(1 - value)
    );
  }

  /**
   * Draw mean cover matrix.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} value - Cover matrix value.
   */
  drawCoverMean (positions, colors, x, y, value) {
    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      this.zLayerHeight * 4,
      this.cellSize,
      colors,
      this.getColor(
        value,
        fgmState.showSpecialCells
      )
    );
  }

  /**
   * Draw standard variation cover matrix.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} value - Cover matrix value.
   */
  drawCoverStd (positions, colors, x, y, value) {
    add2dSqrtBuffRect(
      positions,
      -y,
      -x,
      this.zLayerHeight * 4,
      this.cellSize,
      colors,
      pileColors.orange(1 - value)
    );
  }

  /**
   * Draw multiple matrices.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawMultipleMatrices (positions, colors) {
    // Show cover matrix
    for (let i = 0; i < this.dims; i++) {
      let x = (
        -this.matrixWidthHalf +
        (this.cellSize / 2) +
        (i * this.cellSize)
      );

      for (let j = 0; j < this.dims; j++) {
        let y = (
          this.matrixWidthHalf -
          (this.cellSize / 2) -
          (j * this.cellSize)
        );

        const value = this.coverMatrix[i][j];

        switch (this.coverMatrixMode) {
          case MODE_MAD:
            this.drawCoverMad(positions, colors, x, y, value);
            break;
          case MODE_STD:
            this.drawCoverStd(positions, colors, x, y, value);
            break;
          default:
            this.drawCoverMean(positions, colors, x, y, value);
            break;
        }
      }
    }
  }

  /**
   * Draw pile label.
   *
   * @param {array} isHovering - If `true` user is currently hovering this pile.
   */
  drawPileLabel (isHovering) {
    const numPiles = this.pileMatrices.length;
    const idReadible = this.idNumeric + 1;
    const scale = 1 / this.scale;
    let labelText;

    if (numPiles === 1) {
      labelText = idReadible;
    } else {
      labelText = `${idReadible} (${numPiles})`;
    }

    const extraOffset = this.isColored ? COLOR_INDICATOR_HEIGHT + 2 : 0;

    if (this.labelText !== labelText) {
      this.labelText = labelText;

      this.label = createText(
        this.labelText,
        -this.matrixWidthHalf - 2,
        -this.matrixWidthHalf - 13 - extraOffset,
        0,
        8,
        isHovering ? COLORS.GRAY_DARK : COLORS.GRAY_LIGHT
      );
    } else {
      this.label.material.color.setHex(
        isHovering ? COLORS.GRAY_DARK : COLORS.GRAY_LIGHT
      );
      this.label.position.set(
        -this.matrixWidthHalf - 2,
        -this.matrixWidthHalf - 13 - extraOffset,
        0
      );
    }

    this.label.scale.set(scale, scale, scale);
    this.mesh.add(this.label);
  }

  /**
   * Draw pile matrix previews.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawPreviews (positions, colors) {
    const numPrevies = Math.min(PREVIEW_NUM_CLUSTERS, this.pileMatrices.length);

    this.previewsHeight = this.previewSize * numPrevies;

    // Background
    addBufferedRect(
      positions,
      0,
      this.matrixWidthHalf + (this.previewsHeight / 2),
      0,
      this.matrixWidth,
      this.previewsHeight,
      colors,
      [1, 1, 1]
    );

    // Create preview
    // this.previewHeightIndicator = createRect(
    //   this.matrixWidth,
    //   this.previewSize * this.pileMatrices.length,
    //   COLORS.GREEN
    // );

    // this.previewHeightIndicator.position.set(
    //   this.x,
    //   this.y - ((this.previewSize * this.pileMatrices.length) / 2),
    //   9
    // );

    this.clustersAvgMatrices.forEach((matrix, index) => {
      let y = this.matrixWidthHalf + (this.previewSize * (index + 0.75));

      for (let i = 0; i < this.dims; i++) {
        let value = 0;

        for (let j = 0; j < this.dims; j++) {
          value += matrix[(j * this.dims) + i];
        }

        if (value < -this.dims * PREVIEW_LOW_QUAL_THRESHOLD) {
          value = -1;
        } else {
          value = cellValue(value / this.dims);
        }

        let x = (
          -this.matrixWidthHalf +
          (this.cellSize * i) +
          (this.cellSize / 2)
        );

        // The actual preview
        addBufferedRect(
          positions,
          x,
          y,
          this.zLayerHeight, // z
          this.cellSize,  // width
          this.previewSize - this.previewSpacing,  // height
          colors,
          this.getColor(value, fgmState.showSpecialCells)
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
        (this.cellSize / 2) +
        (i * this.cellSize)
      );

      for (let j = 0; j < this.dims; j++) {
        let y = (
          this.matrixWidthHalf -
          (this.cellSize / 2) -
          (j * this.cellSize)
        );

        add2dSqrtBuffRect(
          positions,
          -y,
          -x,
          this.zLayerHeight * 4,
          this.cellSize,
          colors,
          this.getColor(
            cellValue(matrix[i][j]),
            fgmState.showSpecialCells
          )
        );
      }
    }
  }

  /**
   * Draw strand arrows for both axis.
   *
   * @param {array} isHovering - If `true` user is currently hovering this pile.
   */
  drawStrandArrows (isHovering) {
    const offsetX = this.pileMatrices[0].orientationX === -1 ? 10 : 0;
    const offsetY = this.pileMatrices[0].orientationY === -1 ? 10 : 0;
    const extraOffset = this.isColored ? COLOR_INDICATOR_HEIGHT + 2 : 0;

    this.strandArrowX = new ArrowHelper(
      new Vector3(this.pileMatrices[0].orientationX * 1, 0, 0),
      new Vector3(
        this.matrixWidthHalf - 13 + offsetX,
        -this.matrixWidthHalf - 9 - extraOffset,
        0
      ),
      STRAND_ARROW_LENGTH,
      isHovering ? COLORS.GRAY_DARK : COLORS.GRAY_LIGHTER,
      STRAND_ARROW_HEAD_LENGTH,
      STRAND_ARROW_HEAD_WIDTH
    );

    this.strandArrowY = new ArrowHelper(
      new Vector3(0, this.pileMatrices[0].orientationY * -1, 0),
      new Vector3(
        this.matrixWidthHalf - 20,
        -this.matrixWidthHalf - 4 - offsetY - extraOffset,
        0
      ),
      STRAND_ARROW_LENGTH,
      isHovering ? COLORS.GRAY_DARK : COLORS.GRAY_LIGHTER,
      STRAND_ARROW_HEAD_LENGTH,
      STRAND_ARROW_HEAD_WIDTH
    );

    // Remove previous rects
    if (this.strandArrowRectX) {
      this.strandArrowRects.splice(
        this.strandArrowRects.indexOf(this.strandArrowRectX), 1
      );
      fgmState.scene.remove(this.strandArrowRectX);
    }

    if (this.strandArrowRectY) {
      this.strandArrowRects.splice(
        this.strandArrowRects.indexOf(this.strandArrowRectY), 1
      );
      fgmState.scene.remove(this.strandArrowRectY);
    }

    // Create new rects
    this.strandArrowRectX = createRect(10, 10, COLORS.WHITE);
    this.strandArrowRectX.position.set(
      this.matrixWidthHalf - 7,
      -this.matrixWidthHalf - 9 - extraOffset,
      -1
    );
    this.strandArrowRectX.userData.pile = this;
    this.strandArrowRectX.userData.axis = 'x';

    this.strandArrowRectY = createRect(10, 10, COLORS.WHITE);
    this.strandArrowRectY.position.set(
      this.matrixWidthHalf - 20,
      -this.matrixWidthHalf - 9 - extraOffset,
      -1
    );
    this.strandArrowRectY.userData.pile = this;
    this.strandArrowRectY.userData.axis = 'y';

    this.strandArrowRects.push(
      this.strandArrowRectX, this.strandArrowRectY
    );

    this.mesh.add(this.strandArrowRectX);
    this.mesh.add(this.strandArrowRectY);
    this.mesh.add(this.strandArrowX);
    this.mesh.add(this.strandArrowY);
  }

  /**
   * Elevate mesh.
   *
   * @param {number} z - Level.
   * @return {object} Self.
   */
  elevateTo (z) {
    if (typeof z === 'undefined') {
      this.z = this.zBase;
    } else {
      this.z = z;
    }

    this.mesh.position.set(this.x, this.y, this.z);

    return this;
  }

  /**
   * Flip the matrix.
   *
   * @param {string} axis - Either 'x' or 'y'.
   * @return {object} Self.
   */
  flipMatrix (axis) {
    if (this.pileMatrices.length === 1) {
      switch (axis) {
        case 'x':
          this.pileMatrices[0].flipX();
          Matrix.flipX(this.avgMatrix);
          Matrix.flipX(this.coverMatrix);
          break;

        case 'y':
          this.pileMatrices[0].flipY();
          Matrix.flipY(this.avgMatrix);
          Matrix.flipY(this.coverMatrix);
          break;

        default:
          this.pileMatrices[0].flipX();
          Matrix.flipX(this.avgMatrix);
          Matrix.flipX(this.coverMatrix);
          this.pileMatrices[0].flipY();
          Matrix.flipY(this.avgMatrix);
          Matrix.flipY(this.coverMatrix);
          break;
      }
    }

    return this;
  }

  /**
   * Create matrix frame.
   *
   * @return {object} Self.
   */
  frameCreate () {
    this.matrixFrame = createLineFrame(
      this.matrixWidth,
      this.matrixWidth,
      this.matrixFrameColor,
      this.matrixFrameThickness
    );

    this.matrixFrameHighlight = createLineFrame(
      this.matrixWidth,
      this.matrixWidth,
      COLORS.ORANGE,
      this.matrixFrameThickness + 2,
      0
    );

    this.pileOutline = createLineFrame(
      this.matrixWidth,
      this.matrixWidth,
      COLORS.WHITE,
      this.matrixFrameThickness + 2,
      1
    );

    return this;
  }

  /**
   * Highlight the matrix frame
   *
   * @return {object} Self.
   */
  frameHighlight () {
    this.matrixFrameHighlight.material.uniforms.opacity.value = 1;
    this.pileOutline.material.uniforms.thickness.value =
      this.matrixFrameThickness + 4;

    // this.showPreviewHeight();

    return this;
  }

  /**
   * Frame requires update after matrix size has changed through filtering.
   *
   * @return {object} Self.
   */
  frameReset () {
    this.matrixFrame.material.uniforms.thickness.value =
      this.matrixFrameThickness;
    this.matrixFrame.material.uniforms.diffuse.value = new Color(
      this.matrixFrameColor
    );

    this.matrixFrameHighlight.material.uniforms.opacity.value = 0;
    this.pileOutline.material.uniforms.thickness.value =
      this.matrixFrameThickness + 2;

    // this.hidePreviewHeight();

    return this;
  }

  /**
   * Temporarily change the matrix frame.
   *
   * @param {number} color - HEX color number.
   * @param {number} thickness - Frame thickness.
   * @param  {boolean} isMinThickness - If `true` `thickness` is the minimum.
   * @return {object} Self.
   */
  frameSetTemp (color, thickness, isMinThickness = false) {
    if (color) {
      this.matrixFrame.material.uniforms.diffuse.value = new Color(color);
    }

    if (thickness) {
      let _thickness = thickness;

      if (isMinThickness) {
        _thickness = Math.min(thickness, this.matrixFrameThickness);
      }

      this.matrixFrame.material.uniforms.thickness.value = _thickness;
    }

    return this;
  }

  /**
   * Frame requires update after matrix size has changed through filtering.
   *
   * @return {object} Self.
   */
  frameUpdate (encoding = fgmState.matrixFrameEncoding) {
    if (encoding === null) {
      this.matrixFrameThickness = MATRIX_FRAME_THICKNESS;
      this.matrixFrameColor = COLORS.GRAY_LIGHT;
    } else {
      const relVal = (
        this.measures[encoding] /
        (fgmState.dataMeasuresMax[encoding] || 1)
      );

      this.matrixFrameThickness = Math.max(
        relVal * MATRIX_FRAME_THICKNESS_MAX,
        MATRIX_FRAME_THICKNESS
      );

      const relColorVal = frameValue(1 - relVal);
      this.matrixFrameColor = new Color(
        relColorVal, relColorVal, relColorVal
      ).getHex();
    }

    this.matrixFrame.material.uniforms.thickness.value =
      this.matrixFrameThickness;

    this.matrixFrame.material.uniforms.diffuse.value = new Color(
      this.matrixFrameColor
    );

    this.matrixFrameHighlight.material.uniforms.thickness.value =
      this.matrixFrameThickness + 2;

    this.matrixFrameHighlight.material.uniforms.opacity.value = 0;

    return this;
  }

  /**
   * Get gray tone color from value.
   *
   * @param {number} value - Valuer of the cell.
   * @param {boolean} showSpecialCells - If `true` return white for special
   *   values (e.g., low quality) instead of a color.
   * @return {array} Relative RGB array
   */
  getColor (value, showSpecialCells) {
    switch (value) {
      case -1:
        if (showSpecialCells) {
          return COLORS.LOW_QUALITY_BLUE_ARR;
        }

        return [1, 1, 1];

      default:
        return pileColors.gray(1 - value);
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
   * Get a preview matrix.
   *
   * @param {number} index - Index.
   * @return {array} Matrix
   */
  getMatrixPreview (index) {
    if (this.isMatricesClustered) {
      if (index < PREVIEW_NUM_CLUSTERS) {
        const matrix = [];
        for (let i = 0; i < this.dims; i++) {
          matrix.push(this.clustersAvgMatrices[index].slice(
            i * this.dims, (i + 1) * this.dims
          ));
        }

        return {
          id: '__cluster__',
          matrix
        };
      }
      return;
    }

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
   * Hide this instance.
   *
   * @return {object} Self.
   */
  hide () {
    this.unsetHoverState();
    this.geometry.dispose();
    this.isDrawn = false;

    const meshIndex = fgmState.pileMeshes.indexOf(this.mesh);

    if (meshIndex >= 0) {
      fgmState.pileMeshes.splice(meshIndex, 1);
    }

    fgmState.scene.remove(this.mesh);

    return this;
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

  showPreviewHeight () {
    fgmState.scene.add(this.previewHeightIndicator);
  }

  hidePreviewHeight () {
    fgmState.scene.remove(this.previewHeightIndicator);
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
      if (fgmState.isLayout1d) {
        this.x += fgmState.gridCellWidthInclSpacingHalf;
        this.y = -this.y - fgmState.gridCellHeightInclSpacingHalf;
      } else {
        this.x += this.matrixWidthHalf;
        this.y = -this.y - this.matrixWidthHalf;
      }
    }

    this.mesh.position.set(this.x, this.y, this.mesh.position.z);

    return this;
  }

  /**
   * Recover pile from trash.
   *
   * @return {object} Self.
   */
  recover () {
    if (!this.isTrashed) {
      return;
    }

    this.unsetHoverState();
    this.geometry.dispose();
    this.isDrawn = false;
    fgmState.scene.remove(this.mesh);

    const meshIndex = fgmState.pileMeshesTrash.indexOf(this.mesh);

    if (meshIndex >= 0) {
      fgmState.pileMeshesTrash.splice(meshIndex, 1);
    }

    const pileIndex = fgmState.pilesTrash.indexOf(this);

    if (pileIndex >= 0) {
      fgmState.pilesTrash.splice(pileIndex, 1);
    }

    this.pilesIdxState[this.idNumeric] = this;

    this.isTrashed = false;

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
   * @return {object} Promise resolving to true when computation is done.
   */
  removeMatrices (matrices) {
    matrices.forEach((matrix) => {
      for (let i = this.pileMatrices.length; i > 0; --i) {
        if (matrix === this.pileMatrices[i]) {
          this.pileMatrices.splice(i, 1);
        }
      }
    });

    this.assessMeasures();
    this.frameUpdate(fgmState.matrixFrameEncoding);
    this.calculateAvgMatrix(this.pileMatrices, this.avgMatrix);
    this.calculateCoverMatrix();
    this.matrixClusters = this.calculateKMeansCluster();

    return this.matrixClusters;
  }

  /**
   * Adjust scale to enforce a certain cellsize
   *
   * @param {number} cellSize - Enforced cell size.
   * @return {object} Self.
   */
  scaleTo (cellSize) {
    this.setScale(cellSize / this.cellSize);

    return this;
  }

  /**
   * Color pile.
   *
   * @param {function} color - Coloring function.
   * @return {object} Self.
   */
  setColor (color) {
    this.pileMatrices.forEach((matrix) => {
      matrix.color = color || 'gray';
    });

    this.isColored = !!color;

    return this;
  }

  /**
   * Set cover matrix.
   *
   * @param {number} mode - Cover display mode number.
   * @return {object} Self.
   */
  setCoverMatrixMode (mode) {
    if (this.coverMatrixMode !== mode) {
      this.coverMatrixMode = mode;
      this.calculateCoverMatrix();
    }

    return this;
  }

  /**
   * Set matrices associated to this pile.
   *
   * @param {array} matrices - Array of fgmState.matrices.
   * @return {object} Self.
   */
  setMatrices (matrices) {
    if (arraysEqual(this.pileMatrices, matrices)) {
      return Promise.resolve();
    }

    this.pileMatrices = matrices;

    matrices.forEach((matrix) => { matrix.pile = this; });

    this.assessMeasures();
    this.frameUpdate(fgmState.matrixFrameEncoding);
    this.calculateAvgMatrix(this.pileMatrices, this.avgMatrix);
    this.calculateCoverMatrix();
    this.matrixClusters = this.calculateKMeansCluster();

    return this.matrixClusters;
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
   * Add pile to mesh again for interaction
   */
  show () {
    const meshIndex = fgmState.pileMeshes.indexOf(this.mesh);

    if (meshIndex === -1) {
      fgmState.pileMeshes.push(this.mesh);
    }

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
   * Rescale mesh.
   *
   * @param {number} scale - Scale to be set.
   * @return {object} Self.
   */
  setScale (scale = 1) {
    if (scale) {
      this.scale = scale;
    }

    this.mesh.scale.set(this.scale, this.scale, this.scale);

    return this;
  }

  /**
   * Show single matrix.
   *
   * @param {object} matrix - Matrix to be shown.
   * @return {object} Self.
   */
  showSingle (matrix) {
    this._singleMatrix = matrix;

    if (this._singleMatrixPrev !== this._singleMatrix) {
      this.draw(true);
      this._singleMatrixPrev = this._singleMatrix;
    }

    return this;
  }

  /**
   * Trash this instance.
   *
   * @description
   * Trashing an instance means, it will be moved from the array of active piles
   * to a special trash array.
   */
  trash () {
    if (this.isTrashed) {
      return;
    }

    this.unsetHoverState();
    this.geometry.dispose();
    this.isDrawn = false;
    fgmState.scene.remove(this.mesh);

    const meshIndex = fgmState.pileMeshes.indexOf(this.mesh);

    if (meshIndex >= 0) {
      fgmState.pileMeshes.splice(meshIndex, 1);
    }

    const pileIndex = this.pilesState.indexOf(this);

    if (pileIndex >= 0) {
      this.pilesState.splice(this.pilesState.indexOf(this), 1);
    }

    this.pilesIdxState[this.idNumeric] = undefined;
    delete this.pilesIdxState[this.idNumeric];

    if (!this.pilesIdxState[this.id]) {
      this.pilesIdxState[this.id] = this;
    }

    if (!this.isTrashed) {
      fgmState.pilesTrash.push(this);

      if (this.mesh) {
        fgmState.pileMeshesTrash.push(this.mesh);
      }
    }

    this.isTrashed = true;
  }

  /**
   * Unset hover state.
   */
  unsetHoverState () {
    if (fgmState.hoveredPile === this) {
      fgmState.hoveredPile = undefined;
    }

    if (fgmState.previousHoveredPile === this) {
      fgmState.previousHoveredPile = undefined;
    }

    if (fgmState.hoveredGapPile === this) {
      fgmState.hoveredGapPile = undefined;
    }
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
        (this.cellSize * fgmState.hoveredCell.col) +
        (this.cellSize / 2)
      );
      const y = (
        this.matrixWidthHalf -
        (this.cellSize * fgmState.hoveredCell.row) -
        (this.cellSize / 2)
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
   * @return {object} Self.
   */
  updateLabels () {
    if (fgmState.hoveredCell) {
      const x = (
        -this.matrixWidthHalf +
        (this.cellSize * fgmState.hoveredCell.col) +
        (this.cellSize / 2)
      );
      const y = (
        this.matrixWidthHalf -
        (this.cellSize * fgmState.overedCell.row) -
        (this.cellSize / 2)
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

  /**
   * Update the pile outline.
   *
   * @param {boolean} pileHighlight - If `true` the pile is highlighted.
   */
  updatePileOutline (pileHighlight) {
    this.pileOutline = createLineFrame(
      this.matrixWidth,
      this.matrixWidth + this.previewsHeight,
      COLORS.WHITE,
      this.matrixFrameThickness + 2,
      1
    );
  }
}
