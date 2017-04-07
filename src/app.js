// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectable
import Font from 'services/font';
import States from 'services/states';

// Utils
import $ from 'utils/dom-el';
import { updateConfigs } from 'app-actions';
import {
  name as appName,
  nameShort as appNameShort,
  routes
} from 'configs/app';
import { externalLinks } from 'configs/nav';
import dragDrop from 'utils/drag-drop';
import readJsonFile from 'utils/read-json-file';

const logger = LogManager.getLogger('app');

@inject(EventAggregator, Font, States)
export default class App {
  constructor (eventAggregator, font, states) {
    this.event = eventAggregator;

    this.font = font;

    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.undo = states.undo.bind(states);
    this.redo = states.redo.bind(states);
    this.reset = states.reset.bind(states);

    this.isRehydrated = states.isRehydrated;

    this.appName = appName;
    this.appNameShort = appNameShort;

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
    document.addEventListener('keyup', this.keyUpHandler.bind(this));
    document.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
    document.addEventListener('mouseup', this.mouseUpHandler.bind(this));

    if (!this.decomposeIsReady) {
      this.router.navigateToRoute('home');
    }
  }

  configureRouter (config, router) {
    this.router = router;

    config.title = appName;

    config.map(routes);

    config.mapUnknownRoutes(() => ({
      route: 'not-found',
      moduleId: 'views/not-found'
    }));

    config.fallbackRoute('/');
  }

  get currentRoute () {
    try {
      return this.router.currentInstruction.config.name;
    } catch (e) {
      return undefined;
    }
  }

  clickHandler (event) {
    this.event.publish('app.click', event);
    return true;
  }

  keyDownHandler (event) {
    // 90 === Z
    if (event.keyCode === 90 && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.undo();
    }

    // 90 === Y
    if (event.keyCode === 89 && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.redo();
    }

    if (event.altKey) {
      this.event.publish('app.keyDownAlt', event);
    }
  }

  keyUpHandler (event) {
    this.event.publish('app.keyUp', event);
  }

  mouseUpHandler (event) {
    this.event.publish('app.mouseUp', event);
  }

  mouseMoveHandler (event) {
    this.event.publish('app.mouseMove', event);
  }

  resetHandler () {
    this.router.navigateToRoute('home');
    this.decomposeIsReady = false;
    this.reset();
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
