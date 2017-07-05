import {
  Sprite,
  SpriteMaterial,
  TextureLoader
} from 'three';

export const ARROW_MAP = new TextureLoader().load(
  'assets/images/arrow.png'
);

export const ARROW_X_MATERIAL = new SpriteMaterial({
  map: ARROW_MAP
});

export const ARROW_X_MATERIAL_REV = new SpriteMaterial({
  map: ARROW_MAP,
  rotation: Math.PI
});

export const ARROW_Y_MATERIAL = new SpriteMaterial({
  map: ARROW_MAP,
  rotation: Math.PI * 0.5
});

export const ARROW_Y_MATERIAL_REV = new SpriteMaterial({
  map: ARROW_MAP,
  rotation: Math.PI * 1.5
});

export const ARROW_X = new Sprite(ARROW_X_MATERIAL);
export const ARROW_X_REV = new Sprite(ARROW_X_MATERIAL_REV);

export const ARROW_Y = new Sprite(ARROW_Y_MATERIAL);
export const ARROW_Y_REV = new Sprite(ARROW_Y_MATERIAL_REV);

ARROW_X.scale.set(16, 16, 1.0);
ARROW_X_REV.scale.set(16, 16, 1.0);
ARROW_Y.scale.set(16, 16, 1.0);
ARROW_Y_REV.scale.set(16, 16, 1.0);

export const COLOR_INDICATOR_HEIGHT = 4;

export const LABEL_MIN_CELL_SIZE = 2;

export const PREVIEW_LOW_QUAL_THRESHOLD = 0.5;

export const PREVIEW_NUM_CLUSTERS = 8;

export const VALUE_DOMAIN = [0, 1];

export const STD_MAX = (VALUE_DOMAIN[1] - VALUE_DOMAIN[0]) / 2;
