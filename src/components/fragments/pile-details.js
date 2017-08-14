// Aurelia
import {
  inject,  // eslint-disable-line
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

import States from 'services/states';  // eslint-disable-line

import FgmState from 'components/fragments/fragments-state';

import {
  annotatePiles
} from 'components/fragments/fragments-actions';

import debounce from 'utils/debounce';

let fgmState = FgmState.get();

const FAKE_PILE = { fake: true };


@inject(EventAggregator, States)
export class PileDetails {
  constructor (event, states) {
    this.event = event;

    // Link the Redux store
    this.store = states.store;
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    this.annotate = debounce(this.annotationInputHandler.bind(this), 2000);

    // Dummy pile
    this.pile = FAKE_PILE;

    this.previewElRatioCss = {
      paddingTop: '100%'
    };

    this.chartletUpdate = ['explore.pileDetails.colResized'];

    this.update();
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

  annotationInputHandler (text) {
    this.store.dispatch(annotatePiles(
      [this.pile.idNumeric], [this.pile.pileMatrices.length === 1], [text]
    ));

    return true;
  }

  checkHighlight () {
    this.isHighlighted = this.pile === fgmState.pileHighlight;
    return this.isHighlighted;
  }

  drawPreview () {
    if (!this.pile.isDrawn) { return; }

    const ctx = this.previewEl.getContext('2d');
    const pileCan = this.pile.matrixMesh.material.map.image;

    this.previewEl.width = pileCan.width;
    this.previewEl.height = pileCan.height;

    let offset = this.pile.previewsMesh ? this.pile.previewsHeight : 0;
    let previewCan;

    this.previewEl.height += offset;

    if (offset) {
      previewCan = this.pile.previewsMesh.material.map.image;
    }

    const ratio = this.previewEl.height / this.previewEl.width * 100;
    this.previewElRatioCss = {
      paddingTop: `${ratio}%`
    };

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

  getAnnotation (id) {
    return this.annotations[id];
  }

  highlightPile () {
    if (!this.checkHighlight()) {
      this.event.publish('explore.fgm.highlightPile', this.pile, true);
    }
  }

  pileSelected (pileId) {
    if (this.pileId === pileId) { return; }

    this.pileId = pileId;

    fgmState.isReady.then(() => {
      this.pile = fgmState.pilesIdx[this.pileId] || FAKE_PILE;

      if (this.pile.fake) { return; }

      this.isSingle = this.pile.pileMatrices.length === 1;
      this.annoId = this.isSingle ?
        `_${this.pile.idNumeric}` : this.pile.idNumeric;

      this.drawPreview();
      this.checkHighlight();
      this.extractCategories();
      this.extractMeasures();
      this.annotation = this.getAnnotation(this.annoId);
    });
  }

  subscribeEventListeners () {
    this.subscriptions = [];
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.selectPile', this.pileSelected.bind(this)
    ));
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.redrawPiles', this.drawPreview.bind(this)
    ));
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileDetailsRedraw', this.drawPreview.bind(this)
    ));
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileBlur', this.checkHighlight.bind(this)
    ));
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileFocus', this.checkHighlight.bind(this)
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
    const state = this.store.getState().present.explore;
    const stateFgm = state.fragments;
    const columnWidth = state.columns.detailsWidth;

    if (!this.columnWidth || this.columnWidth !== columnWidth) {
      this.columnWidth = columnWidth;
      this.event.publish(this.chartletUpdate[0]);
    }

    this.pileSelected(stateFgm.pileSelected);
    this.updateAnnotations(stateFgm.annotations);
  }

  updateAnnotations (annotations) {
    if (this.annotations === annotations) { return; }

    this.annotations = annotations;

    if (typeof this.annoId !== 'undefined') {
      this.annotation = this.getAnnotation(this.annoId);
    }
  }
}
