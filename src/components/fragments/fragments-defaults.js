import * as THREE from 'three';
import threeLine2d from 'three-line-2d';
import threeLine2dShader from 'three-line-2d-shader';

import COLORS from 'configs/colors';
import pileColors from 'components/fragments/pile-colors';


export const ANIMATION = true;

export const ARRANGE_MEASURES = [];

export const CAT_DATASET = 'dataset';

export const CAT_ZOOMOUT_LEVEL = 'zoomout-level';

export const CELL_SIZE = 6;

export const CELL_SIZE_HALF = CELL_SIZE / 2;

export const CELL_THRESHOLD = 0.0;  // only cells above are shown

export const CLICK_DELAY_TIME = 300;

export const CLUSTER_TSNE = '_cluster_tsne';

export const DBL_CLICK_DELAY_TIME = 250;

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

export const DURATION = 250;

export const FONT_URL = 'src/assets/fonts/rubik-regular.json';

export const FPS = 25;

export const GRID_CELL_SIZE_LOCK = true;

export const GRID_SIZE = CELL_SIZE;

export const HILBERT_CURVE = false;

export const HIGHLIGHT_FRAME_LINE_WIDTH = 5;

export const HIGLASS_SUB_SELECTION = true;

export const LABEL_DIST = 60;

export const LABEL_WIDTH = 130;

export const LABEL_TEXT_SPEC = {
  size: 6,
  height: 1,
  curveSegments: 3
};

export const LASSO_IS_ROUND = true;

export const LINE = threeLine2d(THREE);

export const LINE_SHADER = threeLine2dShader(THREE);

export const LASSO_LINE_WIDTH = 2;

export const LASSO_MIN_MOVE = 0.033;

export const LASSO_SHADER = threeLine2dShader(THREE)({
  side: THREE.DoubleSide,
  diffuse: COLORS.PRIMARY,
  thickness: LASSO_LINE_WIDTH
});

export const LASSO_MATERIAL = new THREE.ShaderMaterial(LASSO_SHADER);

export const LETTER_SPACE = 6;

export const MARGIN_BOTTOM = 2;

export const MARGIN_LEFT = 2;

export const MARGIN_RIGHT = 2;

export const MARGIN_TOP = 2;

export const MATRICES_COLORS = {};

export const PILE_AREA_BG = new THREE.MeshBasicMaterial({
  color: COLORS.PRIMARY,
  transparent: true,
  opacity: 0.2
});

export const PILE_AREA_BORDER = new THREE.ShaderMaterial(LINE_SHADER({
  side: THREE.DoubleSide,
  diffuse: COLORS.PRIMARY,
  thickness: 1,
  opacity: 0.5
}));

export const PILE_AREA_POINTS = new THREE.MeshBasicMaterial({
  color: COLORS.PRIMARY,
  transparent: true,
  opacity: 1
});

export const MATRIX_FRAME_ENCODING = null;

export const MATRIX_FRAME_THICKNESS = 2;

export const MATRIX_FRAME_THICKNESS_MAX = 10;

export const MATRIX_GAP_HORIZONTAL = 6;

export const MATRIX_GAP_VERTICAL = 6;

export const MATRIX_ORIENTATION_UNDEF = 0;

export const MATRIX_ORIENTATION_INITIAL = 1;

export const MATRIX_ORIENTATION_5_TO_3 = 2;

export const MATRIX_ORIENTATION_3_TO_5 = 3;

/**
 * Mean
 *
 * @type {Number}
 */
export const MODE_MEAN = 0;

/**
 * Mean average deviation
 *
 * @type {Number}
 */
export const MODE_MAD = 1;

/**
 * Standard deviaton
 *
 * @type {Number}
 */
export const MODE_STD = 2;

export const ORDER_DATA = 0;

export const ORDER_GLOBAL = 1;

export const ORDER_LOCAL = 2;

export const PILE_LABEL_HEIGHT = 10;

export const PILE_MENU_CLOSING_DELAY = 200;

export const PILES = {};

export const PILE_COLORS_CATEGORICAL = pileColors.categorical.length;

export const PREVIEW_SIZE = 2;

export const PREVIEW_MAX = 8;

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

export const Z_BASE = 1;

export const Z_DRAG = 2;

export const Z_HIGHLIGHT = 3;

export const Z_HIGHLIGHT_AREA = 2.5;

export const Z_LASSO = 9;

export const Z_MENU = 9;

export const Z_STACK_PILE_TARGET = 2;

export const ZOOM_DELAY_TIME = 500;
