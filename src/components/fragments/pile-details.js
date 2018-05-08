// Aurelia
import {
  inject,  // eslint-disable-line
  bindable,
  bindingMode
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

import States from 'services/states';  // eslint-disable-line

import FgmState from 'components/fragments/fragments-state';

import {
  annotatePiles,
  selectPile
} from 'components/fragments/fragments-actions';

import debounce from 'utils/debounce';
import flatten from 'utils/flatten';

import {
  requestNextAnimationFrame
} from 'utils/request-animation-frame';

let fgmState = FgmState.get();

const FAKE_PILE = { fake: true };


@inject(EventAggregator, States)
export class PileDetails {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) isShown;  // eslint-disable-line

  constructor (event, states) {
    this.event = event;

    // Link the Redux store
    this.store = states.store;
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    this.annotate = debounce(this.annotationInputHandler.bind(this), 1000);

    // Dummy pile
    this.pile = FAKE_PILE;

    this.previewElRatioCss = {
      paddingTop: '100%'
    };

    this.chartletUpdate = ['explore.pileDetails.colResized'];
    this.publishCHartletUpdateDb = debounce(
      this.publishCHartletUpdate.bind(this), 50
    );

    this.update();
  }


  /* ----------------------- Aurelia-specific methods ----------------------- */

  attached () {
    fgmState = FgmState.get();
    this.subscribeEventListeners();
  }

  detached () {
    this.store.dispatch(selectPile(null));
    this.unsubscribeStore();
    this.unsubscribeEventListeners();
  }


  /* -------------------------- Getter and Setters -------------------------- */

  get pilesIdx () {
    return fgmState.isPilesInspection ?
      fgmState.pilesIdxInspection :
      fgmState.pilesIdx;
  }

  get snippetIds () {
    if (this.pile.fake) { return []; }

    return this.pile.pileMatrices.map(matrix => matrix.id).join(', ');
  }


  /* ---------------------------- Custom methods ---------------------------- */

  annotateImmediate (text) {
    this.annotate.cancel();
    this.annotationInputHandler(text);
  }

  annotationInputHandler (text) {
    if (text && text !== this.getAnnotation(this.annoId)) {
      this.store.dispatch(annotatePiles(
        [this.pile.idNumeric], [this.pile.pileMatrices.length === 1], [text]
      ));
    }

    return true;
  }

  checkHighlight () {
    this.isHighlighted = this.pile === fgmState.pileHighlight;
    return this.isHighlighted;
  }

  drawPreview () {
    if (!this.pile.isDrawn) { return; }

    requestNextAnimationFrame(() => {
      this.drawPreviewPreviews();
      this.drawPreviewSnippet();
    });
  }

  drawPreviewSnippet () {
    if (!this.pile.isDrawn) { return; }

    const ctx = this.previewSnippetEl.getContext('2d');
    const pileCan = this.pile.matrixMesh.material.map.image;

    this.previewSnippetEl.width = pileCan.width;
    this.previewSnippetEl.height = pileCan.height;

    ctx.drawImage(pileCan, 0, 0);
  }

  drawPreviewPreviews () {
    if (!this.pile.isDrawn) { return; }
    if (!this.pile.previewsMesh) {
      this.previewsRatioCss = { paddingTop: 0 };
      return;
    }

    const ctx = this.previewPreviewsEl.getContext('2d');
    const previewCan = this.pile.previewsMesh.material.map.image;

    this.previewPreviewsEl.height = previewCan.height;
    this.previewPreviewsEl.width = previewCan.width;

    this.previewsRatioCss = {
      paddingTop: `${this.pile.clustersAvgMatrices.length * 3}%`
    };

    ctx.drawImage(previewCan, 0, 0);
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
      .map(key => ({
        key, max: -Infinity, min: Infinity, values: []
      }));

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

  getDatasets () {
    if (!this.pile || !this.pile.pileMatrices) this.pileDatasets = '';

    const state = this.store.getState().present.explore;

    const heatmaps = state.higlass.config.views
      .map(
        view => view.tracks.center
          .filter(track => track.type === 'combined')
          .map(
            track => track.contents
              .filter(trackc => trackc.type === 'heatmap')
          )
          .reduce(...flatten)
      )
      .reduce(...flatten)
      .reduce((a, b) => { a[b.tilesetUid] = b; return a; }, {});

    this.pileDatasets = this.pile.pileMatrices
      .map(matrix => matrix.dataset)
      .reduce((a, b) => {
        const idx = a.indexOf(b);
        if (idx === -1) a.push(b);
        return a;
      }, [])
      .map(uuid => heatmaps[uuid].options.name || heatmaps[uuid].options.orgName)
      .join(', ');
  }

  getLocus () {
    if (!this.pile || !this.pile.pileMatrices) this.pileLocus = '';
    const { locus } = this.pile.pileMatrices[0];
    this.pileLocus = `chr${locus.chrom1} ${locus.start1}:${locus.end1} & chr${locus.chrom2} ${locus.start2}:${locus.end2}`;
  }

  highlightPile () {
    // Speculative update for responsiveness
    this.isHighlighted = true;
    if (!this.checkHighlight()) {
      this.event.publish('explore.fgm.highlightPile', this.pile, true);
    }
  }

  pileSelected (pileId) {
    this.pileId = pileId;

    fgmState.isReady.then(() => {
      this.pile = this.pilesIdx[this.pileId] || FAKE_PILE;

      if (this.pile.fake) { return; }

      this.isSingle = this.pile.pileMatrices.length === 1;
      this.annoId = this.isSingle ?
        `_${this.pile.idNumeric}` : this.pile.idNumeric;

      this.drawPreview();
      this.checkHighlight();
      this.extractCategories();
      this.extractMeasures();
      this.getLocus();
      this.getDatasets();
      this.annotation = this.getAnnotation(this.annoId);
    });
  }

  publishCHartletUpdate () {
    this.event.publish(this.chartletUpdate[0]);
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
      this.publishCHartletUpdateDb();
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
