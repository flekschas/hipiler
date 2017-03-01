import { scaleLinear } from 'd3';

const scale = scaleLinear().range([0, 1]);

/**
 * Map a value to a relative color array for blue.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const blue = value => [
  scaleLinear().range([0.352941176, 1])(value),
  scaleLinear().range([0.301960784, 1])(value),
  1
];

/**
 * Map a value to a relative color array for cyan.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const cyan = value => [
  scaleLinear().range([0.211764706, 1])(value),
  scaleLinear().range([0.831372549, 1])(value),
  scaleLinear().range([0.850980392, 1])(value)
];

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

/**
 * Map a value to a relative color array for green.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const green = value => [
  scaleLinear().range([0.250980392, 1])(value),
  scaleLinear().range([0.749019608, 1])(value),
  scale(value)
];

/**
 * Map a value to a relative color array for orange.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const orange = value => [
  1,
  scaleLinear().range([0.333333333, 1])(value),
  scaleLinear().range([0, 1])(value)
];

/**
 * Map a value to a relative color array for pink.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const pink = value => [
  scaleLinear().range([0.925490196, 1])(value),
  scaleLinear().range([0.231372549, 1])(value),
  scaleLinear().range([0.71372549, 1])(value)
];

/**
 * Map a value to a relative color array for red.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const red = value => [
  scaleLinear().range([0.964705882, 1])(value),
  scale(value),
  scaleLinear().range([0.160784314, 1])(value)
];

/**
 * Map a value to a relative color array for yellow.
 *
 * @param {number} value - Domain value, i.e., value to be mapped.
 * @return {array} Relative color array.
 */
export const yellow = value => [
  1,
  scaleLinear().range([0.8, 1])(value),
  scale(value)
];

export const categorical = [
  'green',
  'yellow',
  'cyan',
  'red',
  'blue',
  'pink'
];

export default {
  blue,
  categorical,
  cyan,
  gray,
  green,
  orange,
  pink,
  red,
  yellow
};
