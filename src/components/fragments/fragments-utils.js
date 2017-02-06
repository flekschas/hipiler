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

export const cellValue = scaleLinear().range([0, 1]).nice();

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
  if (!weight) {
    weight = 'normal';
  }

  let textGeom = new TextGeometry(string, {
    size,
    height: 1,
    weight,
    curveSegments: 5,
    font: 'helvetiker',
    bevelEnabled: false
  });

  let textMaterial = new MeshBasicMaterial({ color });
  let label = new Mesh(textGeom, textMaterial);

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

