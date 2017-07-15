// Aurelia
import { LogManager } from 'aurelia-framework';

// Third party
import { queue, text } from 'd3';
import {
  PlaneGeometry,
  Color,
  Mesh
} from 'three';

import {
  MATRIX_FRAME_THICKNESS,
  MATRIX_FRAME_THICKNESS_MAX,
  MODE_VARIANCE,
  Z_BASE,
  Z_PILE_MAX
} from 'components/fragments/fragments-defaults';

import pileColors from 'components/fragments/pile-colors';

import {
  ALPHA_FADED_OUT,
  ARROW_X,
  ARROW_X_MATERIALS,
  ARROW_X_REV,
  ARROW_Y,
  ARROW_Y_MATERIALS,
  ARROW_Y_REV,
  BASE_MATERIAL,
  COLOR_INDICATOR_HEIGHT,
  LABEL_MIN_CELL_SIZE,
  PREVIEW_LOW_QUAL_THRESHOLD,
  PREVIEW_NUM_CLUSTERS,
  PREVIEW_GAP_SIZE,
  PREVIEW_SIZE,
  STD_MAX
} from 'components/fragments/pile-defaults';

import fgmState from 'components/fragments/fragments-state';

import {
  cellValue,
  cellValueLog,
  createImage,
  createLineFrame,
  createRect,
  createRectFrame,
  createText,
  frameValue,
  updateImageTexture
} from 'components/fragments/fragments-utils';

import arraysEqual from 'utils/arrays-equal';

import Matrix from 'components/fragments/matrix';

import COLORS from 'configs/colors';


const logger = LogManager.getLogger('pile');


export default class Pile {
  constructor (id, scene, scale, dims, maxNumPiles) {
    this.alpha = 1.0;
    this.cellFrame = createRectFrame(
      this.cellSize, this.cellSize, 0xff0000, 1
    );
    this.clustersAvgMatrices = [];
    this.colored = false;
    this.colorIndicator = {};
    this.coverMatrix = new Float32Array(dims ** 2);
    this.dims = dims;
    this.highlighted = false;
    this.id = id;
    this.idNumeric = parseInt(`${id}`.replace('_', ''), 10);
    this.isDrawn = false;
    this.isTrashed = false;
    this.matrixFrameThickness = MATRIX_FRAME_THICKNESS;
    this.matrixFrameColor = COLORS.GRAY_LIGHT;
    this.measures = {};
    this.pileMatrices = [];
    this.pixels = new Uint8ClampedArray((dims ** 2) * 4);
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

  get coverDispMode () {
    return typeof this._coverDispMode === 'undefined' ?
      fgmState.coverDispMode : this._coverDispMode;
  }

  set coverDispMode (value) {
    this._coverDispMode = value;
  }

  get isFadedOut () {
    return this.alpha < 1;
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

  get previewsHeightNorm () {
    return this.previewScale * this.previewsHeight;
  }

  get previewScale () {
    return fgmState.previewScale * this.scale;
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
    this.numPileMatsChanged = true;

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
      targetMatrix.set(sourceMatrices[0].matrix);
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
      targetMatrix.set(sourceMatrices[0].matrix);
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
    if (this.coverDispMode === MODE_VARIANCE) {
      this.calculateVariance();
    } else {
      this.calculateAverage();
    }

    return this;
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
            data: this.pileMatrices.map((pileMatrix) => {
              const out = Array.from(pileMatrix.matrix);
              out.id = pileMatrix.id;

              return out;
            })
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
   * Helper method to get the cell / bin value.
   *
   * @param {number} value - Value to be transformed
   * @return {number} Transformed value.
   */
  cellValue (value) {
    return fgmState.logTransform ? cellValueLog(value) : cellValue(value);
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
      this.pileMeshes.splice(meshIndex, 1);
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
    const isHovering = this === fgmState.hoveredPile;

    this.isColored = this.pileMatrices.some(matrix => matrix.color);

    // UPDATE COVER MATRIX CELLS + PILE PREVIEWS
    if (this.mesh && this.mesh.children.length) {
      const idx = this.pileMeshes.indexOf(this.mesh);
      if (idx >= 0) {
        this.pileMeshes.splice(idx, 1);
        fgmState.scene.remove(this.mesh);
      }
    }

    // Calculate the preview height first
    if (this.numPileMatsChanged) {
      this.getPreviewHeight();
    }

    const width = this.cellSize * this.dims;
    const height = width + this.previewsHeightNorm;

    this.geometry = new PlaneGeometry(width, height);
    this.geometry.translate(0, this.previewsHeightNorm / 2, 0);

    // Create base mesh
    this.mesh = new Mesh(
      this.geometry,
      BASE_MATERIAL
    );

    // Draw matrix
    this.matrixMesh = this.drawMatrix(this.singleMatrix);
    this.mesh.add(this.matrixMesh);

    // Draw previews
    if (this.pileMatrices.length > 1) {
      this.previewsMesh = this.drawPreviews(this.previewing);
      this.mesh.add(this.previewsMesh);
    }

    if (
      !(fgmState.isHilbertCurve) &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd) &&
      !(this.cellSize < LABEL_MIN_CELL_SIZE)
    ) {
      this.drawPileLabel(isHovering);
    }

    // Update and add frames
    if (this.numPileMatsChanged) {
      this.updateFrameHighlight();
      this.updatePileOutline();
    }

    this.mesh.add(this.pileOutline);
    this.mesh.add(this.matrixFrameHighlight);
    this.mesh.add(this.matrixFrame);

    this.pileOutline.position.set(
      0, this.previewsHeightNorm / 2, this.zLayerHeight
    );
    this.matrixFrameHighlight.position.set(
      0, this.previewsHeightNorm / 2, this.zLayerHeight * 2
    );
    this.matrixFrame.position.set(
      0, 0, this.zLayerHeight * 4
    );

    this.mesh.pile = this;
    this.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, this.z);
    fgmState.scene.add(this.mesh);

    if (
      !fgmState.isHilbertCurve &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd)
    ) {
      this.drawStrandArrows();
    }

    this.drawColorIndicator();

    this.isDrawn = true;
    this.numPileMatsChanged = false;

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
      this.label = createText(this.labelText);
    } else {
      this.label.material.color.setHex(
        isHovering ? COLORS.GRAY_DARK : COLORS.GRAY_LIGHT
      );
    }

