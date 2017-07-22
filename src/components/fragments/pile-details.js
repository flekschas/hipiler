// Aurelia
import {
  inject,  // eslint-disable-line
  LogManager
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

import States from 'services/states';  // eslint-disable-line

import FgmState from 'components/fragments/fragments-state';

let fgmState = FgmState.get();
const logger = LogManager.getLogger('details');


@inject(EventAggregator, States)
export class PileDetails {
  constructor (event, states) {
    this.event = event;

    // Link the Redux store
    this.store = states.store;
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    // Dummy pile
    this.pile = { fake: true };

    this.previewElRatioCss = {
      paddingTop: '100%'
    };
  }


  /* ----------------------- Aurelia-specific methods ----------------------- */

  attached () {
    this.subscribeEventListeners();
  }

  detached () {
    this.unsubscribeStore();
    this.unsubscribeEventListeners();
  }


  /* ---------------------------- Custom methods ---------------------------- */

  drawPreview () {
    if (!this.pile.isDrawn) { return; }

    const ctx = this.previewEl.getContext('2d');
    const pileCan = this.pile.matrixMesh.material.map.image;

    this.previewEl.width = pileCan.width;
    this.previewEl.height = pileCan.height;

    let offset = 0;
    let previewCan;

    if (this.pile.previewsMesh) {
      offset += this.pile.previewsHeight;
      previewCan = this.pile.previewsMesh.material.map.image;

      const ratio = this.previewEl.height / this.previewEl.width * 100;
      this.previewElRatioCss = {
        paddingTop: `${ratio}%`
      };

      console.log(previewCan, offset, this.previewEl.height);
    }

    ctx.drawImage(pileCan, 0, offset);

    if (previewCan) {
      ctx.drawImage(previewCan, 0, 0, previewCan.width, previewCan.height);
    }
  }

  highlightPile () {
    this.event.publish('explore.fgm.highlightPile', this.pile, true);
    this.event.publish(
      'explore.fgm.pileFocus',
      this.pile.pileMatrices.map(matrix => matrix.id)
    );
  }

  pileSelected (pile) {
    this.pile = pile;

    this.drawPreview();
  }

  subscribeEventListeners () {
    this.subscriptions = [];
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.selectPile',
      this.pileSelected.bind(this)
    ));
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.redrawPiles',
      this.drawPreview.bind(this)
    ));
  }

  unsubscribeEventListeners () {
    // Remove Aurelia event listeners
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = [];
  }

  update () {}
}
