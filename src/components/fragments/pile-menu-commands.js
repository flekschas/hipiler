import { Container } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import States from 'services/states';

import {
  recoverPiles,
  trashPiles
} from 'components/fragments/fragments-actions';

import {
  MODE_AVERAGE, MODE_VARIANCE
} from 'components/fragments/fragments-defaults';

const store = Container.instance.get(States).store;
const event = Container.instance.get(EventAggregator);

export const COLOR = {
  buttons: [
    {
      name: 'X',
      css: {
        color: '#000',
        background: '#fff',
        boxShadow: 'inset 0 0 0 1px #efefef',
        marginRight: '0.25rem'
      },
      trigger (pile) {
        event.publish('explore.fgm.pileAssignBW', { pile });
      },
      isColoredOnly: true
    },
    {
      name: 'G',
      minWidth: 1,
      css: {
        color: '#007f00',
        background: '#d5f4d5'
      },
      trigger (pile) {
        event.publish(
          'explore.fgm.pileAssignColor', { pile, color: 'green' }
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
          'explore.fgm.pileAssignColor', { pile, color: 'yellow' }
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
        event.publish('explore.fgm.pileAssignColor', { pile, color: 'cyan' });
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
        event.publish('explore.fgm.pileAssignColor', { pile, color: 'red' });
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
        event.publish('explore.fgm.pileAssignColor', { pile, color: 'blue' });
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
        event.publish('explore.fgm.pileAssignColor', { pile, color: 'pink' });
      }
    }
  ],
  label: 'Assign Color'
};

export const COVER_AVERAGE = {
  buttons: [{
    name: 'Average cover',
    trigger (pile) {
      event.publish('explore.fgm.coverDispMode', { mode: MODE_AVERAGE, pile });
    }
  }],
  stackedPileOnly: true
};

export const COVER_VARIANCE = {
  buttons: [{
    name: 'Variance cover',
    trigger (pile) {
      event.publish(
        'explore.fgm.coverDispMode', { mode: MODE_VARIANCE, pile }
      );
    }
  }],
  stackedPileOnly: true
};

export const DISPERSE = {
  buttons: [{
    name: 'Disperse',
    trigger (pile) {
      event.publish('explore.fgm.dispersePiles', [pile]);
    },
    closeOnClick: true
  }],
  stackedPileOnly: true
};

export const INSPECT = {
  buttons: [{
    name: 'Inspect',
    trigger (pile) {
      event.publish('explore.fgm.inspectPiles', [pile]);
      event.publish('explore.fgm.removePileArea');
    },
    closeOnClick: true
  }],
  stackedPileOnly: true
};

export const RECOVER = {
  buttons: [{
    name: 'Recover',
    trigger (pile) {
      store.dispatch(recoverPiles([pile.id]));
      event.publish('explore.fgm.pileMouseLeave');
      event.publish('explore.fgm.pileUnhighlight');
      event.publish('explore.fgm.removePileArea');
    },
    closeOnClick: true
  }],
  trashedOnly: true
};

export const REMOVE = {
  buttons: [{
    name: 'Remove',
    trigger (pile) {
      event.publish('explore.fgm.removeFromPile', [pile]);
    },
    closeOnClick: true
  }],
  inspectionOnly: true
};

export const SEPARATOR = {
  buttons: [],
  isSeparator: true
};

export const SHOW_IN_MATRIX = {
  buttons: [{
    name: 'Show in matrix',
    trigger (pile) {
      event.publish('explore.fgm.showInMatrix', pile);
    }
  }]
};

export const TRASH = {
  buttons: [{
    name: 'Move to trash',
    trigger (pile) {
      store.dispatch(trashPiles([pile.id]));
      event.publish('explore.fgm.pileMouseLeave');
      event.publish('explore.fgm.pileUnhighlight');
      event.publish('explore.fgm.removePileArea');
    },
    closeOnClick: true
  }],
  notInTrash: true
};

export default [
  INSPECT,
  DISPERSE,
  REMOVE,
  SEPARATOR,
  SHOW_IN_MATRIX,
  SEPARATOR,
  COLOR,
  SEPARATOR,
  TRASH,
  RECOVER,
  SEPARATOR,
  COVER_AVERAGE,
  COVER_VARIANCE
];
