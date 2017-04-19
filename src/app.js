// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectable
import Font from 'services/font';
import States from 'services/states';

// Utils
import { updateConfigs } from 'app-actions';
import { ERROR_DURATION } from 'app-defaults';
import {
  name as appName,
  nameShort as appNameShort,
  routes
} from 'configs/app';
import { externalLinks } from 'configs/nav';
import $ from 'utils/dom-el';
import dragDrop from 'utils/drag-drop';
import readJsonFile from 'utils/read-json-file';
import validateConfig from 'utils/validate-config';

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
        .then(json => this.setState(json))
        .catch(error => logger.error(error));
    });

    document.addEventListener('keydown', this.keyDownHandler.bind(this));
    document.addEventListener('keyup', this.keyUpHandler.bind(this));
    document.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
    document.addEventListener('mouseup', this.mouseUpHandler.bind(this));

    this.event.subscribe('showGlobalError', (args) => {
      this.showGlobalError(...args);
    });

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

  hideGlobalError () {
    this.corruptConfig = false;
    this.globalErrorMsg = undefined;
    $(document.body).removeClass('is-global-error');
  }

  keyDownHandler (event) {
    if (event.ctrlKey || event.metaKey) {
      this.isCtrlMetaKeyDown = true;
    }

    // 90 === Z
    if (event.keyCode === 90 && this.isCtrlMetaKeyDown) {
      event.preventDefault();
      if (!this.wasUndoRedo) {
        this.undo();
        this.wasUndoRedo = true;
      }
    }

    // 90 === Y
    if (event.keyCode === 89 && this.isCtrlMetaKeyDown) {
      event.preventDefault();
      if (!this.wasUndoRedo) {
        this.redo();
        this.wasUndoRedo = true;
      }
    }

    this.event.publish('app.keyDown', event);
  }

  keyUpHandler (event) {
    if (event.code === 'ControlLeft' || event.code === 'MetaLeft') {
      this.isCtrlMetaKeyDown = false;
    }

    if (this.wasUndoRedo && !this.isCtrlMetaKeyDown) {
      this.wasUndoRedo = false;
    }

    if (this.globalError && event.keyCode === 27) {  // ESC
      this.hideGlobalError();
      return;
    }

    this.event.publish('app.keyUp', event);
  }

  mouseUpHandler (event) {
    this.event.publish('app.mouseUp', event);
  }

  mouseMoveHandler (event) {
    this.event.publish('app.mouseMove', event);
  }

  resetHandler () {
    this.dialogPromise = new Promise((resolve, reject) => {
      this.dialogDeferred = { resolve, reject };
    });

    this.dialogIsOpen = true;
    this.dialogMessage =
      'Are you sure you want to reset your current session? This cannot be undone.';

    this.dialogPromise
      .then(() => {
        this.router.navigateToRoute('home');
        this.decomposeIsReady = false;
        this.reset();
      })
      .catch(() => {
        // Nothing
      });
  }

  resumeDecomposition () {
    this.router.navigateToRoute('decompose');
  }

  setState (config) {
    if (validateConfig(config.fgm, config.hgl)) {
      this.store.dispatch(updateConfigs(config));
      this.router.navigateToRoute('decompose');
    } else {
      this.showGlobalError('Corrupted Config File', 3000);
    }
  }

  showGlobalError (msg, duration = ERROR_DURATION) {
    if (this.globalErrorDisplay) {
      clearTimeout(this.globalErrorDisplay);
    }

    this.globalError = true;
    this.globalErrorMsg = msg;

    $(document.body).addClass('is-global-error');

    this.globalErrorDisplay = setTimeout(this.hideGlobalError, duration);
  }

  update () {
    const state = this.store.getState().present;

    try {
      this.decomposeIsReady = validateConfig(
        state.decompose.fragments.config,
        state.decompose.higlass.config
      );
    } catch (e) {
      this.decomposeIsReady = false;
    }
  }
}
