import { scaleLinear } from 'd3';

import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Geometry,
  Line,
  LineBasicMaterial,
  LinePieces,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Texture,
  Vector3
} from 'three';

import {
  LINE,
  LINE_SHADER,
  SHADER_ATTRIBUTES
} from 'components/fragments/fragments-defaults';


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

export const frameValue = scaleLinear().range([0.1, 0.9]).nice();

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
export function add2dSqrtBuffRect (positions, x, y, z, w, colors, color) {
  addBufferedRect(positions, x, y, z, w, w, colors, color);
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

export function makeRgbaBuffer (array, alpha = 1.0) {
  const buffer = new Float32Array(array.length * 4);  // four components per vertex

  array.forEach((entry, index) => {
    buffer[(index * 4) + 0] = entry[0];
    buffer[(index * 4) + 1] = entry[1];
    buffer[(index * 4) + 2] = entry[2];
    buffer[(index * 4) + 3] = alpha;
  });

  return buffer;
}

export function createLineFrame (width, height, color, lineWidth, opacity) {
  const wh = width / 2;
  const hh = height / 2;

  const coordinates = [
    [-wh, -hh],
    [-wh, hh],
    [wh, hh],
    [wh, -hh]
  ];

  const geometry = LINE(coordinates, { closed: true });

  const material = new ShaderMaterial(LINE_SHADER({
    side: DoubleSide,
    diffuse: color,
    thickness: lineWidth,
    transparent: true,
    opacity: typeof opacity === 'undefined' ? 1 : opacity
  }));

  return new Mesh(geometry, material);
}

export function createChMap (
  points, convexHull, polygonMaterial, pointsMaterial, lineMaterial
) {
  // Draw locations of all piled up snippets
  const positions = new Float32Array(points.length * 18);
  const widthHalf = 2;
  const heightHalf = widthHalf;

  points.forEach((point, index) => {
    positions[(index * 18) + 0] = point[0] - widthHalf;
    positions[(index * 18) + 1] = point[1] - heightHalf;
    positions[(index * 18) + 2] = 0;
    positions[(index * 18) + 3] = point[0] + widthHalf;
    positions[(index * 18) + 4] = point[1] - widthHalf;
    positions[(index * 18) + 5] = 0;
    positions[(index * 18) + 6] = point[0] + widthHalf;
    positions[(index * 18) + 7] = point[1] + widthHalf;
    positions[(index * 18) + 8] = 0;
    positions[(index * 18) + 9] = point[0] + widthHalf;
    positions[(index * 18) + 10] = point[1] + widthHalf;
    positions[(index * 18) + 11] = 0;
    positions[(index * 18) + 12] = point[0] - widthHalf;
    positions[(index * 18) + 13] = point[1] + widthHalf;
    positions[(index * 18) + 14] = 0;
    positions[(index * 18) + 15] = point[0] - widthHalf;
    positions[(index * 18) + 16] = point[1] - widthHalf;
    positions[(index * 18) + 17] = 0;
  });

  const pointsGeometry = new BufferGeometry({
    attributes: SHADER_ATTRIBUTES
  });

  pointsGeometry.addAttribute(
    'position',
    new BufferAttribute(positions, 3)
  );

  const mesh = new Mesh(pointsGeometry, pointsMaterial);

  if (convexHull.length > 2 && is2d(convexHull)) {
    // Create the bg for the convexHull
    mesh.add(createPolygon(convexHull, polygonMaterial, lineMaterial));
  } else {
    mesh.add(new Mesh(LINE(convexHull), lineMaterial));
  }

  return mesh;
}

/**
 * Check whether the points define a plan or just a line
 *
 * @param {array} points - Array of 2D points
 * @return {boolean} If `true` the points span a plane.
 */
export function is2d (points) {
  return points.some(  // X
    (point, index) => (index > 0 ? points[index - 1][0] !== point[0] : false)
  ) && points.some(  // Y
    (point, index) => (index > 0 ? points[index - 1][1] !== point[1] : false)
  );
}

export function createPolygon (points, polygonMaterial, lineMaterial) {
  const polygon = new Shape();

  polygon.autoClose = true;

  polygon.moveTo(points[0][0], points[0][1]);

  points.slice(1).forEach((point, index) => {
    polygon.lineTo(point[0], point[1]);
  });

  let polygonGeom = new ShapeGeometry(polygon);

  const mesh = new Mesh(polygonGeom, polygonMaterial);

  if (lineMaterial) {
    mesh.add(new Mesh(LINE(points, { closed: true }), lineMaterial));
  }

  return mesh;
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

export function createText (label) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const context = canvas.getContext('2d');
  context.font = '12px Rubik';
  context.fillStyle = 'rgba(0, 0, 0, 0.25)';
  context.fillText(label, 0, 12);

  // canvas contents will be used for a texture
  const texture = new Texture(canvas);
  texture.needsUpdate = true;

  const material = new MeshBasicMaterial({
    map: texture,
    side: DoubleSide
  });

  material.transparent = true;

  return new Mesh(
    new PlaneGeometry(canvas.width, canvas.height),
    material
  );
}

export function createImage (pixels, width, height) {
  // Set image data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const image = new ImageData(pixels, canvas.width, canvas.height);

  const context = canvas.getContext('2d');
  context.putImageData(image, 0, 0);

  // canvas contents will be used for a texture
  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;

  const material = new MeshBasicMaterial({ map: texture, transparent: true });

  return new Mesh(
    new PlaneGeometry(canvas.width, canvas.height),
    material
  );
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

export function updateImageTexture (mesh, pixels) {
  // Set image data
  const canvas = document.createElement('canvas');
  canvas.width = mesh.material.map.image.width;
  canvas.height = mesh.material.map.image.height;

  const image = new ImageData(pixels, canvas.width, canvas.height);

  const context = canvas.getContext('2d');
  context.putImageData(image, 0, 0);

  // canvas contents will be used for a texture
  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;

  mesh.material.map = texture;
  mesh.material.map.needsUpdate = true;
}