    this.label.position.set(
      -this.matrixWidthHalf + 32,
      -this.matrixWidthHalf - 10 - extraOffset,
      0
    );
    this.label.scale.set(scale, scale, scale);
    this.label.material.opacity = this.alpha;

    this.mesh.add(this.label);
  }

  /**
   * Draw pile matrix previews.
   */
  drawPreviews (previewing) {
    const pixels = new Uint8ClampedArray(this.previewsHeight * this.dims * 4);
    const previewHeight = PREVIEW_SIZE + PREVIEW_GAP_SIZE;
    const rgbaLen = this.dims * 4;

    // Make first row of pixels white
    pixels.fill(0, 0, rgbaLen);

    this.clustersAvgMatrices.forEach((matrix, index) => {
      const previewMatrixPixels = this.getColAvgPix(
        matrix, index === previewing
      );

      for (let h = 0; h < PREVIEW_SIZE; h++) {
        pixels.set(
          previewMatrixPixels,
          ((index * previewHeight) + h + PREVIEW_GAP_SIZE) * rgbaLen
        );
      }
    });

    // Set image data
    const imageMesh = createImage(pixels, this.dims, this.previewsHeight);
    imageMesh.position.set(
      0,
      (this.matrixWidth / 2) + (this.previewsHeightNorm / 2) + 1,
      this.zLayerHeight * 5
    );
    imageMesh.scale.set(
      this.cellSize,
      this.previewScale,
      1
    );
    imageMesh.material.opacity = this.alpha;

    return imageMesh;
  }

  /**
   * Draw a single matrix.
   *
   * @param {array} matrix - If not `undefined` draw the passed matrix instead
   *   of `this.coverMatrix`.
   */
  drawMatrix (matrix) {
    if (!matrix) {
      matrix = this.coverMatrix;
    } else {
      // `matrix` is a class instance rather than the raw matrix.
      matrix = matrix.matrix;
    }

    const len = matrix.length;
    const colorTransformer = this.getMatrixColor(
      this.coverDispMode === MODE_VARIANCE &&
      this.pileMatrices.length > 1 &&
      !this.singleMatrix
    );

    // Get pixels
    for (let i = len; i--;) {
      const color = colorTransformer(
        this.cellValue(matrix[i]), fgmState.showSpecialCells
      );

      this.pixels.set(color, i * 4);
    }

    // Set image data
    const imageMesh = createImage(this.pixels, this.dims, this.dims);
    imageMesh.position.set(0, 0, this.zLayerHeight * 5);
    imageMesh.scale.set(this.cellSize, this.cellSize, this.cellSize);
    imageMesh.material.opacity = this.alpha;

    return imageMesh;
  }

  /**
   * Draw strand arrows for both axis.
   */
  drawStrandArrows () {
    const extraOffset = this.isColored ? COLOR_INDICATOR_HEIGHT + 2 : 0;

    // Remove previous sprites
    fgmState.scene.remove(this.strandArrowX);
    fgmState.scene.remove(this.strandArrowY);

    // Clone sprite
    this.strandArrowX = this.pileMatrices[0].orientationX === 1 ?
      ARROW_X.clone() : ARROW_X_REV.clone();
    this.strandArrowY = this.pileMatrices[0].orientationY === 1 ?
      ARROW_Y.clone() : ARROW_Y_REV.clone();

    // Position arrow
    this.strandArrowX.position.set(
      this.matrixWidthHalf - 7,
      -this.matrixWidthHalf - 9 - extraOffset,
      0
    );

    this.strandArrowY.position.set(
      this.matrixWidthHalf - 20,
      -this.matrixWidthHalf - 9 - extraOffset,
      0
    );

    // Associate pile
    this.strandArrowX.userData.pile = this;
    this.strandArrowX.userData.axis = 'x';
    this.strandArrowY.userData.pile = this;
    this.strandArrowY.userData.axis = 'y';

    // Add to helper array for ray casting
    this.strandArrows.push(this.strandArrowX);
    this.strandArrows.push(this.strandArrowY);

    // Update material
    this.updateArrowMaterial();

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
    if (this.pileMatrices.length === 1) {
      switch (axis) {
        case 'x':
          this.pileMatrices[0].flipX();
          Matrix.flipX(this.coverMatrix);
          break;

        case 'y':
          this.pileMatrices[0].flipY();
          Matrix.flipY(this.coverMatrix);
          break;

        default:
          this.pileMatrices[0].flipX();
          Matrix.flipX(this.coverMatrix);
          this.pileMatrices[0].flipY();
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
      this.alpha
    );

    this.matrixFrameHighlight = createLineFrame(
      this.matrixWidth,
      this.matrixWidth + this.previewsHeightNorm,
      COLORS.ORANGE,
      this.matrixFrameThickness + 2,
      0
    );

    this.pileOutline = createLineFrame(
      this.matrixWidth,
      this.matrixWidth + this.previewsHeightNorm,
      COLORS.WHITE,
      this.matrixFrameThickness + 2,
      this.alpha
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
   * Get pixels of the column average matrix.
   *
   * @param {array} matrix - Raw matrix to be averaged.
   * @return {array} Pixel array.
   */
  getColAvgPix (matrix, previewing) {
    const colAvg = [];
    const lowQualThreshold = -this.dims * PREVIEW_LOW_QUAL_THRESHOLD;
    let idx;

    let color = pileColors.grayRgba;

    if (previewing) {
      color = pileColors.orangeBlackRgba;
    }

    for (let i = this.dims; i--;) {
      colAvg[i] = 0;
    }

    for (let i = matrix.length; i--;) {
      idx = i % this.dims;

      colAvg[idx] += Math.max(matrix[i], 0);
    }

    for (let i = this.dims; i--;) {
      if (colAvg[i] < lowQualThreshold) {
        colAvg[i] = -1;
      } else {
        colAvg[i] /= this.dims;
      }

      colAvg[i] = this.getColorRgba(
        colAvg[i], fgmState.showSpecialCells, color
      );
    }

    return colAvg.reduce((flatArr, a) => flatArr.concat(a), []);
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
   * Get gray tone color from value.
   *
   * @param {number} value - Valuer of the cell.
   * @param {boolean} showSpecialCells - If `true` return white for special
   *   values (e.g., low quality) instead of a color.
   * @return {array} Relative RGB array
   */
  getColorRgba (value, showSpecialCells, color = pileColors.grayRgba) {
    switch (value) {
      case -1:
        if (showSpecialCells) {
          return COLORS.LOW_QUALITY_BLUE_RGBA;
        }

        return [255, 255, 255, 255];

      default:
        return color(1 - value);
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
   * Factory function returning a [0-1] value into RGBA.
   *
   * @param {boolean} varianceMode - If `true` returns a transform function for
   *   white-orange-black otherwise a white-black.
   * @return {function} Color transform function.
   */
  getMatrixColor (varianceMode) {
    const transformer = varianceMode ?
      pileColors.whiteOrangeBlackRgba : this.getColorRgba;

    return function (value, specialCells) {
      return transformer(value, specialCells);
    };
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
   * Calculate the preview height.
   */
  getPreviewHeight () {
    if (this.clustersAvgMatrices.length > 1) {
      this.previewsHeight = (
        (PREVIEW_SIZE * this.clustersAvgMatrices.length) +
        ((this.clustersAvgMatrices.length + 1) * PREVIEW_GAP_SIZE)
      );
    } else {
      this.previewsHeight = 0;
    }

    return this.previewsHeight;
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

  previewMatrix (index) {
    this.previewing = index;
    this.showSingle(this.getMatrixPreview(index));
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
    this.numPileMatsChanged = true;

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
   * Set cover display mode.
   *
   * @param {number} mode - Cover display mode number.
   * @return {object} Self.
   */
  setCoverDispMode (mode) {
    if (this.coverDispMode !== mode) {
      this._coverDispMode = mode;
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
    this.numPileMatsChanged = true;

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
   * Draw a single matrix.
   *
   * @param {array} matrix - If not `undefined` draw the passed matrix instead
   *   of `this.coverMatrix`.
   */
  toggleSpecialCells (matrix) {
    if (!matrix) {
      matrix = this.coverMatrix;
    } else {
      // `matrix` is a class instance rather than the raw matrix.
      matrix = matrix.matrix;
    }

    const len = matrix.length;
    const colorTransformer = this.getMatrixColor(
      this.coverDispMode === MODE_VARIANCE &&
      this.pileMatrices.length > 1 &&
      !this.singleMatrix
    );

    // Get pixels
    for (let i = len; i--;) {
      const value = this.cellValue(matrix[i]);

      if (value === -1) {
        const color = colorTransformer(
          this.cellValue(matrix[i]), fgmState.showSpecialCells
        );

        this.pixels.set(color, i * 4);
      }
    }

    updateImageTexture(this.matrixMesh, this.pixels);
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
    if (this.geometry) {
      this.geometry.dispose();
    }
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
   * Update opacity of the pile.
   */
  updateAlpha () {
    let update = false;

    if (
      !fgmState.hglSelectionFadeOut ||
      this.pileMatrices.some(matrix => matrix.isVisibleInSelection)
    ) {
      if (this.alpha !== 1.0) {
        this.alpha = 1.0;
        update = true;
      }
    } else if (this.alpha !== ALPHA_FADED_OUT) {
      this.alpha = ALPHA_FADED_OUT;
      update = true;
    }

    if (this.isDrawn && update) {
      // Update matrix
      this.matrixMesh.material.opacity = this.alpha;

      // Update previews
      if (this.previewsMesh) {
        this.previewsMesh.material.opacity = this.alpha;
      }

      // Update matrix frame and pile outline
      this.matrixFrame.material.uniforms.opacity.value = this.alpha;
      this.pileOutline.material.uniforms.opacity.value = this.alpha;

      // Update the Strand arrows
      this.updateArrowMaterial();

      // Update the label
      if (this.label) {
        this.label.material.opacity = this.alpha;
      }
    }
  }

  /**
   * Update the material of arrows.
   */
  updateArrowMaterial () {
    if (!this.strandArrowX || !this.strandArrowY) { return; }

    let accessorX = 'NORM';
    let accessorY = 'NORM';

    if (this.pileMatrices[0].orientationX === -1) {
      accessorX = 'REV';
    }

    if (this.pileMatrices[0].orientationY === -1) {
      accessorY = 'REV';
    }

    if (this.isFadedOut) {
      accessorX += '_FADED_OUT';
      accessorY += '_FADED_OUT';
    }

    this.strandArrowX.material = ARROW_X_MATERIALS[accessorX];
    this.strandArrowY.material = ARROW_Y_MATERIALS[accessorY];
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
   * Update the pile outline.
   */
  updateFrameHighlight (pileHighlight) {
    this.matrixFrameHighlight = createLineFrame(
      this.matrixWidth,
      this.matrixWidth + this.previewsHeightNorm,
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
      this.matrixWidth + this.previewsHeightNorm,
      COLORS.WHITE,
      this.matrixFrameThickness + 2,
      this.alpha
    );
  }
}
