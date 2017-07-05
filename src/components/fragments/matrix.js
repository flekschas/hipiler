export default class Matrix {
  constructor (id, matrix, locus, resolution, orientation, measures) {
    this.dim = matrix.length;
    this.id = id;
    this.locus = locus;
    this.matrix = Matrix.to1d(matrix);
    this.measures = measures;
    this.orientation = orientation;
    this.orientationX = this.orientation.strand1 === 'coding' ? 1 : -1;
    this.orientationY = this.orientation.strand2 === 'coding' ? 1 : -1;
    this.visible = true;
    this.resolution = resolution;
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
   * Flip the raw 1D matix's x axis in-place.
   *
   * @param {array} matrix - 1D matrix to be flipped.
   * @return {number} Orientation.
   */
  static flipX (matrix) {
    const dims = Math.round(Math.sqrt(matrix.length));

    for (let i = 0; i < dims; i++) {
      const pos = (i * dims);

      matrix.set(matrix.slice(pos, (i + 1) * dims).reverse(), pos);
    }
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
   * Flip the raw 1D matix's y axis in-place.
   *
   * @param {array} matrix - 1D-array Matrix to be flipped.
   * @return {object} Orientation.
   */
  static flipY (matrix, dim) {
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
   * Convert a 2D classic array into a 1D Float32Array.
   *
   * @param {array} matrix2d - 2D array to be converted into 1D.
   * @return  {[type]} 1D Floast32Array
   */
  static to1d (matrix2d) {
    return Float32Array.from(
      matrix2d.reduce((matrix1d, row) => matrix1d.concat(row), [])
    );
  }
}
