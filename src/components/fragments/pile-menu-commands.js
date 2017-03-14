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

export const BW = {
  buttons: [
    {
      name: 'Black & White',
      color: COLORS.WHITE,
      background: COLORS.BLACK,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignBW', { pile: this.pile }
        );
      }
    }
  ],
  isColoredOnly: true
};

export const COLOR = {
  buttons: [
    {
      name: 'G',
      minWidth: 1,
      color: COLORS.BLACK,
      background: COLORS.GREEN,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile: this.pile, color: 'green' }
        );
      }
    },
    {
      name: 'Y',
      minWidth: 1,
      color: COLORS.BLACK,
      background: COLORS.YELLOW,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile: this.pile, color: 'yellow' }
        );
      }
    },
    {
      name: 'C',
      minWidth: 1,
      color: COLORS.BLACK,
      background: COLORS.CYAN,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile: this.pile, color: 'cyan' }
        );
      }
    },
    {
      name: 'R',
      minWidth: 1,
      color: COLORS.WHITE,
      background: COLORS.RED,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile: this.pile, color: 'red' }
        );
      }
    },
    {
      name: 'B',
      minWidth: 1,
      color: COLORS.WHITE,
      background: COLORS.BLUE,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile: this.pile, color: 'blue' }
        );
      }
    },
    {
      name: 'P',
      minWidth: 1,
      color: COLORS.BLACK,
      background: COLORS.PINK,
      trigger () {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile: this.pile, color: 'pink' }
        );
      }
    }
  ]
};

export const INSPECT = {
  buttons: [{
    name: 'Inspect',
    color: COLORS.WHITE,
    background: COLORS.BLACK,
    trigger (pile) {
      event.publish(
        'decompose.fgm.inspectPile', { pile: this.pile }
      );
    }
  }],
  stackedPileOnly: true
};

export const DISPERSE = {
  buttons: [{
    name: 'Disperse',
    color: COLORS.WHITE,
    background: COLORS.BLACK,
    trigger (pile) {
      store.dispatch(dispersePiles([this.pile.id]));
    }
  }],
  stackedPileOnly: true
};

export const MAD = {
  buttons: [{
    name: 'Mean Avg. Dev.',
    color: COLORS.WHITE,
    background: 0x666666,
    row: 0,
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_MAD, pile: this.pile }
      );
    },
    triggerEvent: 'hover'
  }],
  stackedPileOnly: true
};

export const MEAN = {
  buttons: [{
    name: 'Mean',
    color: COLORS.WHITE,
    background: 0x666666,
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_MEAN, pile: this.pile }
      );
    },
    triggerEvent: 'hover'
  }],
  stackedPileOnly: true
};

export const RECOVER = {
  buttons: [{
    name: 'Recover',
    color: COLORS.WHITE,
    background: COLORS.BLACK,
    trigger (pile) {
      store.dispatch(recoverPiles([this.pile.id]));
    },
    closeOnClick: true,
    unsetHighlightOnClick: true
  }],
  trashedOnly: true
};

export const TRASH = {
  buttons: [{
    name: 'Trash',
    color: COLORS.WHITE,
    background: COLORS.BLACK,
    trigger (pile) {
      store.dispatch(trashPiles([this.pile.id]));
    },
    closeOnClick: true
  }],
  unsetHighlightOnClick: true
};

export const STD = {
  buttons: [{
    name: 'Standard Dev.',
    color: COLORS.WHITE,
    background: 0x666666,
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_STD, pile: this.pile }
      );
    },
    triggerEvent: 'hover'
  }],
  stackedPileOnly: true
};

export default [
  INSPECT,
  DISPERSE,
  COLOR,
  BW,
  TRASH,
  RECOVER,
  MEAN,
  MAD,
  STD
];
