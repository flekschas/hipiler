export const ANIMATION = true;

export const ARRANGE_METRICS = [];

export const CELL_SIZE = 6;

export const CELL_SIZE_HALF = CELL_SIZE / 2;

export const CELL_THRESHOLD = 0.0;  // only cells above are shown

export const CLICK_DELAY_TIME = 300;

export const DBL_CLICK_DELAY_TIME = 200;

export const COLOR_LOW_QUALITY = [1, 0.890196078, 0.835294118];

export const COLOR_PRIMARY = 0xff5500;

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

export const HIGHLIGHT_FRAME_LINE_WIDTH = 5;

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

export const MATRIX_GAP_VERTICAL = 20;

export const METRIC_DIST_DIAG = 'distToDiag';

export const METRIC_NOISE = 'noise';

export const METRIC_SHARPNESS = 'sharpness';

export const METRIC_SIZE = 'size';

/**
 * Harmonic Mean
 *
 * @type {Number}
 */
export const MODE_MEAN = 0;

/**
 * Not sure
 *
 * @type {Number}
 */
export const MODE_TREND = 1;

/**
 * Statistical variance
 *
 * @type {Number}
 */
export const MODE_VARIANCE = 2;

/**
 * Stuff
 *
 * @type {Number}
 */
export const MODE_DIFFERENCE = 3;

export const ORDER_DATA = 0;

export const ORDER_GLOBAL = 1;

export const ORDER_LOCAL = 2;

export const PILING_DIRECTION = 'horizontal';

export const PREVIEW_SIZE = 3;

export const SHADER_ATTRIBUTES = {
  customColor: { type: 'c', value: [] }
};

export const SHOW_MATRICES = 1000;

export const SHOW_SPECIAL_CELLS = false;

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
  MODE_DIFFERENCE,
  MODE_MEAN,
  MODE_TREND,
  MODE_VARIANCE,
  ORDER_DATA,
  ORDER_GLOBAL,
  ORDER_LOCAL,
  PILING_DIRECTION,
  PREVIEW_SIZE,
  SHADER_ATTRIBUTES,
  SHOW_MATRICES,
  SVG_MENU_HEIGHT,
  TIMELINE_HEIGHT,
  WEB_GL_CONFIG
};
