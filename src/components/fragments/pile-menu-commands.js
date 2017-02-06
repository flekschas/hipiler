import States from 'services/states';

import { depile, setPileMode } from 'components/fragments/fragments-actions';

import {
  MODE_MEAN, MODE_TREND, MODE_VARIANCE
} from 'components/fragments/fragments-defaults';

export const DEPILE = {
  name: 'Depile',
  row: 2,
  color: 0x7777ff,
  shortCut: 'D',
  trigger (pile) {
    States.store.dispatch(depile(MODE_MEAN, pile));
  },
  single: false
};

export const MEAN = {
  name: 'Mean',
  color: 0x444444,
  row: 0,
  shortCut: 'M',
  trigger (pile) {
    States.store.dispatch(setPileMode(MODE_MEAN, pile));
  },
  single: false
};

export const TREND = {
  name: 'Trend',
  color: 0x555555,
  row: 0,
  shortCut: 'T',
  trigger (pile) {
    States.store.dispatch(setPileMode(MODE_TREND, pile));
  },
  single: false
};

export const VARIANCE = {
  name: 'Variance',
  color: 0x666666,
  row: 0,
  shortCut: 'V',
  trigger (pile) {
    States.store.dispatch(setPileMode(MODE_VARIANCE, pile));
  },
  single: false
};

export default [
  DEPILE,
  MEAN,
  TREND,
  VARIANCE
];
