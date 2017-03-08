// Aurelia
import { inject, LogManager } from 'aurelia-framework';

// Injectables
import States from 'services/states';

// Utils etc.
import $ from 'utils/dom-el';
import debounce from 'utils/debounce';
import ping from 'utils/ping';
import { createHgComponent as hg } from 'hglib';
import { requestNextAnimationFrame } from 'utils/request-animation-frame';
import {
  setGrayscale,
  setFragmentsHighlight,
  setInteractions
} from 'components/higlass/higlass-actions';
import {
  GRAYSCALE_COLORS
} from 'components/higlass/higlass-defaults';

import deepClone from 'utils/deep-clone';

const logger = LogManager.getLogger('higlass');

const OPTIONS = {
  bounded: true
};

@inject(States)
export class Higlass {
  constructor (states) {
    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.renderDb = debounce(this.render.bind(this), 50);
    this.checkColumnsDb = debounce(this.checkColumns.bind(this), 150);

    this.isLoading = true;
  }

  attached () {
    this.update();

    setTimeout(() => { this.isLoading = false; }, 150);
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  get isErrored () {
    return this._isErrored;
  }

  set isErrored (value) {
    if (!value) {
      this.errorMsg = undefined;
    }

    this._isErrored = value;
  }


  /* ---------------------------- Custom Methods ---------------------------- */

  areServersAvailable (config) {
    let servers;

    try {
      // This needs refactoring but we need to wait until Higlass's config has
      // been refactored.
      servers = [config.views[0].tracks.center[0].contents[0].server];
    } catch (e) {
      return Promise.reject(Error('Broken config'));
    }

    return Promise.all(servers.map(server => ping(server)));
  }

  checkColumns (newColumns) {
    if (this.columns !== newColumns) {
      this.columns = newColumns;

      // For HiGlass to rerender
      requestNextAnimationFrame(() => {
        $(window).dispatch('resize', 'HTMLEvents');
      });
    }
  }

  /**
   * Extract loci in modified BEDPE format for higlass.
   *
   * @param {object} fgmConfig - Fragment config.
   * @return {array} List of loci.
   */
  extractLoci (fgmConfig) {
    const dataIdxChrom1 = fgmConfig.fragmentsHeader.indexOf('chrom1');
    const dataIdxStart1 = fgmConfig.fragmentsHeader.indexOf('start1');
    const dataIdxEnd1 = fgmConfig.fragmentsHeader.indexOf('end1');
    const dataIdxChrom2 = fgmConfig.fragmentsHeader.indexOf('chrom2');
    const dataIdxStart2 = fgmConfig.fragmentsHeader.indexOf('start2');
    const dataIdxEnd2 = fgmConfig.fragmentsHeader.indexOf('end2');

    return fgmConfig.fragments.map(fragment => [
      `chr${fragment[dataIdxChrom1]}`,
      fragment[dataIdxStart1],
      fragment[dataIdxEnd1],
      `chr${fragment[dataIdxChrom2]}`,
      fragment[dataIdxStart2],
      fragment[dataIdxEnd2],
      'rgba(255, 85, 0, 0.8)'
    ]);
  }

  /**
   * Handles changes of highlighting fragments.
   */
  fragmentsHighlightChangeHandler () {
    this.store.dispatch(setFragmentsHighlight(!this.fragmentsHighlight));

    return true;
  }

  /**
   * Handles changes of grayscale.
   */
  grayscaleChangeHandler () {
    this.store.dispatch(setGrayscale(!this.grayscale));

    return true;
  }

  /**
   * Helper method for showing an error.
   *
   * @param {string} errorMsg - Error message to be displayed.
   */
  hasErrored (errorMsg) {
    this.errorMsg = errorMsg;
    this.isErrored = true;
  }

  /**
   * Handles changes of interaction.
   */
  interactionsChangeHandler () {
    this.store.dispatch(setInteractions(!this.interactions));

    return true;
  }

  update () {
    try {
      const state = this.store.getState().present.decompose;

      const update = {};

      this.checkColumnsDb(state.columns, update);
      this.updateConfig(state.higlass.config, update);
      this.updateInteractions(
        state.higlass.interactions, update, update.render
      );
      this.updateGrayscale(state.higlass.grayscale, update, update.render);
      this.updateFragmentsHighlight(
        state.higlass.fragmentsHighlight,
        state.fragments.config,
        update,
        update.render
      );

      if (update.render) {
        this.renderDb(this.config);
      }
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  updateConfig (config, update) {
    if (this.originalConfig === config) { return; }

    this.originalConfig = config;
    this.config = deepClone(config);

    this.originalColoring = config
      .views[0].tracks.center[0].contents[0].options.colorRange.slice();

    update.render = true;
  }

  updateInteractions (interactions, update, force) {
    if (this.interactions === interactions && !force) { return; }

    this.interactions = interactions;

    this.config.zoomFixed = !this.interactions;

    update.render = true;
  }

  updateGrayscale (grayscale, update, force) {
    if (this.grayscale === grayscale && !force) { return; }

    this.grayscale = grayscale;

    if (this.grayscale) {
      this.config.views[0].tracks.center[0].contents[0].options.colorRange =
        GRAYSCALE_COLORS;
    } else {
      this.config.views[0].tracks.center[0].contents[0].options.colorRange =
        this.originalColoring;
    }

    update.render = true;
  }

  updateFragmentsHighlight (fgmHighlight, fgmConfig, update, force) {
    if (this.fragmentsHighlight === fgmHighlight && !force) { return; }

    this.fragmentsHighlight = fgmHighlight;

    if (this.config.views[0].tracks.center.length > 1) {
      this.config.views[0].tracks.center = [
        this.config.views[0].tracks.center[0]
      ];
    }

    if (this.fragmentsHighlight) {
      const loci = this.extractLoci(fgmConfig);

      if (this.loci !== loci) {
        this.loci = loci;
        this.loci2dTrack = {
          uid: 'g',
          type: '2d-chromosome-annotations',
          chromInfoPath: '//s3.amazonaws.com/pkerp/data/hg19/chromSizes.tsv',
          options: {
            minRectWidth: 2,
            minRectHeight: 2,
            regions: loci
          }
        };
      }

      this.config.views[0].tracks.center.push(this.loci2dTrack);
    }

    update.render = true;
  }

  render (config) {
    this.areServersAvailable(config)
      .then(() => {
        hg(this.plotEl, deepClone(config), OPTIONS, (api) => { this.api = api; });
      })
      .catch((error) => {
        this.hasErrored('Server not available');
      });
  }
}
