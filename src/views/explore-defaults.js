export const COLUMN_NAMES = [
  'matrix',
  'details'
];

export const COLUMNS = {
  matrixWidth: 40,
  matrixWidthUnit: '%',
  detailsWidth: 15,
  detailsWidthUnit: 'rem'
};

export const CSS = {
  details: {
    flexBasis: `${COLUMNS.detailsWidth}${COLUMNS.detailsWidthUnit}`
  },
  matrix: {
    flexBasis: `${COLUMNS.matrixWidth}${COLUMNS.matrixWidthUnit}`
  }
};

export default {
  COLUMN_NAMES,
  COLUMNS
};
