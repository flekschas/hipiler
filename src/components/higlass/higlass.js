// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Third party
import { json } from 'd3';

// Injectables
import ChromInfo from 'services/chrom-info';
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
  FGM_LOCATION_HIGHLIGHT_SIZE,
  GRAYSCALE_COLORS,
  SELECTION_DOMAIN_DISPATCH_DEBOUNCE
} from 'components/higlass/higlass-defaults';

import arraysEqual from 'utils/arrays-equal';
import deepClone from 'utils/deep-clone';

const logger = LogManager.getLogger('higlass');

const OPTIONS = {
  bounded: true
};

@inject(ChromInfo, EventAggregator, States)
export class Higlass {
  constructor (chromInfo, event, states) {
    this.event = event;

    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.renderDb = debounce(this.render.bind(this), 50);
    this.checkColumnsDb = debounce(this.checkColumns.bind(this), 150);

    this.isLoading = true;

    this.locationTracker = {};

    this.chromInfo = chromInfo;

    this.event.subscribe(
      'decompose.fgm.pileMouseEnter',
      this.highlightFgmLoci.bind(this)
    );

    this.event.subscribe(
      'decompose.fgm.pileMouseLeave',
      this.dehighlightFgmLoci.bind(this)
    );

    // The following setup allows us to imitate deferred objects. I.e., we can
    // resolve promises outside their scope.
    this.resolve = {};
    this.reject = {};

    this.isLociExtracted = new Promise((resolve, reject) => {
      this.resolve.isLociExtracted = resolve;
      this.reject.isLociExtracted = reject;
    });

    this.isGlobalLociCalced = new Promise((resolve, reject) => {
      this.resolve.isGlobalLociCalced = resolve;
      this.reject.isGlobalLociCalced = reject;
    });

    this.isServersAvailable = new Promise((resolve, reject) => {
      this.resolve.isServersAvailable = resolve;
      this.reject.isServersAvailable = reject;
    });

    Promise
      .all([this.isLociExtracted, this.chromInfo.ready])
      .then(() => {
        // this.loci = this.calcGlobalLoci(this.loci, this.chromInfoData);
      })
      .catch((error) => {
        logger.error('Failed to calculate global genome loci', error);
      });
  }

  attached () {
    this.update();

    setTimeout(() => { this.isLoading = false; }, 150);
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  get chromInfoData () {
    return this.chromInfo.get();
  }

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

  checkServersAvailablility (config) {
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

  highlightFgmLoci (lociIds) {
    if (!this.loci) { return; }

    const configTmp = deepClone(this.config);
    const lociTmp = deepClone(this.loci);

    lociTmp.forEach((locus) => {
      locus[6] = 'rgba(0, 0, 0, 0.8)';
      locus[7] = 'rgba(255, 255, 255, 0.8)';
    });

    lociIds.forEach((id) => {
      lociTmp[id][6] = 'rgba(255, 85, 0, 0.8)';
      lociTmp[id][7] = 'rgba(255, 85, 0, 0.8)';
      lociTmp[id][8] = 7;
      lociTmp[id][9] = 7;
      const tmp = lociTmp[id];
      lociTmp.splice(id, 1);
      lociTmp.push(tmp);
    });

    configTmp.views
      .forEach((view) => {
        view.tracks.center
          .filter(center => center.type === '2d-chromosome-annotations')
          .forEach((center) => {
            center.options.regions = lociTmp;
          });
      });

    this.isFgmHighlight = true;

    this.render(configTmp);
  }

  dehighlightFgmLoci (loci) {
    if (!this.isFgmHighlight) { return; }

    this.isFgmHighlight = false;

    this.render(this.config);
  }

  calcGlobalLoci (loci, chromInfo) {
    const globalLoci = loci.map((locus) => {
      const offsetX = chromInfo[locus[0]].offset;
      const offsetY = chromInfo[locus[3]].offset;

      return [
        ...locus,
        offsetX + locus[1],
        offsetX + locus[2],
        offsetY + locus[4],
        offsetY + locus[5]
      ];
    });

    this.resolve.isGlobalLociCalced();

    return globalLoci;
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

    const loci = fgmConfig.fragments.map(fragment => [
      `chr${fragment[dataIdxChrom1]}`,
      fragment[dataIdxStart1],
      fragment[dataIdxEnd1],
      `chr${fragment[dataIdxChrom2]}`,
      fragment[dataIdxStart2],
      fragment[dataIdxEnd2],
      'rgba(255, 85, 0, 0.8)'
    ]);

    this.resolve.isLociExtracted();

    return loci;
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
        callback: debounce(
          this.trackGenomicLocation(view.uid),
          SELECTION_DOMAIN_DISPATCH_DEBOUNCE
        )
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

      this.chromInfo.set(chromInfo);
    });
  }

  updateLociColor () {

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

      if (!this.chromInfoData) { return; }

      // Get global locations
      const xStart = this.chromInfoData[location[0]].offset + location[1];
      const xEnd = this.chromInfoData[location[2]].offset + location[3];
      const yStart = this.chromInfoData[location[4]].offset + location[5];
      const yEnd = this.chromInfoData[location[6]].offset + location[7];

      this.isGlobalLociCalced.then(this.updateLociColor.bind(this));

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

    this.checkServersAvailablility(this.originalConfig)
      .then(() => { this.resolve.isServersAvailable(); })
      .catch((error) => { this.reject.isServersAvailable(error); });

    if (!this.chromInfoData && this.config.chromInfoPath) {
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
      this.config.views.length > 1
    ) { return; }

    this.interactions = interactions;

    this.config.views[0].zoomFixed = !this.interactions;

    update.render = true;
  }

  updateGrayscale (grayscale, update, force) {
    if (
      (this.grayscale === grayscale && !force) ||
      !this.config
    ) { return; }

    this.grayscale = grayscale;

    this.config.views.forEach((view, index) => {
      if (grayscale) {
        view.tracks.center[0].contents[0].options.colorRange =
          GRAYSCALE_COLORS;
      } else {
        view.tracks.center[0].contents[0].options.colorRange =
          this.originalConfig.views[index]
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
            minRectWidth: FGM_LOCATION_HIGHLIGHT_SIZE,
            minRectHeight: FGM_LOCATION_HIGHLIGHT_SIZE,
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
    this.isServersAvailable
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
        logger.error(error);
        this.hasErrored('Server not available');
      });
  }
}
