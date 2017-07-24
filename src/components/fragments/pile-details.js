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

    this.chartletUpdate = ['explore.pileDetails.colResized'];
  }


  /* ----------------------- Aurelia-specific methods ----------------------- */

  attached () {
    this.subscribeEventListeners();
  }

  detached () {
    this.unsubscribeStore();
    this.unsubscribeEventListeners();
  }


  /* -------------------------- Getter and Setters -------------------------- */

  get snippetIds () {
    if (this.pile.fake) { return []; }

    return this.pile.pileMatrices.map(matrix => matrix.id).join(', ');
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
      offset = this.pile.previewsHeight;
      this.previewEl.height += offset;
      previewCan = this.pile.previewsMesh.material.map.image;

      const ratio = this.previewEl.height / this.previewEl.width * 100;
      this.previewElRatioCss = {
        paddingTop: `${ratio}%`
      };
    }

    ctx.drawImage(pileCan, 0, offset);

    if (previewCan) {
      ctx.drawImage(previewCan, 0, 0, previewCan.width, previewCan.height);
    }
  }

  extractCategories () {
    // Init the categories array
    this.categories = Object
      .keys(this.pile.pileMatrices[0].categories)
      .map(key => ({ key, values: [] }));

    // Populate the values
    this.pile.pileMatrices
      .map(matrix => Object.keys(matrix.categories)
        .forEach((key, index) => {
          const value = matrix.categories[key];

          this.categories[index].values.push(value);
        })
      );
  }

  extractMeasures () {
    // Init the measure array
    this.measures = Object
      .keys(this.pile.pileMatrices[0].measures)
      .map(key => ({ key, max: -Infinity, min: Infinity, values: [] }));

    // Populate the values
    this.pile.pileMatrices
      .map(matrix => Object.keys(matrix.measures)
        .forEach((key, index) => {
          const value = matrix.measures[key];

          this.measures[index].values.push(value);

          if (value < this.measures[index].min) {
            this.measures[index].min = value;
          }

          if (value > this.measures[index].max) {
            this.measures[index].max = value;
          }
        })
      );
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

    if (this.pile.fake) { return; }

    this.isSingle = this.pile.pileMatrices.length === 1;

    this.drawPreview();
    this.extractCategories();
    this.extractMeasures();
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

  update () {
    const columnWidth = this.store.getState().present.explore.columns.details;

    if (!this.columnWidth || this.columnWidth !== columnWidth) {
      this.event.publish(this.chartletUpdate[0]);
    }
  }
}
