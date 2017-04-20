// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { EventAggregator } from 'aurelia-event-aggregator';

// Third party
import { json } from 'd3';

// Injectable
import States from 'services/states';

// Utils
import examples from 'configs/examples';
import { updateConfigs } from 'app-actions';
import readJsonFile from 'utils/read-json-file';
import validateConfig from 'utils/validate-config';

const logger = LogManager.getLogger('home');


@inject(EventAggregator, Router, States)
export class Home {
  inputConfigFile;

  constructor (event, router, states) {
    this.event = event;

    this.router = router;

    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.examples = examples;
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  attached () {
    this.selectConfigButton.addEventListener(
      'click', this.selectConfig.bind(this)
    );
  }

  /* ---------------------------- Class methods ----------------------------- */

  loadExample (example) {
    json(example.url, (error, config) => {
      if (error) {
        logger.error(error);
        this.event.publish(
          'showGlobalError', ['Could not load example config', 30000]
        );
        return;
      }

      this.setState(config);
    });
  }

  selectedConfigChanged () {
    let results;

    try {
      results = readJsonFile(this.selectedConfig[0]);
    } catch (error) {
      logger.error(error);
    }

    results
      .then(resultsJson => this.setState(resultsJson))
      .catch(error => logger.error(error));
  }

  selectConfig (event) {
    if (event.artificial) { return; }

    const newEvent = new MouseEvent(event.type, event);
    newEvent.artificial = true;

    this.inputConfigFile.dispatchEvent(newEvent);
  }

  setState (config) {
    if (validateConfig(config.fgm, config.hgl)) {
      this.store.dispatch(updateConfigs(config));
      this.router.navigateToRoute('explore');
    } else {
      this.event.publish(
        'showGlobalError', ['Corrupted config file', 3000]
      );
    }
  }

  update () {}
}
