import { Container } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import States from 'services/states';

import { dispersePiles, trashPiles } from 'components/fragments/fragments-actions';

import {
  MODE_MEAN, MODE_TREND, MODE_VARIANCE, MODE_DIFFERENCE
} from 'components/fragments/fragments-defaults';

import COLORS from 'configs/colors';

const store = Container.instance.get(States).store;
const event = Container.instance.get(EventAggregator);

export const INSPECT = {
  name: 'Inspect',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'I',
  trigger (pile) {
    event.publish('decompose.fgm.inspectPile', { pile });
  },
  single: false,
  stackedPileOnly: true
};

export const DISPERSE = {
  name: 'Disperse',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'D',
  trigger (pile) {
    store.dispatch(dispersePiles([pile]));
  },
  single: false,
  stackedPileOnly: true
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
  single: false,
  stackedPileOnly: true
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
  stackedPileOnly: true
};

export const TRASH = {
  name: 'Trash',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'R',
  trigger (pile) {
    store.dispatch(trashPiles([pile]));
  },
  single: false,
  stackedPileOnly: true
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
  single: false,
  stackedPileOnly: true
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
  single: false,
  stackedPileOnly: true
};

export default [
  INSPECT,
  DISPERSE,
  TRASH,
  MEAN,
  VARIANCE,
  TREND,
  DIFFERENCE
];
