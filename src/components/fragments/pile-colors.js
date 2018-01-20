import chroma from 'chroma';
import { scaleLinear } from 'd3';

const COLOR_BW = chroma.scale();

const COLOR_FALL = chroma.bezier(
  ['white', 'LemonChiffon', 'OrangeRed', 'DarkRed', 'black']
).scale().correctLightness();

const COLOR_YL_GN_BU = chroma.scale([
  '#ffffff',
  '#ffffd9',
  '#edf8b1',
  '#c7e9b4',
  '#7fcdbb',
  '#41b6c4',
  '#1d91c0',
  '#225ea8',
  '#253494',
  '#081d58'
]);

const COLOR_YL_RD_BU = chroma.scale([
  '#ffffff',
  '#fff9bf',
  '#ffce00',
  '#ff9a00',
  '#ff622d',
  '#ff164a',
  '#e10061',
  '#b10074',
  '#73007f',
  '#000080'
]);

const COLOR_RD_WH_BU = chroma.scale('RdBu');

export const bw = value => [...COLOR_BW(value).rgb(), 255];

export const fall = value => [...COLOR_FALL(value).rgb(), 255];

export const ylGnBu = value => [...COLOR_YL_GN_BU(value).rgb(), 255];

export const ylRdBu = value => [...COLOR_YL_RD_BU(value).rgb(), 255];

export const rdWhBu = value => [...COLOR_RD_WH_BU(value).rgb(), 255];

const scale = scaleLinear().range([0, 1]);

/**
 * Map a value to a relative color array for gray.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const gray = (value) => {
  const scaled = scale(value);

  return [scaled, scaled, scaled];
};

const scaleRgb = scaleLinear().range([0, 255]);

/**
 * Map a value to a relative color array for gray.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const grayRgba = (value) => {
  const scaled = scaleRgb(value);

  return [scaled, scaled, scaled, 255];
};

const orangeBlackRgbR = scaleLinear().domain([0, 0.4, 0.66, 1]).range([
  0, 64, 255, 255
]);
const orangeBlackRgbG = scaleLinear().domain([0, 0.4, 0.66, 1]).range([
  0, 0, 85, 221
]);
const orangeBlackRgbB = scaleLinear().domain([0, 0.4, 0.66, 1]).range([
  0, 0, 0, 204
]);

/**
 * Map a value to a relative color array for orange.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const orangeBlackRgba = value => [
  orangeBlackRgbR(value),
  orangeBlackRgbG(value),
  orangeBlackRgbB(value),
  255
];

const whiteOrangeBlackRgbR = scaleLinear().domain([0, 0.4, 0.66, 1]).range([
  255, 255, 64, 0
]);
const whiteOrangeBlackRgbG = scaleLinear().domain([0, 0.4, 0.66, 1]).range([
  255, 85, 0, 0
]);
const whiteOrangeBlackRgbB = scaleLinear().domain([0, 0.4, 0.66, 1]).range([
  255, 0, 0, 0
]);

/**
 * Map a value to a relative color array for orange.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const whiteOrangeBlackRgba = value => [
  whiteOrangeBlackRgbR(value),
  whiteOrangeBlackRgbG(value),
  whiteOrangeBlackRgbB(value),
  255
];

export default {
  gray,
  grayRgba,
  orangeBlackRgba,
  whiteOrangeBlackRgba,
  bw,
  fall,
  ylGnBu,
  ylRdBu,
  rdWhBu
};
