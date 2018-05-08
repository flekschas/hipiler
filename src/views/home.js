// Aurelia
import {
  inject,  // eslint-disable-line
  LogManager
} from 'aurelia-framework';  // eslint-disable-line
import { Router } from 'aurelia-router';  // eslint-disable-line
import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

// Third party
import { json } from 'd3';
import * as Papa from 'papaparse';

// Injectable
import States from 'services/states';  // eslint-disable-line

// Utils
import examples from 'configs/examples';
import { updateConfigs } from 'app-actions';
import buildConfig from 'utils/build-config';
import getUrlQueryParams from 'utils/get-url-query-params';
import readJsonFile from 'utils/read-json-file';
import validateConfig from 'utils/validate-config';

const logger = LogManager.getLogger('home');


@inject(EventAggregator, Router, States)
export class Home {
  constructor (event, router, states) {
    this.event = event;

    this.router = router;

    this.store = states.store;

    this.examples = examples;
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  /**
   * Called once the component is attached.
   */
  attached (...args) {
    this.selectConfigButton.addEventListener(
      'click', this.selectConfig.bind(this)
    );

    if (this.queryParams.config) {
      this.loadExample({ url: this.queryParams.config });
    }
  }

  activate (params, routeConfig, navigationInstruction) {
    this.queryParams = navigationInstruction.queryParams;
    const queryParams = getUrlQueryParams(window.location.search);

    if (
      Object.keys(navigationInstruction.queryParams).length <
      Object.keys(queryParams).length
    ) {
      this.queryParams = queryParams;
    }
  }

  /* ---------------------------- Class methods ----------------------------- */

  loadExample (example) {
    json(example.url, (error, config) => {
      if (error) {
        logger.error(error);
        this.event.publish(
          'showGlobalError', ['Could not load example config', 5000]
        );
        return;
      }

      this.setState(config);
    });
  }

  selectedConfigChanged () {
    switch (this.selectedConfig[0].type) {
      case 'text/csv':
      case 'text/tab-separated-values':
        Papa.parse(this.selectedConfig[0], {
          complete: (results) => {
            const newConfig = buildConfig(results.data);

            if (newConfig) {
              this.setConfig(newConfig);
            } else {
              this.event.publish(
                'showGlobalError',
                ['Invalid CSV or TSV file']
              );
            }
          },
          error: (error) => {
            logger.info(error);
            this.event.publish(
              'showGlobalError',
              ['Invalid CSV or TSV file']
            );
          }
        });
        break;

      case 'application/json':
        readJsonFile(this.selectedConfig[0])
          .then(config => this.setConfig(config))
          .catch((error) => {
            logger.info(error);
            this.event.publish(
              'showGlobalError',
              ['Invalid JSON file']
            );
          });
        break;

      default:
        this.event.publish(
          'showGlobalError',
          ['Unsupported file type. Drop a CSV, TSV, or JSON!']
        );
        break;
    }
  }

  selectConfig (event) {
    if (event.artificial) { return; }

    const newEvent = new MouseEvent(event.type, event);
    newEvent.artificial = true;

    this.inputConfigFile.dispatchEvent(newEvent);
  }

  setConfig (config) {
    if (validateConfig(config.fgm, config.hgl)) {
      this.store.dispatch(updateConfigs(config));
      this.router.navigateToRoute('explore', this.queryParams);
    } else {
      this.event.publish(
        'showGlobalError', ['Corrupted config file', 3000]
      );
    }
  }
}
