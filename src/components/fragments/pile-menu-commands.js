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
        event.publish('decompose.fgm.pileAssignBW', { pile });
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
        event.publish('decompose.fgm.pileAssignColor', { pile, color: 'cyan' });
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
        event.publish('decompose.fgm.pileAssignColor', { pile, color: 'red' });
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
        event.publish('decompose.fgm.pileAssignColor', { pile, color: 'blue' });
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
        event.publish('decompose.fgm.pileAssignColor', { pile, color: 'pink' });
      }
    }
  ]
};

export const INSPECT = {
  buttons: [{
    name: 'Inspect',
    trigger (pile) {
      event.publish('decompose.fgm.inspectPiles', [pile]);
      event.publish('decompose.fgm.removePileArea');
    },
    closeOnClick: true
  }],
  stackedPileOnly: true
};

export const DISPERSE = {
  buttons: [{
    name: 'Disperse',
    trigger (pile) {
      event.publish('decompose.fgm.dispersePiles', [pile]);
    },
    closeOnClick: true
  }],
  stackedPileOnly: true
};

export const MAD = {
  buttons: [{
    name: 'Mean Avg. Dev.',
    row: 0,
    trigger (pile) {
      event.publish('decompose.fgm.coverDispMode', { mode: MODE_MAD, pile });
    }
  }],
  stackedPileOnly: true
};

export const MEAN = {
  buttons: [{
    name: 'Average Cover',
    trigger (pile) {
      event.publish('decompose.fgm.coverDispMode', { mode: MODE_MEAN, pile });
    }
  }],
  stackedPileOnly: true
};

export const RECOVER = {
  buttons: [{
    name: 'Recover',
    trigger (pile) {
      store.dispatch(recoverPiles([pile.id]));
      event.publish('decompose.fgm.pileMouseLeave');
      event.publish('decompose.fgm.pileUnhighlight');
      event.publish('decompose.fgm.removePileArea');
    },
    closeOnClick: true
  }],
  trashedOnly: true
};

export const REMOVE = {
  buttons: [{
    name: 'Remove',
    trigger (pile) {
      event.publish('decompose.fgm.removeFromPile', [pile]);
    },
    closeOnClick: true
  }],
  inspectionOnly: true
};

export const TRASH = {
  buttons: [{
    name: 'Trash',
    trigger (pile) {
      store.dispatch(trashPiles([pile.id]));
      event.publish('decompose.fgm.pileMouseLeave');
      event.publish('decompose.fgm.pileUnhighlight');
      event.publish('decompose.fgm.removePileArea');
    },
    closeOnClick: true
  }],
  notInTrash: true
};

export const STD = {
  buttons: [{
    name: 'Variance Cover',
    trigger (pile) {
      event.publish(
        'decompose.fgm.coverDispMode', { mode: MODE_STD, pile }
      );
    }
  }],
  stackedPileOnly: true
};

export default [
  INSPECT,
  DISPERSE,
  REMOVE,
  COLOR,
  BW,
  TRASH,
  RECOVER,
  MEAN,
  // MAD,
  STD
];
