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
  static flipX (matrix) {
    matrix.map(row => row.reverse());
  }

  /**
   * Flip the raw matix's y axis in-place.
   *
   * @param {array} matrix - 2D matrix to be flipped.
   * @return {object} Orientation.
   */
  static flipY (matrix) {
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
