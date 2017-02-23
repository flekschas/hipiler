import { Container } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import States from 'services/states';

import {
  dispersePiles,
  recoverPiles,
  trashPiles
} from 'components/fragments/fragments-actions';

import {
  MODE_MAD, MODE_MEAN, MODE_STD
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
  stackedPileOnly: true
};

export const DISPERSE = {
  name: 'Disperse',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'D',
  trigger (pile) {
    store.dispatch(dispersePiles([pile.id]));
  },
  stackedPileOnly: true
};

export const MAD = {
  name: 'Mean Avg. Dev.',
  color: COLORS.WHITE,
  background: 0x666666,
  row: 0,
  shortCut: 'F',
  trigger (pile) {
    event.publish('decompose.fgm.coverDispMode', { mode: MODE_MAD, pile });
  },
  triggerEvent: 'hover',
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
  stackedPileOnly: true
};

export const RECOVER = {
  name: 'Recover',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'R',
  trigger (pile) {
    store.dispatch(recoverPiles([pile.id]));
  },
  trashedOnly: true,
  closeOnClick: true,
  unsetHighlightOnClick: true
};

export const TRASH = {
  name: 'Trash',
  color: COLORS.WHITE,
  background: COLORS.BLACK,
  shortCut: 'R',
  trigger (pile) {
    store.dispatch(trashPiles([pile.id]));
  },
  closeOnClick: true,
  unsetHighlightOnClick: true
};

export const STD = {
  name: 'Standard Dev.',
  color: COLORS.WHITE,
  background: 0x666666,
  shortCut: 'V',
  trigger (pile) {
    event.publish('decompose.fgm.coverDispMode', { mode: MODE_STD, pile });
  },
  triggerEvent: 'hover',
  stackedPileOnly: true
};

export default [
  INSPECT,
  DISPERSE,
  TRASH,
  RECOVER,
  MEAN,
  MAD,
  STD
];
