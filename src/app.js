// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectable
import Font from 'services/font';
import States from 'services/states';

// Utils
import { updateConfigs } from 'app-actions';
import { ERROR_DURATION } from 'app-defaults';
import { name, routes } from 'configs/app';
import { externalLinks } from 'configs/nav';
import FgmState from 'components/fragments/fragments-state';
import $ from 'utils/dom-el';
import dragDrop from 'utils/drag-drop';
import readJsonFile from 'utils/read-json-file';
import validateConfig from 'utils/validate-config';


const logger = LogManager.getLogger('app');


@inject(EventAggregator, Font, States)
export default class App {

  constructor (event, font, states) {
    this.event = event;

    this.font = font;

    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.undo = states.undo.bind(states);
    this.redo = states.redo.bind(states);
    this.reset = states.reset.bind(states);

    this.isRehydrated = states.isRehydrated;

    this.appName = name;

    this.update();

    this.externalLinks = externalLinks;

    this.swag = [
      [66, 79, 67, 75, 87, 85, 82, 83, 84],
      [67, 79, 80, 82, 69, 83, 83, 79],
      [72, 69, 76, 80],
      [67, 79, 79, 76]
    ];
    this.swagI = 0;
    this.swagJ = 0;
    this.swagInterval = 500;
    this.swagTime = performance.now();
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  attached () {
    this.font.size = parseInt(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue('font-size')
        .slice(0, -2),
      10
    );

    // Drag and drop handler
    dragDrop(this.baseEl, this.dragDropArea, (event) => {
      readJsonFile(event.dataTransfer.files[0])
        .then(json => this.setConfig(json))
        .catch((error) => {
          logger.info(error);
          this.showGlobalError('Invalid JSON file');
        });
    });

    document.addEventListener('keydown', this.keyDownHandler.bind(this));
    document.addEventListener('keyup', this.keyUpHandler.bind(this));
    document.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
    document.addEventListener('mouseup', this.mouseUpHandler.bind(this));
    document.addEventListener('scroll', this.scrollHandler.bind(this));

    this.event.subscribe('showGlobalError', (args) => {
      this.showGlobalError(...args);
    });

    if (!this.exploreIsReady) {
      this.router.navigateToRoute('home');
    }
  }

  configureRouter (config, router) {
    this.router = router;

    config.title = this.appName;

    config.map(routes);

    config.mapUnknownRoutes(() => ({
      route: 'not-found',
      moduleId: 'views/not-found'
    }));

    config.fallbackRoute('/');
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  get currentRoute () {
    try {
      return this.router.currentInstruction.config.name;
    } catch (e) {
      return undefined;
    }
  }


  /* ----------------------- Getter / Setter Variables ---------------------- */

  /**
   * Mouse click event handler.
   *
   * @param {object} event - Mouse click event object.
   */
  clickHandler (event) {
    this.event.publish('app.click', event);
    return true;
  }

  /**
   * Hide global error message.
   */
  hideGlobalError () {
    this.corruptConfig = false;
    this.globalErrorMsg = undefined;
    $(this.baseEl).removeClass('is-global-error');
  }

  /**
   * Key down event handler.
   *
   * @param {object} event - Kep down event object.
   */
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

  /**
   * Key up event handler.
   *
   * @param {object} event - Kep up event object.
   */
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

    this.keyUpSwagHandler(event.keyCode);

    this.event.publish('app.keyUp', event);
  }

  keyUpSwagHandler (keyCode) {
    const now = performance.now();

    if (now - this.swagTime > this.swagInterval) {
      this.swagJ = 0;
    }

    this.swagTime = now;

    if (this.swagJ === 0) {
      this.swag.forEach((codeWurst, index) => {
        if (keyCode === codeWurst[0]) {
          this.swagI = index;
          this.swagJ = 1;
        }
      });
    } else if (keyCode === this.swag[this.swagI][this.swagJ]) {
      this.swagJ += 1;
    }

    if (this.swagJ === this.swag[this.swagI].length) {
      this.dialogPromise = new Promise((resolve, reject) => {
        this.dialogDeferred = { resolve, reject };
      });

      this.dialogIsOpen = true;

      if (this.swagI < 2) {
        this.dialogMessage =
          'Yuuhuu! May the bockwurst be with you my young compression lover.' +
          '<br/>Learn more about Compresso\'s awesome bockwurst-guided ' +
          'compression by clicking on <em>Okay</em>.';
      } else {
        this.dialogMessage =
          'We hear you! You are not alone, help is on it\'s way.<br/>' +
          'Meanwhile have a look at our extensive documentation and get ' +
          'yourself a nice cup of ☕️';
      }

      switch (this.swagI) {
        case 0:
        case 1:
          this.dialogMessage =
            'May the bockwurst be with you my young compression lover.' +
            '<br/>Learn more about Compresso\'s awesome bockwurst-guided ' +
            'compression for segmentation data by clicking <strong>Okay' +
            '</strong>.';
          break;
        case 2:
          this.dialogMessage =
            'We hear you! You are not alone, help is on it\'s way.<br/>' +
            'Meanwhile have a look at our extensive <a href="">documentation' +
            '</a>, get yourself a nice cup of ☕️ , and ping us on <a ' +
            'href="https://twitter.com/flekschas" target="_blank">Twitter</a>';
          break;
        case 3:
          this.dialogMessage =
            'Exactly! HiPiler is a <strong>cool</strong> piece of software. ' +
            'If you want to go more low-level and play with those Hi-C maps ' +
            'directly we highly recommend checking out ' +
            '<a href="https://github.com/mirnylab/cooler" target="_blank"> ' +
            '<strong>Cooler</strong></a>. Cooler is a fine piece of digital ' +
            'craftmanship for smart storing and outragously efficient ' +
            'querying of Hi-C maps, provided by the smart folks at Mirnylab.';
          break;
        default:
          // Nothing
      }

      this.dialogPromise
        .then(() => {
          if (this.swagI < 2) {
            window.open('https://github.com/vcg/compresso');
          } else {
            this.router.navigateToRoute('docs');
          }
        })
        .catch(() => {
          // Nothing
        });
    }
  }

  /**
   * Mouse up event handler.
   *
   * @param {object} event - Mouse up event object.
   */
  mouseUpHandler (event) {
    this.event.publish('app.mouseUp', event);
  }

  /**
   * Mouse move hander
   *
   * @param {object} event - Mouse move event object.
   */
  mouseMoveHandler (event) {
    this.event.publish('app.mouseMove', event);
  }

  /**
   * Reset state and destroy the current exploration session.
   */
  resetHandler () {
    this.dialogPromise = new Promise((resolve, reject) => {
      this.dialogDeferred = { resolve, reject };
    });

    this.dialogIsOpen = true;
    this.dialogMessage =
      'Are you sure you want to reset your current session? This cannot be ' +
      'undone.';

    this.dialogPromise
      .then(() => {
        this.reset();
        FgmState.reset();
        this.exploreIsReady = false;
        this.router.navigateToRoute('home');
      })
      .catch(() => {
        // Nothing
      });
  }

  /**
   * Resume previous exploration
   */
  resumeExploration () {
    this.router.navigateToRoute('explore');
  }

  /**
   * Publish scroll event
   *
   * @param {object} event - Scroll event object.
   */
  scrollHandler (event) {
    this.event.publish('app.scroll', event);
    // this.event.subscribe
  }

  /**
   * Set HiPiler config for exploration
   *
   * @param {object} config - Configuration.
   */
  setConfig (config) {
    if (validateConfig(config.fgm, config.hgl)) {
      this.store.dispatch(updateConfigs(config));
      this.router.navigateToRoute('explore');
    } else {
      this.showGlobalError('Corrupted Config File', 3000);
    }
  }

  /**
   * Show a global error message.
   *
   * @param {string} msg - Message to be displayed.
   * @param {number} duration - Time in milliseconds the error is to be shown.
   */
  showGlobalError (msg, duration = ERROR_DURATION) {
    if (this.globalErrorDisplay) {
      clearTimeout(this.globalErrorDisplay);
    }

    this.globalError = true;
    this.globalErrorMsg = msg;

    $(this.baseEl).addClass('is-global-error');

    this.globalErrorDisplay = setTimeout(
      this.hideGlobalError.bind(this), duration
    );
  }

  /**
   * Update app after the state changed..
   */
  update () {
    const state = this.store.getState().present;

    try {
      this.exploreIsReady = validateConfig(
        state.explore.fragments.config,
        state.explore.higlass.config
      );
    } catch (e) {
      this.exploreIsReady = false;
    }
  }
}
