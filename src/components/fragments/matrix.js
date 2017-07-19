export default class Matrix {
  constructor (id, matrix, locus, resolution, orientation, measures) {
    this.dim = matrix.length;
    this.id = id;
    this.locus = locus;
    this.matrix = Matrix.to1d(matrix);
    this.measures = measures;
    this.orientation = orientation;
    this.orientationX = Matrix.isCodingStrand(this.orientation.strand1) ?
      1 : -1;
    this.orientationY = Matrix.isCodingStrand(this.orientation.strand2) ?
      1 : -1;
    this.visible = true;
    this.resolution = resolution;
  }

  /**
   * Flip the raw matix's x and y axis in-place.
   */
  flip () {
    Matrix.flip(this.matrix);
    this.orientationX *= -1;
    this.orientationY *= -1;
  }

  /**
   * Flip the raw 1D matix's x and y axis in-place.
   *
   * @param {array} matrix - 1D matrix to be flipped.
   */
  static flip (matrix) {
    Matrix.flipX(matrix);
    Matrix.flipY(matrix);
  }

  /**
   * Flip the raw matix's x axis in-place.
   */
  flipX () {
    Matrix.flipX(this.matrix);
    this.orientationX *= -1;
  }

  /**
   * Flip the raw 1D matix's x axis in-place.
   *
   * @param {array} matrix - 1D matrix to be flipped.
   */
  static flipX (matrix) {
    const dims = Math.round(Math.sqrt(matrix.length));

    for (let i = 0; i < dims; i++) {
      const pos = (i * dims);

      matrix.set(matrix.slice(pos, (i + 1) * dims).reverse(), pos);
    }
  }

  /**
   * Flip the raw matix's y axis in-place.
   */
  flipY () {
    Matrix.flipY(this.matrix);
    this.orientationY *= -1;
  }

  /**
   * Flip the raw 1D matix's y axis in-place.
   *
   * @param {array} matrix - 1D-array Matrix to be flipped.
   */
  static flipY (matrix) {
    const dims = Math.round(Math.sqrt(matrix.length));
    const flippedMatrix = new Float32Array(matrix.length);

    for (let i = 0; i < dims; i++) {
      flippedMatrix.set(
        matrix.slice(i * dims, (i + 1) * dims),
        (dims - 1 - i) * dims
      );
    }

    matrix.set(flippedMatrix);
  }

  /**
   * Check if orientation is coding or non-coding.
   *
   * @param {string} orientation - Orientation string to be checked.
   * @return {Boolean} If `true` strand is coding.
   */
  static isCodingStrand (orientation) {
    switch (orientation) {
      case '-':
      case 'minus':
      case 'noncoding':
      case 'non-coding':
        return false;

      default:
        return true;
    }
  }

  /**
   * Orient matrix to either 5' > 3' or 3' > 5'.
   *
   * @param {boolean} reverse - If `true` orient matrix in 3' to 5' direction.
   */
  orient5To3 (reverse) {
    if (reverse) {
      if (this.orientationX === 1) {
        this.flipX();
      }
      if (this.orientationY === 1) {
        this.flipY();
      }
    } else {
      if (this.orientationX === -1) {
        this.flipX();
      }
      if (this.orientationY === -1) {
        this.flipY();
      }
    }
  }

  /**
   * Convert a 2D classic array into a 1D Float32Array.
   *
   * @param {array} matrix2d - 2D array to be converted into 1D.
   * @return {array} 1D Float32Array.
   */
  static to1d (matrix2d) {
    return Float32Array.from(
      matrix2d.reduce((matrix1d, row) => matrix1d.concat(row), [])
    );
  }
}
