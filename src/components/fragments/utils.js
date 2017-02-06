import d3 from 'd3';

export function calculateClusterPiling (
  threshold, matrices, distanceMatrix
) {
  let piling = [0];
  let pilecount = 1;
  for (let i = 1; i < matrices.length; i++) {
    for (let j = i - 1; j >= piling[pilecount - 1]; j--) {
      if (distanceMatrix[i][j] > threshold) {
        piling[pilecount] = i;
        pilecount += 1;
        break;
      }
    }
  }
  return piling;
}

export function calculateDistance (matrices, nodes) {
  let distanceMatrix = [];
  for (let i = 0; i < matrices.length; i++) {
    distanceMatrix[i] = [];
    for (let j = 0; j < matrices.length; j++) {
      distanceMatrix[i][j] = -1;
    }
  }

  let maxDistance = 0;

  for (let i = 1; i < matrices.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      maxDistance = Math.max(
        maxDistance, this.distance(matrices, i, j, nodes, distanceMatrix)
      );
    }
  }

  return { distanceMatrix, maxDistance };
}

export const cellValue = d3.scaleLinear().range([0, 1]).nice();

export function distance (matrices, m1, m2, nodes, dMat) {
  if (dMat[m1][m2] !== -1) {
    return dMat[m1][m1];
  }

  let d = 0;
  let a = 0;
  let b = 0;

  for (let i = 0; i < nodes.length; i++) {
    a = nodes[i];

    for (let j = i; j < nodes.length; j++) {
      b = nodes[j];
      d += (matrices[m1][a][b] - matrices[m2][a][b]) ** 2;
    }
  }

  d = Math.sqrt(d);
  dMat[m1][m2] = d;
  dMat[m2][m1] = d;

  return d;
}
