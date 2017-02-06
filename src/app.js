// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectable
import Font from 'services/font';
import States from 'services/states';

// Utils
import $ from 'utils/dom-el';
import { updateConfigs } from 'app-actions';
import { routes } from 'configs/app';
import { externalLinks } from 'configs/nav';
import dragDrop from 'utils/drag-drop';
import readJsonFile from 'utils/read-json-file';

const logger = LogManager.getLogger('app');

@inject(EventAggregator, Font, States)
export default class App {
  constructor (eventAggregator, font, states) {
    this.events = eventAggregator;

    this.font = font;

    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.undo = states.undo.bind(states);
    this.redo = states.redo.bind(states);
    this.reset = states.reset.bind(states);

    this.isRehydrated = states.isRehydrated;

    this.update();

    this.externalLinks = externalLinks;
  }

  attached () {
    this.font.size = parseInt(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue('font-size')
        .slice(0, -2),
      10
    );

    // Drag and drop handler
    dragDrop(document.body, this.dragDropArea, (event) => {
      let results;

      try {
        results = readJsonFile(event.dataTransfer.files[0]);
      } catch (e) {
        logger.error(e);
      }

      results
        .then(json => this.updateState(json))
        .catch(error => logger.error(error));
    });

    document.addEventListener('keydown', this.keyDownHandler.bind(this));
  }

  configureRouter (config, router) {
    this.router = router;

    config.map(routes);
  }

  get currentRoute () {
    try {
      return this.router.currentInstruction.config.name;
    } catch (e) {
      return undefined;
    }
  }

  keyDownHandler (event) {
    if (event.keyCode === 90 && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.undo();
    }

    if (event.keyCode === 89 && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.redo();
    }
  }

  mouseUpHandler (event) {
    this.events.publish('app.mouseUp', event);
  }

  mouseMoveHandler (event) {
    this.events.publish('app.mouseMove', event);
  }

  resumeDecomposition () {
    this.router.navigateToRoute('decompose');
  }

  showGlobalError (msg, duration) {
    if (this.globalErrorDisplay) {
      clearTimeout(this.globalErrorDisplay);
    }

    this.globalError = true;
    this.globalErrorMsg = msg;

    $(document.body).addClass('is-global-error');

    this.globalErrorDisplay = setTimeout(() => {
      this.corruptConfig = false;
      this.globalErrorMsg = undefined;
      $(document.body).removeClass('is-global-error');
    }, duration);
  }

  update () {
    const state = this.store.getState().present;

    try {
      this.decomposeIsReady = this.validateConfig(
        state.decompose.fragments.config,
        state.decompose.higlass.config
      );
    } catch (e) {
      this.decomposeIsReady = false;
    }
  }

  updateState (config) {
    if (this.validateConfig(config.fgm, config.hgl)) {
      this.store.dispatch(updateConfigs(config));
      this.router.navigateToRoute('decompose');
    } else {
      this.showGlobalError('Corrupted Config File', 3000);
    }
  }

  validateConfig (fgm, hgl) {
    try {
      return Object.keys(fgm).length || Object.keys(hgl).length;
    } catch (e) {
      return false;
    }
  }
}
