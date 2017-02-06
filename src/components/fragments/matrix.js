const Matrix = {
  /********************************* Variables ********************************/

  color: '#aaa',  // annotation color of matrix

  id: undefined,

  matrix: undefined,

  nodValues: [],

  pile: undefined
};

export default function MatrixFactory (id, matrix) {
  const inst = Object.create(Matrix);

  inst.id = id;
  inst.matrix = matrix;

  const numNodes = matrix.length;

  for (let i = 0; i < numNodes; i++) {
    for (let j = i; j < numNodes; j++) {
      inst.matrix[i][j] = Math.max(0, inst.matrix[i][j]);
      inst.matrix[j][i] = inst.matrix[i][j];
    }
  }

  let value;

  for (let i = 0; i < matrix.length; i++) {
    value = 0;
    for (let j = 0; j < matrix[i].length; j++) {
      value += matrix[i][j];
    }
    inst.nodeValues[i] = value / matrix.length;
  }

  return inst;
}
