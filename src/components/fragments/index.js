// Aurelia
import { inject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';

// Injectables
import States from 'services/states';

const logger = LogManager.getLogger('fragments');

@inject(States)
export class Fragments {
  constructor (states) {
    // Link the Redux store
    this.store = store;
    this.store.subscribe(this.update.bind(this));
    this.update();

    this.fragments = {};
  }

  update () {
    try {
      this.updateConfig(this.store.getState().present.decompose.fragments.config);
    } catch (e) {
      logger.error('State is invalid', e);
    }
  }

  updateConfig (newConfig) {
    if (this.fragments.config !== newConfig) {
      this.fragments.config = newConfig;
      this.render(this.fragments.config);
    }
  }

  render (config) {
    logger.info(config);
  }
}
