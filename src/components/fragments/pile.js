// Aurelia
import { LogManager } from 'aurelia-framework';

import {
  ArrowHelper,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  TextGeometry,
  Vector3
} from 'three';

import menuCommands from 'components/fragments/pile-menu-commands';

import {
  MATRIX_FRAME_THICKNESS,
  MATRIX_FRAME_THICKNESS_MAX,
  MATRIX_GAP_HORIZONTAL,
  MODE_MAD,
  MODE_MEAN,
  MODE_STD,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES,
  Z_BASE,
  Z_MENU
} from 'components/fragments/fragments-defaults';

import pileColors from 'components/fragments/pile-colors';

import {
  COLOR_INDICATOR_HEIGHT,
  LABEL_MIN_CELL_SIZE,
  MENU_LABEL_SPACING,
  MENU_PADDING,
  PREVIEW_LOW_QUAL_THRESHOLD,
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

import Matrix from 'components/fragments/matrix';

import COLORS from 'configs/colors';


const logger = LogManager.getLogger('pile');


export default class Pile {
  constructor (id, scene, scale, dims) {
    this.avgMatrix = new Float32Array(dims ** 2);
    this.cellFrame = createRectFrame(
      this.cellSize, this.cellSize, 0xff0000, 1
    );
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
    this.rank = this.id;
    this.scale = 1;
    this.scene = scene;
    this.showNodeLabels = false;
    this.x = 0;
    this.y = 0;

    fgmState.pilesIdx[this.id] = this;

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
    return this.isTrashed ? fgmState.pilesTrash : fgmState.piles;
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
    this.calculateAvgMatrix();
    this.calculateCoverMatrix();

    return this;
  }

  /**
   * Calculate a-per pile average matrix.

   * @return {object} Self.
   */
  calculateAvgMatrix () {
    const numMatrices = this.pileMatrices.length;

    if (numMatrices > 1) {
      for (let i = 0; i < this.dims; i++) {
        for (let j = 0; j < this.dims; j++) {
          this.calculateCellMean(
            this.avgMatrix,
            this.pileMatrices,
            i,
            j,
            numMatrices,
            true
          );
        }
      }
    } else {
      // Copy first pile matrix
      Matrix.flatten(this.pileMatrices[0].matrix).forEach((cell, index) => {
        this.avgMatrix[index] = cell;
      });
    }

    return this;
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
    const mean = sourceMatrices
      .map(matrix => Math.max(matrix.matrix[i][j], 0))
      .reduce((a, b) => a + b, 0) / sourceMatrices.length;

    targetMatrix[i][j] = sourceMatrices
      .map(matrix => Math.max(matrix.matrix[i][j], 0))
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
    const mean = sourceMatrices
      .map(matrix => Math.max(matrix.matrix[i][j], 0))
      .reduce((a, b) => a + b, 0) / sourceMatrices.length;

    targetMatrix[i][j] = Math.sqrt(sourceMatrices
      .map(matrix => Math.max(matrix.matrix[i][j], 0))
      .reduce((a, b) => a + ((b - mean) ** 2), 0) / (sourceMatrices.length - 1));
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
                  this.pileMatrices,
                  i,
                  j,
                  numMatrices
                );
                break;

              case MODE_STD:
                this.calculateCellStd(
                  this.coverMatrix,
                  this.pileMatrices,
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
        // Copy the average matrix from `this.avgMatrix`
        // this.avgMatrix.forEach((row, index) => {
        //   this.coverMatrix[index] = row.slice();
        // });
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
    this.unsetHoverState();

    const meshIndex = this.pileMeshes.indexOf(this.mesh);

    if (meshIndex >= 0) {
      this.pileMeshes.splice(this.pileMeshes.indexOf(this.mesh), 1);
    }

    this.geometry.dispose();
    fgmState.scene.remove(this.mesh);
    this.isDrawn = false;
    this.pileMatrices = [];

    const pileIndex = this.piles.indexOf(this);

    if (pileIndex >= 0) {
      this.piles.splice(this.piles.indexOf(this), 1);
    }

    fgmState.pilesIdx[this.id] = undefined;
  }

  /**
   * Contains all the drawing routines.
   *
   * @return {object} Self.
   */
  draw (noMenu) {
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
    }

    // this.drawGap(positions, colors);

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
    // this.mesh.scale.set(this.scale, this.scale, this.scale);

    if (isHovering && !noMenu) {
      this.drawMenu();
    }

    if (
      !(fgmState.isHilbertCurve) &&
      !(fgmState.isLayout2d || fgmState.isLayoutMd) &&
      !(this.cellSize < LABEL_MIN_CELL_SIZE)
    ) {
      this.drawPileLabel(isHovering);
    }

    // Add frame
    this.mesh.add(this.matrixFrame);
    this.matrixFrame.position.set(0, 0, 0);

    this.mesh.pile = this;
    this.pileMeshes.push(this.mesh);
    this.mesh.position.set(this.x, this.y, Z_BASE);
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
        -this.matrixWidthHalf - 1 - this.matrixFrameThickness,
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
      this.cellSize,
      colors,
      pileColors.orange(1 - value)
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
   * Draw pile menu
   */
  drawMenu () {
    let maxWidth = 0;
    let maxHeight = 0;
    let labels = [];

    this.menuIsActive = true;

    fgmState.menuPile = this;

    // Frist create labels
    menuCommands
      .filter(command =>
        (!command.stackedPileOnly || this.pileMatrices.length > 1) &&
        (!command.isColoredOnly || this.color !== pileColors.gray) &&
        (!command.isBWOnly || this.color === pileColors.gray) &&
        (
          (!command.trashedOnly && !this.isTrashed) ||
          (command.trashedOnly && this.isTrashed)
        )
      )
      .forEach((command) => {
        const buttons = [];

        let widthTotal = 0;

        command.buttons.forEach((buttonConfig) => {
          const button = {};

          // Assign this pile to the menu button config
          buttonConfig.pile = this;

          // Create label
          button.label = new Mesh(
            new TextGeometry(
              buttonConfig.name.toUpperCase(),
              {
                size: 8,
                height: 1,
                curveSegments: 5,
                font: fgmState.font,
                weight: 'bold',
                bevelEnabled: false
              }
            ),
            new MeshBasicMaterial({ color: buttonConfig.color })
          );

          // Get label width
          const labelBBox = new Box3().setFromObject(button.label).getSize();

          button.height = Math.ceil(
            labelBBox.y + MENU_LABEL_SPACING
          );

          maxHeight = Math.max(maxHeight, button.height);

          const width = Math.ceil(
            labelBBox.x + MENU_LABEL_SPACING
          );

          button.width = buttonConfig.minWidth === 1 ?
            Math.min(width, button.height) : width;

          widthTotal += button.width;

          button.rect = createRect(
            button.width, button.height, buttonConfig.background
          );

          button.frame = createRectFrame(
            button.width, button.height, COLORS.BLACK, 5
          );

          button.rect.add(button.frame);
          button.rect.add(button.label);
          button.rect.pileTool = buttonConfig;

          buttons.push(button);
        });

        maxWidth = Math.max(maxWidth, widthTotal);

        labels.push({
          width: widthTotal,
          height: maxHeight,
          marginTop: command.marginTop,
          buttons
        });
      });

    let marginTop = 0;
    const isRight = (
      this.x + MENU_PADDING - this.matrixWidthHalf - (maxWidth / 2)
    ) < 5;

    let isBottomTop = (
      this.y -
      MENU_PADDING +
      this.matrixWidthHalf -
      (maxHeight / 2) -
      (labels.length * (maxHeight + 1)) -
      marginTop
    ) < -fgmState.plotElDim.height;

    // Next create the rectangle and position the buttons
    labels.forEach((label, index) => {
      let rowWidth = 0;
      let x;
      let y;

      label.buttons.forEach((button) => {
        if (isRight) {
          x = (
            this.x +
            this.matrixWidthHalf -
            MENU_PADDING +
            (button.width / 2) +
            rowWidth
        );
        } else {
          x = (
            this.x -
            this.matrixWidthHalf +
            MENU_PADDING -
            (button.width / 2) -
            rowWidth
          );
        }

        rowWidth += button.width;

        if (isBottomTop) {
          y = (
            this.y +
            MENU_PADDING -
            this.matrixWidthHalf +
            (button.height / 2) +
            (index * (button.height + 1)) +
            marginTop
          );
        } else {
          y = (
            this.y -
            MENU_PADDING +
            this.matrixWidthHalf -
            (button.height / 2) -
            (index * (button.height + 1)) -
            marginTop
          );
        }

        button.rect.position.set(x, y, Z_MENU);

        button.label.position.set(
          -(button.width / 2) + 2, -4, 1
        );

        fgmState.visiblePileTools.push(button.rect);
        fgmState.scene.add(button.rect);
      });

      if (typeof label.marginTop !== 'undefined') {
        marginTop += label.marginTop;
      }
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

      if (this.singleMatrix) {
        labelText += `: ${this.singleMatrix.id + 1}`;
      }
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
    this.pileMatrices.forEach((pileMatrix, index) => {
      let y = this.matrixWidthHalf + (this.previewSize * (index + 1));

      for (let i = 0; i < this.dims; i++) {
        let value = 0;

        for (let j = 0; j < this.dims; j++) {
          value += pileMatrix.matrix[j][i];
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

        // White border, i.e., spacing
        addBufferedRect(
          positions,
          x,
          y,
          0.5,
          this.cellSize,
          this.previewSize,
          colors,
          [1, 1, 1]
        );

        // The actual preview
        addBufferedRect(
          positions,
          x,
          y,
          0.5,
          this.cellSize,
          this.previewSize - this.previewSpacing,
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
    this.mesh.position.set(this.x, this.y, z);

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

    return this;
  }

  /**
   * Highlight the matrix frame
   *
   * @return {object} Self.
   */
  frameHighlight () {
    this.matrixFrame.material.uniforms.diffuse.value = new Color(COLORS.ORANGE);

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
        fgmState.dataMeasuresMax[encoding]
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
   */
  hide () {
    this.unsetHoverState();
    this.geometry.dispose();
    this.isDrawn = false;

    fgmState.scene.remove(this.mesh);
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

    fgmState.pilesIdx[this.idNumeric] = this;

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

    this.assessMeasures();
    this.frameUpdate(fgmState.matrixFrameEncoding);
    this.calculateAvgMatrix();
    this.calculateCoverMatrix();

    return this;
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
    this.pileMatrices = matrices;

    matrices.forEach((matrix) => { matrix.pile = this; });

    this.assessMeasures();
    this.frameUpdate(fgmState.matrixFrameEncoding);
    this.calculateAvgMatrix();
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
      fgmState.pileMeshes.splice(fgmState.pileMeshes.indexOf(this.mesh), 1);
    }

    const pileIndex = fgmState.piles.indexOf(this);

    if (pileIndex >= 0) {
      fgmState.piles.splice(fgmState.piles.indexOf(this), 1);
    }

    fgmState.pilesIdx[this.idNumeric] = undefined;
    delete fgmState.pilesIdx[this.idNumeric];

    if (!fgmState.pilesIdx[this.id]) {
      fgmState.pilesIdx[this.id] = this;
    }

    if (!this.isTrashed) {
      fgmState.pilesTrash.push(this);

      if (this.mesh) {
        fgmState.pileMeshesTrash.push(this.mesh);
      }
    }

    this.isTrashed = true;
  }

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
}
