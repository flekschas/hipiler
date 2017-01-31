// Aurelia
import { inject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';

// Injectables
import States from 'services/states';

// Utils etc.
import { HgComponent as HG } from 'hglib';  // eslint-disable-line

const logger = LogManager.getLogger('higlass');

@inject(States)
export class Higlass {
  constructor (states) {
    // Link the Redux store
    this.storeLoaded = states.store.then(store => {
      this.store = store;
      this.store.subscribe(this.update.bind(this));
    });

    this.higlass = {};
  }

  attached () {
    this.storeLoaded.then(() => this.update());
  }

  update () {
    try {
      this.updateConfig(this.store.getState().present.decompose.higlass.config);
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  updateConfig (newConfig) {
    logger.debug(newConfig);
    if (this.higlass.config !== newConfig) {
      this.higlass.config = newConfig;
      this.launchHg(this.higlass.config);
    }
  }

  launchHg (config) {
    return new HG(this.baseEl, config);
  }
}
