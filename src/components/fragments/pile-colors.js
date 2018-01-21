import chroma from 'chroma';
import { scaleLinear } from 'd3';

const COLOR_BW = chroma.scale();
const COLOR_BW_INV = chroma.bezier(
  ['#fff2d9', '#ff4500', '#8b0000', '#330000']
).scale().correctLightness();

const COLOR_FALL = chroma.bezier(
  ['#ffffff', '#fffacd', '#ff4500', '#8b0000', '#000000']
).scale().correctLightness();

const COLOR_FALL_INVERSE = chroma.bezier(
  ['#dcf5e7', '#c5f5e1', '#00cca7', '#006f00', '#004000']
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

const COLOR_YL_GN_BU_INVERSE = chroma.scale([
  '#fff7bc',
  '#fee391',
  '#fec44f',
  '#fe9929',
  '#ec7014',
  '#cc4c02',
  '#993404',
  '#662506'
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

const COLOR_YL_RD_BU_INVERSE = chroma.scale([
  '#f7fcb9',
  '#d9f0a3',
  '#addd8e',
  '#78c679',
  '#41ab5d',
  '#238443',
  '#006837',
  '#004529'
]);

const COLOR_PK_PP = chroma.scale([
  '#ffffff',
  '#ffb8fb',
  '#ff5cfe',
  '#cb08e1',
  '#81169e',
  '#401551',
  '#000000'
]);

const COLOR_PK_PP_INVERSE = COLOR_YL_RD_BU_INVERSE;

const COLOR_RD_WH_BU = chroma.scale('RdBu');
const COLOR_RD_WH_BU_INVERSE = chroma.scale('PRGn');

export const bw = value => [...COLOR_BW(value).rgb(), 255];
bw.inverse = value => [...COLOR_BW_INV(value).rgb(), 255];

export const fall = value => [...COLOR_FALL(value).rgb(), 255];
fall.inverse = value => [...COLOR_FALL_INVERSE(value).rgb(), 255];

export const ylGnBu = value => [...COLOR_YL_GN_BU(value).rgb(), 255];
ylGnBu.inverse = value => [...COLOR_YL_GN_BU_INVERSE(value).rgb(), 255];

export const ylRdBu = value => [...COLOR_YL_RD_BU(value).rgb(), 255];
ylRdBu.inverse = value => [...COLOR_YL_RD_BU_INVERSE(value).rgb(), 255];

export const rdWhBu = value => [...COLOR_RD_WH_BU(value).rgb(), 255];
rdWhBu.inverse = value => [...COLOR_RD_WH_BU_INVERSE(value).rgb(), 255];

export const pkPp = value => [...COLOR_PK_PP(value).rgb(), 255];
pkPp.inverse = value => [...COLOR_PK_PP_INVERSE(value).rgb(), 255];

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
  rdWhBu,
  pkPp
};
