// Aurelia
import { inject } from 'aurelia-framework';

// Injectables
import States from 'services/states';

// Utils etc.
import hglib from 'hglib';  // eslint-disable-line

@inject(States)
export class HiGlass {
  constructor () {
    this.message = 'About!';

    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.higlass = {};
  }

  update () {
    try {
      this.updateConfig(this.store.getState().present.higlass.config);
    } catch (e) {
      logger.error('State invalid', e);
    }
  }

  updateConfig (newConfig) {
    if (this.higlass.config !== newConfig) {
      this.higlass.config = newConfig;
      this.launchHg(this.higlass.config);
    }
  }

  launchHg (config) {
    return new hglib.HgComponent(
      document.querySelector('#higlass'),
      config
    );
  }
}
