export default class Matrix {
  constructor (id, matrix, locus, orientation, measures) {
    this.id = id;
    this.matrix = matrix;
    this.locus = locus;
    this.measures = measures;
    this.orientation = orientation;

    this.orientationX = this.orientation.strand1 === 'coding' ? 1 : -1;
    this.orientationY = this.orientation.strand2 === 'coding' ? 1 : -1;

    this.dim = matrix.length;

    this.visible = true;
  }

  /**
   * Flip the raw matix's x axis in-place.
   *
   * @param {array} matrix - 2D matrix to be flipped.
   * @return {number} Orientation.
   */
  flipX () {
    Matrix.flipX(this.matrix);
    this.orientationX *= -1;
  }
  /**
   * Flip the raw matix's x axis in-place.
   *
   * @param {array} matrix - 2D matrix to be flipped.
   * @return {number} Orientation.
   */
  flipY () {
    Matrix.flipY(this.matrix);
    this.orientationY *= -1;
  }

  /**
   * Flip the raw matix's x axis in-place.
   *
   * @param {array} matrix - 2D matrix to be flipped.
   * @return {number} Orientation.
   */
  static flipX (matrix, dim) {
    switch (dim) {
      case '1D':
        Matrix.flipX1d(matrix);
        break;

      default:
        Matrix.flipX2d(matrix);
        break;
    }
  }

  /**
   * Flip the raw matix's x axis in-place.
   *
   * @param {array} matrix - 1D matrix to be flipped.
   * @return {number} Orientation.
   */
  static flipX1d (matrix) {
    const dims = Math.round(Math.sqrt(matrix.length));

    for (let i = 0; i < dims; i++) {
      const pos = (i * dims);

      matrix.set(matrix.slice(pos, dims).reverse(), pos);
    }
  }

  /**
   * Flip the raw matix's x axis in-place.
   *
   * @param {array} matrix - 2D matrix to be flipped.
   * @return {number} Orientation.
   */
  static flipX2d (matrix) {
    matrix.map(row => row.reverse());
  }

  /**
   * Flip the raw matix's y axis in-place.
   *
   * @param {array} matrix - Matrix to be flipped.
   * @return {object} Orientation.
   */
  static flipY (matrix, dim) {
    switch (dim) {
      case '1D':
        Matrix.flipY1d(matrix);
        break;

      default:
        Matrix.flipY2d(matrix);
        break;
    }
  }

  /**
   * Flip the raw matix's y axis in-place.
   *
   * @param {array} matrix - 1D-array matrix to be flipped.
   * @return {object} Orientation.
   */
  static flipY1d (matrix) {
    const dims = Math.round(Math.sqrt(matrix.length));
    const flippedMatrix = new Float32Array(matrix.length);

    for (let i = 0; i < dims; i++) {
      flippedMatrix.set(matrix.slice((i * dims), dims), (dims - 1 - i) * dims);
    }
  }

  /**
   * Flip the raw matix's y axis in-place.
   *
   * @param {array} matrix - 2D matrix to be flipped.
   * @return {object} Orientation.
   */
  static flipY2d (matrix) {
    matrix.reverse();
  }

  /**
   * Flatten  a 2D array.
   *
   * @param {array} matrix - 2D matrix to be flattened.
   * @return {array} 1D arrays.
   */
  static flatten (matrix) {
    return matrix.reduce((a, b) => a.concat(b), []);
  }
}
