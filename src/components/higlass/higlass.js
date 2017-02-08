// Aurelia
import { inject, LogManager } from 'aurelia-framework';

// Injectables
import States from 'services/states';

// Utils etc.
import $ from 'utils/dom-el';
import debounce from 'utils/debounce';
import ping from 'utils/ping';
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

  hasErrored (errorMsg) {
    this.errorMsg = errorMsg;
    this.isErrored = true;
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
    this.areServersAvailable(config)
      .then(() => {
        hg(this.plotEl, config, OPTIONS, (api) => { this.api = api; });
      })
      .catch((error) => {
        this.hasErrored('Server not available');
      });
  }
}
