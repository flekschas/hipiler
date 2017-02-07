import { scaleLinear } from 'd3';

import {
  Geometry,
  Line,
  LineBasicMaterial,
  LinePieces,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  TextGeometry,
  Vector3
} from 'three';

import fgmState from './fragments-state';


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

export function calculateDistances (matrices) {
  // Init distance with `-1`
  const distanceMatrix = Array(matrices.length).fill(
    Array(matrices.length).fill(-1)
  );

  let maxDistance = 0;

  for (let i = 1; i < matrices.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      const distance = calculateDistance(matrices[i], matrices[j]);

      distanceMatrix[i][j] = distance;
      distanceMatrix[j][i] = distance;

      maxDistance = Math.max(maxDistance, distance);
    }
  }

  return { distanceMatrix, maxDistance };
}

export const cellValue = scaleLinear().range([0, 1]).nice();

/**
 * Get the minimal dimension of two matrices assuming that both are squared.
 *
 * @param {array} matrix1 - First raw matrix.
 * @param {array} matrix2 - Second raw matrix.
 * @return {number} Smaller dimension of the two matrices.
 */
function getMinDim (matrix1, matrix2) {
  return Math.min(matrix1.length, matrix2.length);
}

/**
 * Calculate the distance between two matrices.
 *
 * @param {array} matrix1 - First raw matrix.
 * @param {array} matrix2 - Second raw matrix.
 * @return {number} Distance
 */
function calculateDistance (matrix1, matrix2) {
  const dim = getMinDim(matrix1, matrix2);

  let distance = 0;

  for (let i = 0; i < dim; i++) {
    for (let j = i; j < dim; j++) {
      distance += (matrix1[i][j] - matrix2[i][j]) ** 2;
    }
  }

  return Math.sqrt(distance);
}

export function addBufferedRect (array, x, y, z, w, h, colorArray, c) {
  const wh = w / 2;
  const hh = h / 2;

  array.push(
    [x - wh, y - hh, z],
    [x + wh, y - hh, z],
    [x + wh, y + hh, z],
    [x + wh, y + hh, z],
    [x - wh, y + hh, z],
    [x - wh, y - hh, z]
  );

  colorArray.push(
    [c[0], c[1], c[2]],
    [c[0], c[1], c[2]],
    [c[0], c[1], c[2]],
    [c[0], c[1], c[2]],
    [c[0], c[1], c[2]],
    [c[0], c[1], c[2]]
  );
}

export function makeBuffer3f (array) {
  const buffer = new Float32Array(array.length * 3);  // three components per vertex

  array.forEach((entry, index) => {
    buffer[(index * 3) + 0] = entry[0];
    buffer[(index * 3) + 1] = entry[1];
    buffer[(index * 3) + 2] = entry[2];
  });

  return buffer;
}

export function createRectFrame (w, h, color, lineThickness) {
  const wh = w / 2;
  const hh = h / 2;

  let geom = new Geometry();

  geom.vertices = [
    new Vector3(-wh, -hh, 0),
    new Vector3(-wh, hh, 0),
    new Vector3(wh, hh, 0),
    new Vector3(wh, -hh, 0),
    new Vector3(-wh, -hh, 0)
  ];

  let material = new LineBasicMaterial({
    color,
    linewidth: lineThickness,
    linejoin: 'round',
    linecap: 'round'
  });

  return new Line(geom, material);
}

export function createRect (w, h, color) {
  let geom = new PlaneBufferGeometry(w, h, 1, 1);
  let m = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1
  });
  return new Mesh(geom, m);
}

export function createText (string, x, y, z, size, color, weight) {
  const textGeom = new TextGeometry(string, {
    size: size || 8,
    height: 1,
    weight: weight || 'normal',
    curveSegments: 5,
    font: fgmState.font,
    bevelEnabled: false
  });

  const textMaterial = new MeshBasicMaterial({
    color: color || 0xff0000
  });

  const label = new Mesh(textGeom, textMaterial);

  label.position.set(x, y, z);

  return label;
}

export function createMarker (x, y, z, color) {
  let l = 10;
  let geom = new Geometry();

  geom.vertices = [
    new Vector3(-l, 0, 0),
    new Vector3(l, 0, 0),
    new Vector3(0, -l, 0),
    new Vector3(0, l, 0)
  ];

  let material = new LineBasicMaterial({
    color,
    linewidth: 1
  });

  let m = new Line(geom, material, LinePieces);

  m.position.set(x, y, z);

  return m;
}

