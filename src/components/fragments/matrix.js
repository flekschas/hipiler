export default class Matrix {
  constructor (id, matrix, locus) {
    this.id = id;
    this.matrix = matrix;
    this.locus = locus;

    this.dim = matrix.length;
  }
}
