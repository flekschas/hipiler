// Aurelia
import { LogManager } from 'aurelia-framework';

// Third party
import { queue, text } from 'd3';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh
} from 'three';

import {
  MATRIX_FRAME_THICKNESS,
  MATRIX_FRAME_THICKNESS_MAX,
  MODE_AVERAGE,
  MODE_VARIANCE,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES,
  Z_BASE,
  Z_PILE_MAX
} from 'components/fragments/fragments-defaults';

import pileColors from 'components/fragments/pile-colors';

import {
  ARROW_X,
  ARROW_X_REV,
  ARROW_Y,
  ARROW_Y_REV,
  COLOR_INDICATOR_HEIGHT,
  LABEL_MIN_CELL_SIZE,
  PREVIEW_LOW_QUAL_THRESHOLD,
  PREVIEW_NUM_CLUSTERS,
  STD_MAX
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
  makeBuffer3f,
  makeRgbaBuffer
} from 'components/fragments/fragments-utils';

import arraysEqual from 'utils/arrays-equal';

import Matrix from 'components/fragments/matrix';

import COLORS from 'configs/colors';


const logger = LogManager.getLogger('pile');


export default class Pile {
  constructor (id, scene, scale, dims, maxNumPiles) {
    this.alpha = 1.0;
    this.alphaSecond = this.alpha;
    this.avgMatrix = new Float32Array(dims ** 2);
    this.cellFrame = createRectFrame(
      this.cellSize, this.cellSize, 0xff0000, 1
    );
    this.clustersAvgMatrices = [];
    this.color = pileColors.gray;
    this.colored = false;
    this.colorIndicator = {};
    this.coverMatrix = new Float32Array(dims ** 2);
    this.coverMatrixMode = MODE_AVERAGE;
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

    // Just to avoid re-calculation of fixed values
    this.singleDrawingX = -this.matrixWidthHalf + (this.cellSize / 2);
    this.singleDrawingY = this.matrixWidthHalf - (this.cellSize / 2);
    this.singleDrawingZ = this.zLayerHeight * 5;
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

  get strandArrows () {
    return this.isTrashed ?
      fgmState.strandArrowsTrash : fgmState.strandArrows;
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
   * Calculate the average (mean) matrix.
   *
   * @param {array} targetMatrix - Matrix to be updated in place with the
   *   average.
   * @param {array} sourceMatrices - Matrices to be averaged.
   * @return `targetMatrix`.
   */
  calculateAverage (
    targetMatrix = this.coverMatrix,
    sourceMatrices = this.pileMatrices
  ) {
    const numMatrices = sourceMatrices.length;

    if (numMatrices > 1) {
      const d2 = this.dims ** 2;
      for (let i = 0; i < d2; i++) {
        this.calculateCellMean(
          targetMatrix,
          sourceMatrices,
          i,
          numMatrices
        );
      }
    } else {
      // Copy first pile matrix
      sourceMatrices[0].matrix.forEach((cell, index) => {
        targetMatrix[index] = cell;
      });
    }

    this.isAvgCalced = true;

    return targetMatrix;
  }

  /**
   * Calculate cell mean.
   *
   * @param {array} targetMatrix - Flat Target matrix.
   * @param {array} sourceMatrices - Source matrices used for calclation.
   * @param {number} i - Cell index.
   * @param {number} numMatrices - Number of matrices.
   */
  calculateCellMean (targetMatrix, sourceMatrices, i, numMatrices) {
    let lowQualCounter = 0;

    let mean = sourceMatrices
      .map(matrix => matrix.matrix[i])
      .reduce((sum, value) => {
        lowQualCounter += Math.min(value, 0);
        return sum + Math.max(value, 0);
      }, 0);

    if (lowQualCounter === -numMatrices) {
      // We keep the low quality info in case all cells are of low quality
      mean = -1;
    } else {
      mean /= (numMatrices + lowQualCounter);
    }

    targetMatrix[i] = mean;
  }

  /**
   * Calculate cell standard deviation.
   *
   * @param {array} targetMatrix - Target matrix.
   * @param {array} sourceMatrices - Source matrices used for calclation.
   * @param {number} i - Cell index.
   * @param {number} numMatrices - Number of matrices.
   */
  calculateCellStd (targetMatrix, sourceMatrices, i, numMatrices) {
    targetMatrix[i] = Math.sqrt(
      sourceMatrices
        .map(matrix => matrix.matrix[i])
        .reduce(
          (a, b) => a + ((b - targetMatrix[i]) ** 2), 0
        ) / sourceMatrices.length / STD_MAX
    );
  }

  /**
   * Calculate the variance (standard deviation) matrix.
   *
   * @param {array} targetMatrix - Matrix to be updated in place with the
   *   average.
   * @param {array} sourceMatrices - Matrices to be averaged.
   * @return `targetMatrix`.
   */
  calculateVariance (
    targetMatrix = this.coverMatrix,
    sourceMatrices = this.pileMatrices
  ) {
    // In order to calculate the variance we need the mean anyway so we can
    // calculate it upfront.
    if (!this.isAvgCalced) {
      this.calculateAverage();
    }

    const numMatrices = sourceMatrices.length;

    if (numMatrices > 1) {
      const d2 = this.dims ** 2;
      for (let i = 0; i < d2; i++) {
        this.calculateCellStd(
          targetMatrix,
          sourceMatrices,
          i,
          numMatrices
        );
      }
    } else {
      // Copy first pile matrix
      sourceMatrices[0].matrix.forEach((cell, index) => {
        targetMatrix[index] = cell;
      });
    }

    this.isAvgCalced = false;

    return targetMatrix;
  }

  /**
   * Calculate cover matrix.
   *
   * @return {object} Self.
   */
  calculateCoverMatrix () {
    if (this.coverMatrixMode === MODE_VARIANCE) {
      this.calculateVariance();
    } else {
      this.calculateAverage();
    }

    // if (numMatrices > 1) {
    //   // Create empty this.dims x this.dims matrix
    //   this.coverMatrix = this.coverMatrix
    //     .map(row => new Float32Array(this.dims));

    //   if (this.coverMatrixMode === MODE_STD) {
    //     for (let i = 0; i < this.dims; i++) {
    //       for (let j = 0; j < this.dims; j++) {
    //         switch (this.coverMatrixMode) {
    //           case MODE_MAD:
    //             this.calculateCellMad(
    //               this.coverMatrix,
    //               this.clustersAvgMatrices,
    //               i,
    //               j,
    //               numMatrices
    //             );
    //             break;

    //           case MODE_STD:
    //             this.calculateCellStd(
    //               this.coverMatrix,
    //               this.clustersAvgMatrices,
    //               i,
    //               j,
    //               numMatrices
    //             );
    //             break;

    //           default:
    //             // Nothing
    //             break;
    //         }
    //       }
    //     }
    //   } else {
    //     this.coverMatrix = this.calculateAverage();
    //     // Copy the average matrix from `this.avgMatrix`.
    //     for (let i = 0; i < this.dims; i++) {
    //       this.coverMatrix[i] = this.avgMatrix.slice(
    //         i * this.dims, (i + 1) * this.dims
    //       );
    //     }
    //   }
    // } else {
    //   // Copy the matrix from the first pileMatrix.
    //   this.coverMatrix = this.pileMatrices[0].matrix.slice();
    // }

    return this;
  }

  convertPileMatrixToMatrix (pileMatrix) {
    const matrix = Matrix.flatten(pileMatrix.matrix);
    matrix.id = pileMatrix.id;

    return matrix;
  }

  createWorkerClusterfck () {
    return new Promise((resolve, reject) => {
      const hash = window.hipilerConfig.workerClusterfckHash.length ?
        `-${window.hipilerConfig.workerClusterfckHash}` : '';

      const loc = window.hipilerConfig.workerLoc || 'dist';

      queue()
        .defer(text, `${loc}/clusterfck-worker${hash}.js`)
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
      if (this.pileMatrices.length === 1) {
        this.isMatricesClustered = false;
        this.clustersAvgMatrices = [this.coverMatrix];
        return resolve();
      }

      if (this.pileMatrices.length <= PREVIEW_NUM_CLUSTERS) {
        this.isMatricesClustered = false;
        this.clustersAvgMatrices = this.pileMatrices.map(
          pileMatrix => pileMatrix.matrix
        );
        return resolve();
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

            this.clustersAvgMatrices = [];
            this.clusters.forEach((cluster) => {
              this.clustersAvgMatrices.push(this.calculateAverage(
                new Float32Array(this.dims ** 2),
                cluster.map(matrixId => fgmState.matricesIdx[matrixId])
              ));
            });

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
            pileMatrix => pileMatrix.matrix
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
        this.piles.splice(pileIndex, 1);
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
    const start0 = performance.now();
    let start1;
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

    // start1 = performance.now();
    if (this.singleMatrix) {
      this.drawSingleMatrix(
        this.singleMatrix.matrix,
        positions,
        colors
      );
    } else {
      this.drawMultipleMatrices(positions, colors);
    }
    // console.log(`Matrix drawing took ${performance.now() - start1}msec`, !!this.singleMatrix);

    // start1 = performance.now();
    if (this.pileMatrices.length > 1) {
      this.drawPreviews(positions, colors);
      this.updateFrameHighlight();
      this.updatePileOutline();
    }

    // CREATE + ADD MESH
    this.geometry.addAttribute(
      'position',
      new BufferAttribute(makeBuffer3f(positions), 3)
    );

    this.geometry.addAttribute(
      'customColor',
      new BufferAttribute(makeRgbaBuffer(colors, this.alpha), 4)
    );

    this.mesh = new Mesh(this.geometry, fgmState.shaderMaterial);
    // console.log(`Matrix meshing took ${performance.now() - start1}msec`);

    start1 = performance.now();
    if (
      !(fgmState.isHilbertCurve) &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd) &&
      !(this.cellSize < LABEL_MIN_CELL_SIZE)
    ) {
      this.drawPileLabel(isHovering);
    }
    console.log(`Label drawing took ${performance.now() - start0}msec`);

    // Add frames
    this.mesh.add(this.pileOutline);
    this.pileOutline.position.set(
      0, this.previewsHeight / 2, this.zLayerHeight
    );
    this.mesh.add(this.matrixFrameHighlight);
    this.matrixFrameHighlight.position.set(
      0, this.previewsHeight / 2, this.zLayerHeight * 2
    );
    this.mesh.add(this.matrixFrame);
    this.matrixFrame.position.set(
      0, 0, this.zLayerHeight * 4
    );

    this.mesh.pile = this;
    this.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, this.z);
    fgmState.scene.add(this.mesh);

    start1 = performance.now();
    if (
      !fgmState.isHilbertCurve &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd)
    ) {
      this.drawStrandArrows(isHovering);
    }
    console.log(`Arrow took ${performance.now() - start1}msec`);

    this.drawColorIndicator();

    this.isDrawn = true;
    console.log(`Snippet drawing took ${performance.now() - start0}msec`);

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

        const value = this.coverMatrix[(i * this.dims) + j];
        const color = this.coverMatrixMode === MODE_VARIANCE ?
          pileColors.whiteOrangeBlack(value) :
          this.getColor(value, fgmState.showSpecialCells);

        add2dSqrtBuffRect(
          positions,
          -y,
          -x,
          this.zLayerHeight * 5,
          this.cellSize,
          colors,
          color
        );
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
    this.label.material.opacity = this.alphaSecond;

    this.mesh.add(this.label);
  }

  /**
   * Draw pile matrix previews.
   *
   * @param {array} positions - Positions array to be changed in-place.
   * @param {array} colors - Colors array to be changed in-place.
   */
  drawPreviews (positions, colors) {
    this.previewsHeight = this.previewSize * this.clustersAvgMatrices.length;

    // Background
    addBufferedRect(
      positions,
      0,
      this.matrixWidthHalf + (this.previewsHeight / 2),
      this.zLayerHeight * 3,
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
          this.zLayerHeight * 5, // z
          this.cellSize,  // width
          this.previewSize - this.previewSpacing,  // height
          colors,
          this.getColor(value, fgmState.showSpecialCells)
        );
      }

      index += 1;
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
    const cellSizeHalf = this.cellSize / 2;

    for (let i = 0; i < this.dims; i++) {
      let x = this.singleDrawingX + (i * this.cellSize);

      for (let j = 0; j < this.dims; j++) {
        let y = this.singleDrawingY - (j * this.cellSize);

        const color = this.getColor(
          cellValue(matrix[(i * this.dims) + j]),
          fgmState.showSpecialCells
        );

        const a = -y - cellSizeHalf;
        const b = -y + cellSizeHalf;
        const c = -x - cellSizeHalf;
        const d = -x + cellSizeHalf;

        positions.push(
          [a, c, this.singleDrawingZ],
          [b, c, this.singleDrawingZ],
          [b, d, this.singleDrawingZ],
          [b, d, this.singleDrawingZ],
          [a, d, this.singleDrawingZ],
          [a, c, this.singleDrawingZ]
        );

        colors.push(
          color,
          color,
          color,
          color,
          color,
          color
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
    const extraOffset = this.isColored ? COLOR_INDICATOR_HEIGHT + 2 : 0;

    // Remove previous sprites
    fgmState.scene.remove(this.strandArrowX);
    fgmState.scene.remove(this.strandArrowY);

    // Clone sprite
    this.strandArrowX = this.pileMatrices[0].orientationX === 1 ?
      ARROW_X.clone() : ARROW_X_REV.clone();
    this.strandArrowY = this.pileMatrices[0].orientationY === 1 ?
      ARROW_Y.clone() : ARROW_Y_REV.clone();

    // Set opacity
    const opacity = isHovering ? 0.66 : 0.2;
    this.strandArrowX.material.opacity = opacity;
    this.strandArrowY.material.opacity = opacity;

    // Position arrow
    this.strandArrowX.position.set(
      this.matrixWidthHalf - 7,
      -this.matrixWidthHalf - 9 - extraOffset,
      -1
    );

    this.strandArrowY.position.set(
      this.matrixWidthHalf - 20,
      -this.matrixWidthHalf - 9 - extraOffset,
      -1
    );

    // Associate pile
    this.strandArrowX.userData.pile = this;
    this.strandArrowX.userData.axis = 'x';
    this.strandArrowY.userData.pile = this;
    this.strandArrowY.userData.axis = 'y';

    // Add to helper array for ray casting
    this.strandArrows.push(this.strandArrowX);
    this.strandArrows.push(this.strandArrowY);

    // Add arow to mesh
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
    console.log('Flip', axis);
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
      this.matrixFrameThickness,
      this.alphaSecond
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
      this.alphaSecond
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

    // this.matrixFrameHighlight.material.uniforms.opacity.value = 0;

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
        return {
          id: '__cluster__',
          matrix: this.clustersAvgMatrices[index]
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
    this.calculateCoverMatrix();
    this.matrixClusters = this.calculateKMeansCluster();

    return this.matrixClusters;
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
   *
   * @return {object} Self.
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
      this.pilesState.splice(pileIndex, 1);
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

    return this;
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
   */
  updateFrameHighlight (pileHighlight) {
    this.matrixFrameHighlight = createLineFrame(
      this.matrixWidth,
      this.matrixWidth + this.previewsHeight,
      COLORS.ORANGE,
      this.matrixFrameThickness + 2,
      this.matrixFrameHighlight.material.uniforms.opacity.value
    );
  }

  /**
   * Update the pile outline.
   */
  updatePileOutline () {
    this.pileOutline = createLineFrame(
      this.matrixWidth,
      this.matrixWidth + this.previewsHeight,
      COLORS.WHITE,
      this.matrixFrameThickness + 2,
      this.alphaSecond
    );
  }

  updateAlpha () {
    let update = false;

    if (
      !fgmState.hglSelectionFadeOut ||
      this.pileMatrices.some(matrix => matrix.isVisibleInSelection)
    ) {
      if (this.alpha !== 1.0) {
        this.alpha = 1.0;
        this.alphaSecond = 1.0;
        update = true;
      }
    } else if (this.alpha !== 0.25) {
      this.alpha = 0.25;
      this.alphaSecond = 0.25;
      update = true;
    }

    if (update) {
      // Update matrix
      for (let i = this.mesh.geometry.attributes.customColor.count; i--;) {
        this.mesh.geometry.attributes.customColor.setW(i, this.alpha);
      }

      this.mesh.geometry.attributes.customColor.needsUpdate = true;

      // Update matrix frame and pile outline
      this.matrixFrame.material.uniforms.opacity.value = this.alphaSecond;
      this.pileOutline.material.uniforms.opacity.value = this.alphaSecond;

      // Update the Strand arrows
      if (this.strandArrowX) {
        this.strandArrowX.line.material.opacity = this.alphaSecond;
        this.strandArrowX.cone.material.opacity = this.alphaSecond;
        this.strandArrowY.line.material.opacity = this.alphaSecond;
        this.strandArrowY.cone.material.opacity = this.alphaSecond;
      }

      // Update the label
      if (this.label) {
        this.label.material.opacity = this.alphaSecond;
      }
    }
  }
}
