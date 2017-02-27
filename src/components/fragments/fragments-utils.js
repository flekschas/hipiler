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
 * Map a value to a relative color array for blue.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const colorBlue = value => [
  scaleLinear().range([0.352941176, 1])(value),
  scaleLinear().range([0.301960784, 1])(value),
  1
];

/**
 * Map a value to a relative color array for blue.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const colorGray = (value) => {
  const scaled = cellValue(value);

  return [
    scaled,
    scaled,
    scaled
  ];
};

/**
 * Map a value to a relative color array for orange.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const colorOrange = value => [
  1,
  scaleLinear().range([0.333333333, 1])(value),
  scaleLinear().range([0, 1])(value)
];

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

/**
 * Add a 2D squared buffered rantagnle
 *
 * @param {array} positions - List of positions that will be added to in-place.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} w - Width
 * @param {array} colors - List of colors that will be added to in-place.
 * @param {array} color - RGB color array.
 */
export function add2dSqrtBuffRect (positions, x, y, w, colors, color) {
  addBufferedRect(positions, x, y, 0, w, w, colors, color);
}

/**
 * Add a buffered rectangle configs.
 *
 * @description
 * This methods add positions and colors in-place on `positions` and `colors`.
 *
 * @param {array} positions - List of positions that will be added to in-place.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {array} colors - List of colors that will be added to in-place.
 * @param {array} color - RGB color array.
 */
export function addBufferedRect (positions, x, y, z, w, h, colors, color) {
  const widthHalf = w / 2;
  const heightHalf = h / 2;

  positions.push(
    [x - widthHalf, y - heightHalf, z],
    [x + widthHalf, y - heightHalf, z],
    [x + widthHalf, y + heightHalf, z],
    [x + widthHalf, y + heightHalf, z],
    [x - widthHalf, y + heightHalf, z],
    [x - widthHalf, y - heightHalf, z]
  );

  colors.push(
    [color[0], color[1], color[2]],
    [color[0], color[1], color[2]],
    [color[0], color[1], color[2]],
    [color[0], color[1], color[2]],
    [color[0], color[1], color[2]],
    [color[0], color[1], color[2]]
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

export function createRectFrame (w, h, color, lineWidth) {
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
    linewidth: lineWidth,
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
    curveSegments: 1,
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

