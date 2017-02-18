export default class Matrix {
  constructor (id, matrix, locus, measures) {
    this.id = id;
    this.matrix = matrix;
    this.locus = locus;
    this.measures = measures;

    this.dim = matrix.length;
  }
}
