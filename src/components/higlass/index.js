// Aurelia
import { inject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';

// Injectables
import States from 'services/states';

// Utils etc.
import debounce from 'utils/debounce';
import { create as higlass } from 'hglib';  // eslint-disable-line

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
  }

  attached () {
    this.update();
  }

  checkColumns (newColumns) {
    if (this.columns !== newColumns) {
      this.columns = newColumns;

      if (this.api) {
        console.log(this.api);
        this.api.refresh();
      } else {
        this.renderDb(this.higlass.config);
      }
    }
  }

  update () {
    try {
      this.checkColumns(this.store.getState().present.decompose.columns);
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
    higlass(this.baseEl, config, OPTIONS, api => this.api = api);
  }
}
