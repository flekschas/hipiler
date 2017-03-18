import { Container } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import States from 'services/states';

import {
  recoverPiles,
  trashPiles
} from 'components/fragments/fragments-actions';

import {
  MODE_MAD, MODE_MEAN, MODE_STD
} from 'components/fragments/fragments-defaults';

const store = Container.instance.get(States).store;
const event = Container.instance.get(EventAggregator);

export const BW = {
  buttons: [
    {
      name: 'Black & White',
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignBW', { pile: pile }
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
      css: {
        color: '#007f00',
        background: '#d5f4d5'
      },
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile, color: 'green' }
        );
      }
    },
    {
      name: 'Y',
      minWidth: 1,
      css: {
        color: '#aa7f00',
        background: '#fff4d5'
      },
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile, color: 'yellow' }
        );
      }
    },
    {
      name: 'C',
      minWidth: 1,
      css: {
        color: '#009795',
        background: '#d5fafa'
      },
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile, color: 'cyan' }
        );
      }
    },
    {
      name: 'R',
      minWidth: 1,
      css: {
        color: '#aa0011',
        background: '#ffd5d9'
      },
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile, color: 'red' }
        );
      }
    },
    {
      name: 'B',
      minWidth: 1,
      css: {
        color: '#280baa',
        background: '#dfd7ff'
      },
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile, color: 'blue' }
        );
      }
    },
    {
      name: 'P',
      minWidth: 1,
      css: {
        color: '#ff00a9',
        background: '#ffd5f1'
      },
      trigger (pile) {
        event.publish(
          'decompose.fgm.pileAssignColor', { pile, color: 'pink' }
        );
      }
    }
  ]
};

export const INSPECT = {
  buttons: [{
    name: 'Inspect',
    trigger (pile) {
      event.publish('decompose.fgm.inspectPile', pile);
    }
  }],
  stackedPileOnly: true
};

export const DISPERSE = {
  buttons: [{
    name: 'Disperse',
    trigger (pile) {
      event.publish('decompose.fgm.dispersePiles', [pile]);
    }
  }],
  stackedPileOnly: true
};

export const MAD = {
  buttons: [{
    name: 'Mean Avg. Dev.',
    row: 0,
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_MAD, pile }
      );
    }
  }],
  stackedPileOnly: true
};

export const MEAN = {
  buttons: [{
    name: 'Mean',
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_MEAN, pile }
      );
    }
  }],
  stackedPileOnly: true
};

export const RECOVER = {
  buttons: [{
    name: 'Recover',
    trigger (pile) {
      store.dispatch(recoverPiles([pile.id]));
    },
    closeOnClick: true,
  }],
  trashedOnly: true
};

export const TRASH = {
  buttons: [{
    name: 'Trash',
    trigger (pile) {
      store.dispatch(trashPiles([pile.id]));
    },
    closeOnClick: true
  }],
  notInTrash: true
};

export const STD = {
  buttons: [{
    name: 'Standard Dev.',
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_STD, pile: pile }
      );
    }
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
