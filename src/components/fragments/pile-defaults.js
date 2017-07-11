import {
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  TextureLoader
} from 'three';

export const ALPHA_FADED_OUT = 0.25;

export const ARROW_BASE_OPACITY = 0.25;

export const ARROW_MAP = new TextureLoader().load(
  'assets/images/arrow.png'
);

export const ARROW_X_MATERIAL = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY,
  transparent: true
});

export const ARROW_X_MATERIAL_FADED_OUT = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY * ALPHA_FADED_OUT,
  transparent: true
});

export const ARROW_X_MATERIAL_REV = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY,
  rotation: Math.PI,
  transparent: true
});

export const ARROW_X_MATERIAL_REV_FADED_OUT = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY * ALPHA_FADED_OUT,
  rotation: Math.PI,
  transparent: true
});

export const ARROW_X_MATERIALS = {
  NORM: ARROW_X_MATERIAL,
  NORM_FADED_OUT: ARROW_X_MATERIAL_FADED_OUT,
  REV: ARROW_X_MATERIAL_REV,
  REV_FADED_OUT: ARROW_X_MATERIAL_REV_FADED_OUT
};

export const ARROW_Y_MATERIAL = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY,
  rotation: Math.PI * 0.5,
  transparent: true
});

export const ARROW_Y_MATERIAL_FADED_OUT = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY * ALPHA_FADED_OUT,
  rotation: Math.PI * 0.5,
  transparent: true
});

export const ARROW_Y_MATERIAL_REV = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY,
  rotation: Math.PI * 1.5,
  transparent: true
});

export const ARROW_Y_MATERIAL_REV_FADED_OUT = new SpriteMaterial({
  map: ARROW_MAP,
  opacity: ARROW_BASE_OPACITY * ALPHA_FADED_OUT,
  rotation: Math.PI * 1.5,
  transparent: true
});

export const ARROW_Y_MATERIALS = {
  NORM: ARROW_Y_MATERIAL,
  NORM_FADED_OUT: ARROW_Y_MATERIAL_FADED_OUT,
  REV: ARROW_Y_MATERIAL_REV,
  REV_FADED_OUT: ARROW_Y_MATERIAL_REV_FADED_OUT
};

export const ARROW_X = new Sprite(ARROW_X_MATERIAL);
export const ARROW_X_REV = new Sprite(ARROW_X_MATERIAL_REV);

export const ARROW_Y = new Sprite(ARROW_Y_MATERIAL);
export const ARROW_Y_REV = new Sprite(ARROW_Y_MATERIAL_REV);

ARROW_X.scale.set(16, 16, 1.0);
ARROW_X_REV.scale.set(16, 16, 1.0);
ARROW_Y.scale.set(16, 16, 1.0);
ARROW_Y_REV.scale.set(16, 16, 1.0);

export const BASE_MATERIAL = new MeshBasicMaterial({
  color: 0xffffff,
  transparent: true
});

export const COLOR_INDICATOR_HEIGHT = 4;

export const LABEL_MIN_CELL_SIZE = 2;

export const PREVIEW_LOW_QUAL_THRESHOLD = 0.5;

export const PREVIEW_NUM_CLUSTERS = 8;

export const PREVIEW_GAP_SIZE = 1;

export const PREVIEW_SIZE = 2;

export const VALUE_DOMAIN = [0, 1];

export const STD_MAX = (VALUE_DOMAIN[1] - VALUE_DOMAIN[0]) / 2;
