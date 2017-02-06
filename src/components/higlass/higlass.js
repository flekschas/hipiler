// Aurelia
import { inject, LogManager } from 'aurelia-framework';

// Injectables
import States from 'services/states';

// Utils etc.
import $ from 'utils/dom-el';
import debounce from 'utils/debounce';
import { createHgComponent as hg } from 'hglib';  // eslint-disable-line
import { requestNextAnimationFrame } from 'utils/request-animation-frame';

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

    this.higlass = {};

    this.renderDb = debounce(this.render.bind(this), 50);
    this.checkColumnsDb = debounce(this.checkColumns.bind(this), 150);

    this.isLoading = true;
  }

  attached () {
    this.update();

    setTimeout(() => { this.isLoading = false; }, 150);
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

  update () {
    try {
      this.checkColumnsDb(this.store.getState().present.decompose.columns);
      this.updateConfig(this.store.getState().present.decompose.higlass.config);
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  updateConfig (newConfig) {
    if (this.higlass.config !== newConfig) {
      this.higlass.config = newConfig;
      this.renderDb(this.higlass.config);
    }
  }

  render (config) {
    hg(this.plotEl, config, OPTIONS, (api) => { this.api = api; });
  }
}
