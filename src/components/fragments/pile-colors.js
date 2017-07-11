import { scaleLinear } from 'd3';

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
  whiteOrangeBlackRgba
};
