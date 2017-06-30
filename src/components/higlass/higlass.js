// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Third party
import { color as d3Color, json } from 'd3';

// Injectables
import ChromInfo from 'services/chrom-info';
import States from 'services/states';

// Utils etc.
import $ from 'utils/dom-el';
import debounce from 'utils/debounce';
import ping from 'utils/ping';
// import { createHgComponent as hg } from 'hglib';
import { requestNextAnimationFrame } from 'utils/request-animation-frame';
import {
  setGrayscale,
  setFragmentsHighlight,
  setFragmentsSelection,
  setFragmentsSelectionFadeOut,
  setInteractions,
  setSelectionView
} from 'components/higlass/higlass-actions';
import {
  FGM_LOCATION_HIGHLIGHT_SIZE,
  GRAYSCALE_COLORS,
  SELECTION_DOMAIN_DISPATCH_DEBOUNCE
} from 'components/higlass/higlass-defaults';
import COLORS from 'configs/colors';
import arraysEqual from 'utils/arrays-equal';
import deepClone from 'utils/deep-clone';
import HaltResume from 'utils/halt-resume';

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
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    this.renderDb = debounce(this.render.bind(this), 50);
    this.checkColumnsDb = debounce(this.checkColumns.bind(this), 150);

    this.isLoading = true;

    this.locationTracker = {};

    this.chromInfo = chromInfo;
    this.id = Math.random();

    this.stateChangeResume = new HaltResume();

    this.subscriptions = [];

    // The following setup allows us to imitate deferred objects. I.e., we can
    // resolve promises outside their scope.
    this.resolve = {};
    this.reject = {};

    this.isAttached = new Promise((resolve, reject) => {
      this.resolve.isAttached = resolve;
      this.reject.isAttached = reject;
    });

    this.isLociExtracted = new Promise((resolve, reject) => {
      this.resolve.isLociExtracted = resolve;
      this.reject.isLociExtracted = reject;
    });

    // this.isGlobalLociCalced = new Promise((resolve, reject) => {
    //   this.resolve.isGlobalLociCalced = resolve;
    //   this.reject.isGlobalLociCalced = reject;
    // });

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


  /* ----------------------- Aurelia-specific methods ----------------------- */

  /**
   * Called once the component is attached.
   */
  attached () {
    this.initEventListeners();
    this.update();

    setTimeout(() => { this.isLoading = false; }, 150);

    this.resolve.isAttached();
  }

  /**
   * Called once the component is detached.
   */
  detached () {
    // Unsubscribe from redux store
    this.unsubscribeStore();

    // Unsubscribe from Aurelia events
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = undefined;
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

  /**
   * Add selection view to HiGlass's config for selection matrices
   *
   * @param {object} hgConfig - HiGlass's config.
   */
  addSelectionView (hgConfig) {
    const locksByViewUid = {};
    const locksDir = {};

    hgConfig.views.forEach((view, index) => {
      // Adjust height of the original view
      view.uid += '_';  // This is needed to make HiGlass refresh properly. Otherwise an error is thrown
      view.layout.h = 6;

      const selectionView = deepClone(view);

      selectionView.uid = `__${selectionView.uid}`;
      selectionView.zoomFixed = false;
      selectionView.layout.y = 6;
      selectionView.layout.i = selectionView.uid;
      selectionView.genomePositionSearchBoxVisible = true;
      selectionView.selectionView = true;

      locksByViewUid[selectionView.uid] = 'lockWurst';
      locksDir[selectionView.uid] = [1, 1, 1];

      // Prefix all `uid`s with an underscore
      Object.keys(selectionView.tracks).forEach((trackType) => {
        selectionView.tracks[trackType].forEach((track) => {
          track.uid = `_${track.uid}`;
          if (track.contents) {
            track.contents.forEach((content) => {
              content.uid = `_${content.uid}`;
            });
          }
        });
      });

      // Add view projection view
      view.tracks.center.push({
        uid: `${view.uid}.viewport-projection-center`,
        type: 'viewport-projection-center',
        fromViewUid: selectionView.uid,
        options: {
          projectionFillColor: 'rgba(232, 230, 255, 1)',
          projectionStrokeColor: 'rgba(99, 87, 255, 1)'
        },
        name: 'Viewport Projection'
      });

      // Add selection view
      hgConfig.views.push(selectionView);
    });

    hgConfig.zoomLocks = {
      locksByViewUid,
      locksDict: { lockWurst: locksDir }
    };

    hgConfig.locationLocks = {
      locksByViewUid,
      locksDict: { lockWurst: locksDir }
    };
  }

  /**
   * Check server availablility.
   *
   * @param {object} config - HiGlass config.
   * @return {object} Promise resolving to true if all servers are available.
   */
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

  // calcGlobalLoci (loci, chromInfo) {
  //   const globalLoci = loci.map((locus) => {
  //     const offsetX = chromInfo[locus[0]].offset;
  //     const offsetY = chromInfo[locus[3]].offset;

  //     return [
  //       ...locus,
  //       offsetX + locus[1],
  //       offsetX + locus[2],
  //       offsetY + locus[4],
  //       offsetY + locus[5]
  //     ];
  //   });

  //   this.resolve.isGlobalLociCalced();

  //   return globalLoci;
  // }

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
   * Color loci.
   *
   * @param {array} loci - List of loci.
   * @param {object} matricesColors - Colored matrices.
   * @return {array} List of loci.
   */
  colorLoci (loci = this.loci, matricesColors) {
    const isMatricesColored = Object.keys(matricesColors).length;

    const fragmentColors = {};
    const convertedColors = {};

    const convertHexToRgba = function (colorName, cache) {
      const color = d3Color(`#${COLORS[colorName.toUpperCase()].toString(16)}`);

      cache[colorName] = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;

      return cache[colorName];
    };

    Object.keys(matricesColors).forEach((matrixId) => {
      const color = (
        convertedColors[matricesColors[matrixId]] ||
        convertHexToRgba(matricesColors[matrixId], convertedColors)
      );

      fragmentColors[matrixId] = color;
    });

    loci.forEach((locus, index) => {
      let fill = 'rgba(255, 85, 0, 0.66)';
      let border = 'rgba(255, 85, 0, 0.66)';

      if (isMatricesColored) {
        if (fragmentColors[index]) {
          fill = fragmentColors[index];
          border = fragmentColors[index];
        } else {
          fill = 'rgba(0, 0, 0, 0.33)';
          border = 'rgba(255, 255, 255, 0.33)';
        }
      }

      locus[6] = fill;
      locus[7] = border;
    });

    this.isFgmHighlight = true;
  }

  /**
   * Dehighlight locations.
   */
  blurLoci () {
    if (!this.isFgmHighlight) { return; }

    this.isFgmHighlight = false;

    this.render(this.config);
  }

  /**
   * Extract loci in modified BEDPE format for higlass.
   *
   * @param {object} config - Fragment config.
   * @param {object} piles - Pile definitions.
   * @param {object} pilesColors - Colored piles.
   * @return {array} List of loci.
   */
  extractLoci (config, piles, pilesColors) {
    const header = config.fragments[0];

    const dataIdxChrom1 = header.indexOf('chrom1');
    const dataIdxStart1 = header.indexOf('start1');
    const dataIdxEnd1 = header.indexOf('end1');
    const dataIdxChrom2 = header.indexOf('chrom2');
    const dataIdxStart2 = header.indexOf('start2');
    const dataIdxEnd2 = header.indexOf('end2');

    const loci = config.fragments.slice(1).map(fragment => [
      `chr${fragment[dataIdxChrom2]}`,
      fragment[dataIdxStart2],
      fragment[dataIdxEnd2],
      `chr${fragment[dataIdxChrom1]}`,
      fragment[dataIdxStart1],
      fragment[dataIdxEnd1],
      'rgba(255, 85, 0, 0.8)',
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

  fragmentsSelectionChangeHandler () {
    this.store.dispatch(setFragmentsSelection(!this.fragmentsSelection));

    return true;
  }

  fragmentsSelectionFadeOutChangeHandler () {
    this.store.dispatch(
      setFragmentsSelectionFadeOut(!this.fragmentsSelectionFadeOut)
    );

    return true;
  }

  /**
   * Navigate to a pile.
   *
   * @param {object} pile - Pile to be navigated to.
   */
  goToPile (pile) {
    let chrom1;
    let start1 = Infinity;
    let end1 = -1;
    let chrom2;
    let start2 = Infinity;
    let end2 = -1;

    if (!this.fragmentsSelection) {
      this.fragmentsSelectionChangeHandler();
      this.stateChangeResume.halt(this.goToPile.bind(this), [pile]);
    } else {
      pile.pileMatrices.forEach((pileMatrix) => {
        const _chrom1 = `chr${pileMatrix.locus.chrom1}`;
        const _chrom2 = `chr${pileMatrix.locus.chrom2}`;

        // Get number of pixel of the two dimensions (i.e., x and y) of the
        // annotation. The dimension of the snippets might differ because when
        // pulling the snippets a certain dimension is enforced.
        const dim1 = (
          pileMatrix.locus.globalEnd1 - pileMatrix.locus.globalStart1
        ) / pileMatrix.resolution;
        const dim2 = (
          pileMatrix.locus.globalEnd2 - pileMatrix.locus.globalStart2
        ) / pileMatrix.resolution;

        // Get the x and y center of the annotation
        const dim1Center = pileMatrix.locus.start1 + ((
          pileMatrix.locus.end1 - pileMatrix.locus.start1
        ) / 2);
        const dim2Center = pileMatrix.locus.start2 + ((
          pileMatrix.locus.end2 - pileMatrix.locus.start2
        ) / 2);

        // Calculate the dimension (at base pair resolution) of the snippet from
        // its center point.
        const w = (pileMatrix.resolution * pileMatrix.dim / 2);

        // Get the real start and end of x and y at base pair resolution
        let realStart1 = pileMatrix.locus.start1;
        let realEnd1 = pileMatrix.locus.end1;
        if (dim1 < pileMatrix.dim) {
          realStart1 = dim1Center - w;
          realEnd1 = dim1Center + w;
        }

        let realStart2 = pileMatrix.locus.start2;
        let realEnd2 = pileMatrix.locus.end2;
        if (dim2 < pileMatrix.dim) {
          realStart2 = dim2Center - w;
          realEnd2 = dim2Center + w;
        }

        if (
          !chrom1 || (
            this.chromInfo.get()[_chrom1].offset <
            this.chromInfo.get()[chrom1].offset
          )
        ) {
          chrom1 = _chrom1;
        }

        if (
          _chrom1 === chrom1
        ) {
          if (realStart1 < start1) {
            start1 = realStart1;
          }
          if (realEnd1 > end1) {
            end1 = realEnd1;
          }
        }

        if (
          !chrom2 || (
            this.chromInfo.get()[_chrom2].offset <
            this.chromInfo.get()[chrom2].offset
          )
        ) {
          chrom2 = _chrom2;
        }

        if (
          _chrom2 === chrom2
        ) {
          if (realStart2 < start2) {
            start2 = realStart2;
          }
          if (realEnd2 > end2) {
            end2 = realEnd2;
          }
        }
      });

      this.config.views.filter(view => view.selectionView).forEach((view) => {
        this.api.goTo(
          view.uid, chrom2, start2, end2, chrom1, start1, end1, true
        );
      });
    }
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

  focusLoci (lociIds) {
    if (!this.loci) { return; }

    const configTmp = deepClone(this.config);
    const lociTmp = deepClone(this.loci);

    lociTmp.forEach((locus) => {
      locus[6] = 'rgba(0, 0, 0, 0.33)';
      locus[7] = 'rgba(255, 255, 255, 0.33)';
    });

    let counter = 0;
    lociIds.sort((a, b) => a - b).forEach((id) => {
      // We need the counter as we splice off the location and add it at the
      // end again. Mutating the indices.
      const _id = id - counter;

      lociTmp[_id][6] = 'rgba(255, 85, 0, 0.66)';
      lociTmp[_id][7] = 'rgba(255, 85, 0, 0.66)';
      lociTmp[_id][8] = 7;
      lociTmp[_id][9] = 7;
      const tmp = lociTmp[_id];
      lociTmp.splice(_id, 1);
      lociTmp.push(tmp);

      counter += 1;
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

      if (view.selectionView) {
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
   * Initialize event listeners.
   */
  initEventListeners () {
    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileFocus', this.focusLoci.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.pileBlur', this.blurLoci.bind(this)
    ));

    this.subscriptions.push(this.event.subscribe(
      'explore.fgm.showInMatrix', this.goToPile.bind(this)
    ));
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
      if (error) {
        logger.error(error);
        this.hasErrored('Failed to load chromosome sizes');
        return;
      }

      this.chromInfo.set(chromInfo);
    });
  }

  /**
   * Remove the selection view from HiGlass's config.
   *
   * @param {object} hgConfig - HiGlass's config.
   */
  removeSelectionView (hgConfig) {
    // Remove selection view
    for (let i = hgConfig.views.length; i--;) {
      if (hgConfig.views[i].selectionView) {
        hgConfig.views.splice(i, 1);
      }
    }

    // Remove zoom and location locks
    hgConfig.zoomLocks = {};
    hgConfig.locationLocks = {};

    const originalView = hgConfig.views[0];

    // Adjust height of the original view
    if (originalView.uid[originalView.uid.length - 1] === '_') {
      originalView.uid = originalView.uid.slice(0, -1);
    }
    originalView.layout.h = 12;

    // Remove view projections
    for (let i = originalView.tracks.center.length; i--;) {
      if (originalView.tracks.center[i].type === 'viewport-projection-center') {
        originalView.tracks.center.splice(i, 1);
      }
    }
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

      // this.isGlobalLociCalced.then(this.updateLociColor.bind(this));

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
      const state = this.store.getState().present.explore;

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
      this.updateFragmentsHighlightColors(
        state.fragments.matricesColors,
        update,
        update.render
      );
      this.updateFragmentsSelection(
        state.higlass.fragmentsSelection,
        state.fragments.config,
        update,
        update.render
      );
      this.updateFragmentsSelectionFadeOut(
        state.higlass.fragmentsSelectionFadeOut
      );
      this.updateSelectionView(state.higlass.selectionView, update);

      if (update.render) {
        this.renderDb(this.config);
      }

      this.stateChangeResume.resume();
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
      view.genomePositionSearchBoxVisible = false;

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

  updateLociColor () {

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
          chromInfoPath: this.config.views[0].chromInfoPath,
          options: {
            minRectWidth: FGM_LOCATION_HIGHLIGHT_SIZE,
            minRectHeight: FGM_LOCATION_HIGHLIGHT_SIZE
          }
        };
      }

      this.config.views.forEach((view) => {
        const loci2dTrack = deepClone(this.loci2dTrack);
        loci2dTrack.uid = `${view.uid}.2d`;
        loci2dTrack.options.regions = this.loci;

        view.tracks.center.push(loci2dTrack);
      });
    }

    update.render = true;
  }

  updateFragmentsHighlightColors (matricesColors, update, force) {
    if (
      (this.fragmentsHighlightColor === matricesColors && !force) ||
      !this.config
    ) { return; }

    this.fragmentsHighlightColor = matricesColors;

    this.colorLoci(this.loci, matricesColors);

    update.render = true;
  }

  updateFragmentsSelection (fgmSelection, fgmConfig, update, force) {
    if (
      (this.fragmentsSelection === fgmSelection && !force) ||
      !this.config
    ) { return; }

    this.fragmentsSelection = fgmSelection;

    // this.config.views = this.config.views.slice(0, 1);

    this.removeSelectionView(this.config);

    if (this.fragmentsSelection) {
      this.addSelectionView(this.config);
    }

    update.render = true;
  }

  updateFragmentsSelectionFadeOut (fadeOut) {
    this.fragmentsSelectionFadeOut = fadeOut;
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
    Promise.all([this.isServersAvailable, this.isAttached])
      .then(() => {
        window.hglib.createHgComponent(
          this.plotEl,
          deepClone(config),
          OPTIONS,
          (api) => { this.api = api; }
        );

        this.initApi(this.api);
      })
      .catch((error) => {
        logger.error(error);
        this.hasErrored('Ups. This is embarrassing.');
      });
  }
}
