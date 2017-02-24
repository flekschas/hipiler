export default class Matrix {
  constructor (id, matrix, locus, measures) {
    this.id = id;
    this.matrix = matrix;
    this.locus = locus;
    this.measures = measures;

    this.dim = matrix.length;
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
