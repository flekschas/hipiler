export const CELL_SIZE = 6;

export const CELL_SIZE_HALF = CELL_SIZE / 2;

export const CELL_THRESHOLD = 0.0;  // only cells above are shown

/**
 * External config to initialize fragments.
 *
 * @description
 * The config is different from the visual state of the app.
 *
 * @type  {Object}
 */
export const CONFIG = {};

export const DIAGONAL_VALUE = 0.11;

export const DURATION = 500;

export const FONT_URL = 'src/assets/fonts/rubik-regular.json';

export const FPS = 25;

export const LABEL_DIST = 60;

export const LABEL_WIDTH = 130;

export const LABEL_TEXT_SPEC = {
  size: 6,
  height: 1,
  curveSegments: 3
};

export const LETTER_SPACE = 6;

export const MARGIN_BOTTOM = 2;

export const MARGIN_LEFT = 2;

export const MARGIN_RIGHT = 2;

export const MARGIN_TOP = 2;

export const MATRIX_GAP_HORIZONTAL = 10;

export const MATRIX_GAP_VERTICAL = 10;

export const MODE_BARCHART = 1;

export const MODE_DIFFERENCE = 4;

export const MODE_DIRECT_DIFFERENCE = 5;

/**
 * Harmonic Mean
 *
 * @type  {Number}
 */
export const MODE_MEAN = 0;

/**
 * Not sure
 *
 * @type  {Number}
 */
export const MODE_TREND = 2;

/**
 * Statistical variance
 *
 * @type  {Number}
 */
export const MODE_VARIANCE = 3;

export const ORDER_DATA = 0;

export const ORDER_GLOBAL = 1;

export const ORDER_LOCAL = 2;

export const PILE_TOOL_SIZE = 15;

export const PILING_DIRECTION = 'horizontal';

export const PREVIEW_SIZE = 3;

export const SHADER_ATTRIBUTES = {
  customColor: { type: 'c', value: [] }
};

export const SHOW_MATRICES = 1000;

export const SVG_MENU_HEIGHT = 30;

export const TIMELINE_HEIGHT = 130;

/**
 * Three.js's WebGL config
 *
 * @type  {Object}
 */
export const WEB_GL_CONFIG = {
  alpha: true,
  antialias: true
};

export default {
  CELL_SIZE,
  CELL_SIZE_HALF,
  CELL_THRESHOLD,
  CONFIG,
  DIAGONAL_VALUE,
  DURATION,
  FONT_URL,
  FPS,
  LABEL_DIST,
  LABEL_TEXT_SPEC,
  LABEL_WIDTH,
  LETTER_SPACE,
  MARGIN_BOTTOM,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP,
  MATRIX_GAP_HORIZONTAL,
  MATRIX_GAP_VERTICAL,
  MODE_BARCHART,
  MODE_DIFFERENCE,
  MODE_DIRECT_DIFFERENCE,
  MODE_MEAN,
  MODE_TREND,
  MODE_VARIANCE,
  ORDER_DATA,
  ORDER_GLOBAL,
  ORDER_LOCAL,
  PILE_TOOL_SIZE,
  PILING_DIRECTION,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES,
  SHOW_MATRICES,
  SVG_MENU_HEIGHT,
  TIMELINE_HEIGHT,
  WEB_GL_CONFIG
};
