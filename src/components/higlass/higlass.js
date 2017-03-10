// Aurelia
import { inject, LogManager } from 'aurelia-framework';

// Third party
import { json } from 'd3';

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
  setInteractions,
  setSelectionView
} from 'components/higlass/higlass-actions';
import {
  GRAYSCALE_COLORS
} from 'components/higlass/higlass-defaults';

import arraysEqual from 'utils/arrays-equal';
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

    this.locationTracker = {};
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
   * Set up HiGlass listeners
   *
   * @param {object} api - HiGlass public API.
   */
  initApi (api) {
    this.config.views.forEach((view) => {
      this.locationTracker[view.uid] = {
        callback: this.trackGenomicLocation(view.uid)
      };

      if (view.trackLocation) {
        this.api.on(
          'location',
          view.uid,
          this.locationTracker[view.uid].callback,
          (id) => { this.locationTracker[view.uid].id = id; }
        );
      }
    });
  }

  /**
   * Handles changes of interaction.
   */
  interactionsChangeHandler () {
    this.store.dispatch(setInteractions(!this.interactions));

    return true;
  }

  /**
   * Load chromosom size infos
   *
   * @param {string} chromInfoUrl - Chromosom size info path.
   */
  loadChromInfo (chromInfoUrl) {
    json(chromInfoUrl, (error, chromInfo) => {
      if (error) { logger.error(error); }

      this.chromInfo = chromInfo;
    });
  }

  /**
   * Track genome locations
   *
   * @param {string} viewId - ID of the view to be tracked.
   */
  trackGenomicLocation (viewId) {
    return (location) => {
      if (
        this.location === location ||
        arraysEqual(this.location, location)
      ) { return; }

      this.location = location;

      if (!this.chromInfo) { return; }

      // Get global locations
      const xStart = this.chromInfo[location[0]].offset + location[1];
      const xEnd = this.chromInfo[location[2]].offset + location[3];
      const yStart = this.chromInfo[location[4]].offset + location[5];
      const yEnd = this.chromInfo[location[6]].offset + location[7];

      // Update state
      this.store.dispatch(setSelectionView([
        xStart,
        xEnd,
        yStart,
        yEnd
      ]));
    };
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
      this.updateSelectionView(state.higlass.selectionView, update);

      if (update.render) {
        this.renderDb(this.config);
      }
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  updateConfig (config, update) {
    if (
      this.originalConfig === config ||
      Object.keys(config).length === 0
    ) { return; }

    this.originalConfig = config;
    this.config = deepClone(config);

    if (!this.chromInfo && this.config.chromInfoPath) {
      this.loadChromInfo(this.config.chromInfoPath);
    }

    this.config.views.forEach((view, index) => {
      if (view.selectionView) {
        this.selectionViewId = index;
      }
    });

    update.render = true;
  }

  updateInteractions (interactions, update, force) {
    if (
      (this.interactions === interactions && !force) ||
      !this.config ||
      this.config.views.length === 1
    ) { return; }

    this.interactions = interactions;

    // this.config.zoomFixed = !this.interactions;

    update.render = true;
  }

  updateGrayscale (grayscale, update, force) {
    if (
      (this.grayscale === grayscale && !force) ||
      !this.config
    ) { return; }

    this.grayscale = grayscale;

    console.log(this.config);

    this.config.views.forEach((view, index) => {
      if (grayscale) {
        view.tracks.center[0].contents[0].options.colorRange =
          GRAYSCALE_COLORS;
      } else {
        view.tracks.center[0].contents[0].options.colorRange =
          this.originalColoring.views[index]
            .tracks.center[0].contents[0].options.colorRange.slice();
      }
    });

    update.render = true;
  }

  updateFragmentsHighlight (fgmHighlight, fgmConfig, update, force) {
    if (
      (this.fragmentsHighlight === fgmHighlight && !force) ||
      !this.config
    ) { return; }

    this.fragmentsHighlight = fgmHighlight;

    this.config.views
      .filter(view => view.tracks.center.length > 1)
      .forEach((view) => {
        const last = view.tracks.center.length - 1;

        if (view.tracks.center[last].type === '2d-chromosome-annotations') {
          view.tracks.center.pop();
        }
      });

    if (this.fragmentsHighlight) {
      const loci = this.extractLoci(fgmConfig);

      if (this.loci !== loci) {
        this.loci = loci;
        this.loci2dTrack = {
          uid: '2d',
          type: '2d-chromosome-annotations',
          chromInfoPath: '//s3.amazonaws.com/pkerp/data/hg19/chromSizes.tsv',
          options: {
            minRectWidth: 2,
            minRectHeight: 2,
            regions: loci
          }
        };
      }

      this.config.views.forEach((view) => {
        const _loci = deepClone(this.loci2dTrack);
        _loci.uid = `${view.uid}.2d`;

        view.tracks.center.push(_loci);
      });
    }

    update.render = true;
  }

  updateSelectionView (selectionViewDomains, update) {
    if (
      (
        this.selectionViewDomains === selectionViewDomains ||
        typeof this.selectionViewId === 'undefined'
      ) ||
      !this.config
    ) { return; }

    this.selectionViewDomains = selectionViewDomains;

    this.config.views[this.selectionViewId].initialXDomain = [
      selectionViewDomains[0],
      selectionViewDomains[1]
    ];

    this.config.views[this.selectionViewId].initialYDomain = [
      selectionViewDomains[2],
      selectionViewDomains[3]
    ];
  }

  render (config) {
    this.areServersAvailable(config)
      .then(() => {
        hg(
          this.plotEl,
          deepClone(config),
          OPTIONS,
          (api) => { this.api = api; }
        );

        this.initApi(this.api);
      })
      .catch((error) => {
        this.hasErrored('Server not available');
      });
  }
}
