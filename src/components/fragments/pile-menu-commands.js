import { Container } from 'aurelia-framework';

import States from 'services/states';

import { depile, setPileMode } from 'components/fragments/fragments-actions';

import {
  MODE_MEAN, MODE_TREND, MODE_VARIANCE, MODE_DIFFERENCE
} from 'components/fragments/fragments-defaults';

import COLORS from 'configs/colors';

const store = Container.instance.get(States).store;

export const INSPECT = {
  name: 'Inspect',
  color: COLORS.BLACK,
  background: COLORS.PRIMARY,
  shortCut: 'I',
  trigger (pile) {
    console.error('Not implemented yet');
  },
  single: false
};

export const DEPILE = {
  name: 'Depile',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'D',
  trigger (pile) {
    store.dispatch(depile(MODE_MEAN, pile));
  },
  single: false
};

export const MEAN = {
  name: 'Mean',
  color: COLORS.WHITE,
  background: 0x444444,
  shortCut: 'M',
  trigger (pile) {
    store.dispatch(setPileMode(MODE_MEAN, pile));
  },
  single: false
};

export const TREND = {
  name: 'Trend',
  color: COLORS.WHITE,
  background: 0x555555,
  shortCut: 'T',
  trigger (pile) {
    store.dispatch(setPileMode(MODE_TREND, pile));
  },
  single: false
};

export const VARIANCE = {
  name: 'Variance',
  color: COLORS.WHITE,
  background: 0x666666,
  shortCut: 'V',
  trigger (pile) {
    store.dispatch(setPileMode(MODE_VARIANCE, pile));
  },
  single: false
};

export const DIFFERENCE = {
  name: 'Difference',
  color: COLORS.WHITE,
  background: 0x777777,
  row: 0,
  shortCut: 'F',
  trigger (pile) {
    store.dispatch(setPileMode(MODE_DIFFERENCE, pile));
  },
  single: false
};

export default [
  INSPECT,
  DEPILE,
  MEAN,
  TREND,
  VARIANCE,
  DIFFERENCE
];
