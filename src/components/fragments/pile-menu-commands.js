import { Container } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import States from 'services/states';

import { depile } from 'components/fragments/fragments-actions';

import {
  MODE_MEAN, MODE_TREND, MODE_VARIANCE, MODE_DIFFERENCE
} from 'components/fragments/fragments-defaults';

import COLORS from 'configs/colors';

const store = Container.instance.get(States).store;
const event = Container.instance.get(EventAggregator);

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

export const DIFFERENCE = {
  name: 'Difference',
  color: COLORS.WHITE,
  background: 0x666666,
  row: 0,
  shortCut: 'F',
  trigger (pile) {
    event.publish('decompose.fgm.coverDispMode', { mode: MODE_DIFFERENCE, pile });
  },
  triggerEvent: 'hover',
  single: false
};

export const MEAN = {
  name: 'Mean',
  color: COLORS.WHITE,
  background: 0x666666,
  shortCut: 'M',
  trigger (pile) {
    event.publish('decompose.fgm.coverDispMode', { mode: MODE_MEAN, pile });
  },
  triggerEvent: 'hover',
  single: false,
  marginTop: 3
};

export const TREND = {
  name: 'Trend',
  color: COLORS.WHITE,
  background: 0x666666,
  shortCut: 'T',
  trigger (pile) {
    event.publish('decompose.fgm.coverDispMode', { mode: MODE_TREND, pile });
  },
  triggerEvent: 'hover',
  single: false
};

export const VARIANCE = {
  name: 'Variance',
  color: COLORS.WHITE,
  background: 0x666666,
  shortCut: 'V',
  trigger (pile) {
    event.publish('decompose.fgm.coverDispMode', { mode: MODE_VARIANCE, pile });
  },
  triggerEvent: 'hover',
  single: false
};

export default [
  INSPECT,
  DEPILE,
  MEAN,
  VARIANCE,
  TREND,
  DIFFERENCE
];
