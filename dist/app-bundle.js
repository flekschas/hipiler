define('app-actions',['exports', 'components/higlass/higlass-actions', 'components/fragments/fragments-actions'], function (exports, _higlassActions, _fragmentsActions) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.resetState = exports.RESET_STATE = exports.updateConfigs = exports.UPDATE_CONFIG = undefined;
  var UPDATE_CONFIG = exports.UPDATE_CONFIG = 'UPDATE_CONFIG';

  var updateConfigs = exports.updateConfigs = function updateConfigs(config) {
    return function (dispath) {
      dispath((0, _higlassActions.updateConfig)(config.hgl));
      dispath((0, _fragmentsActions.updateConfig)(config.fgm));
    };
  };

  var RESET_STATE = exports.RESET_STATE = 'RESET_STATE';

  var resetState = exports.resetState = function resetState() {
    return {
      type: RESET_STATE,
      payload: undefined
    };
  };
});
define('app-defaults',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var ERROR_DURATION = exports.ERROR_DURATION = 3000;
});
define('app-reducer',['exports', 'redux', 'app-actions', 'views/explore-reducers'], function (exports, _redux, _appActions, _exploreReducers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _exploreReducers2 = _interopRequireDefault(_exploreReducers);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var appReducer = (0, _redux.combineReducers)({
    explore: _exploreReducers2.default
  });

  var rootReducer = function rootReducer(state, action) {
    if (action.type === _appActions.RESET_STATE) {
      state = undefined;
    }

    return appReducer(state, action);
  };

  exports.default = rootReducer;
});
define('app',['exports', 'aurelia-framework', 'aurelia-event-aggregator', 'services/font', 'services/states', 'app-actions', 'app-defaults', 'configs/app', 'configs/nav', 'components/fragments/fragments-state', 'utils/dom-el', 'utils/drag-drop', 'utils/read-json-file', 'utils/validate-config'], function (exports, _aureliaFramework, _aureliaEventAggregator, _font, _states, _appActions, _appDefaults, _app, _nav, _fragmentsState, _domEl, _dragDrop, _readJsonFile, _validateConfig) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;

  var _font2 = _interopRequireDefault(_font);

  var _states2 = _interopRequireDefault(_states);

  var _fragmentsState2 = _interopRequireDefault(_fragmentsState);

  var _domEl2 = _interopRequireDefault(_domEl);

  var _dragDrop2 = _interopRequireDefault(_dragDrop);

  var _readJsonFile2 = _interopRequireDefault(_readJsonFile);

  var _validateConfig2 = _interopRequireDefault(_validateConfig);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var _dec, _class;

  var logger = _aureliaFramework.LogManager.getLogger('app');

  var App = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator, _font2.default, _states2.default), _dec(_class = function () {
    function App(event, font, states) {
      _classCallCheck(this, App);

      this.event = event;

      this.font = font;

      this.store = states.store;
      this.store.subscribe(this.update.bind(this));

      this.undo = states.undo.bind(states);
      this.redo = states.redo.bind(states);
      this.reset = states.reset.bind(states);

      this.isRehydrated = states.isRehydrated;

      this.appName = _app.name;

      this.update();

      this.externalLinks = _nav.externalLinks;

      this.swag = [[66, 79, 67, 75, 87, 85, 82, 83, 84], [67, 79, 80, 82, 69, 83, 83, 79], [72, 69, 76, 80], [67, 79, 79, 76]];
      this.swagI = 0;
      this.swagJ = 0;
      this.swagInterval = 500;
      this.swagTime = performance.now();
    }

    App.prototype.attached = function attached() {
      var _this = this;

      this.font.size = parseInt(window.getComputedStyle(document.body, null).getPropertyValue('font-size').slice(0, -2), 10);

      (0, _dragDrop2.default)(this.baseEl, this.dragDropArea, function (event) {
        (0, _readJsonFile2.default)(event.dataTransfer.files[0]).then(function (json) {
          return _this.setConfig(json);
        }).catch(function (error) {
          logger.info(error);
          _this.showGlobalError('Invalid JSON file');
        });
      });

      document.addEventListener('keydown', this.keyDownHandler.bind(this));
      document.addEventListener('keyup', this.keyUpHandler.bind(this));
      document.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
      document.addEventListener('mouseup', this.mouseUpHandler.bind(this));
      document.addEventListener('scroll', this.scrollHandler.bind(this));

      this.event.subscribe('showGlobalError', function (args) {
        _this.showGlobalError.apply(_this, args);
      });

      if (!this.exploreIsReady) {
        this.router.navigateToRoute('home');
      }
    };

    App.prototype.configureRouter = function configureRouter(config, router) {
      this.router = router;

      config.title = this.appName;

      config.map(_app.routes);

      config.mapUnknownRoutes(function () {
        return {
          route: 'not-found',
          moduleId: 'views/not-found'
        };
      });

      config.fallbackRoute('/');
    };

    App.prototype.clickHandler = function clickHandler(event) {
      this.event.publish('app.click', event);
      return true;
    };

    App.prototype.hideGlobalError = function hideGlobalError() {
      this.corruptConfig = false;
      this.globalErrorMsg = undefined;
      (0, _domEl2.default)(this.baseEl).removeClass('is-global-error');
    };

    App.prototype.keyDownHandler = function keyDownHandler(event) {
      if (event.ctrlKey || event.metaKey) {
        this.isCtrlMetaKeyDown = true;
      }

      if (event.keyCode === 90 && this.isCtrlMetaKeyDown) {
        event.preventDefault();
        if (!this.wasUndoRedo) {
          this.undo();
          this.wasUndoRedo = true;
        }
      }

      if (event.keyCode === 89 && this.isCtrlMetaKeyDown) {
        event.preventDefault();
        if (!this.wasUndoRedo) {
          this.redo();
          this.wasUndoRedo = true;
        }
      }

      this.event.publish('app.keyDown', event);
    };

    App.prototype.keyUpHandler = function keyUpHandler(event) {
      if (event.code === 'ControlLeft' || event.code === 'MetaLeft') {
        this.isCtrlMetaKeyDown = false;
      }

      if (this.wasUndoRedo && !this.isCtrlMetaKeyDown) {
        this.wasUndoRedo = false;
      }

      if (this.globalError && event.keyCode === 27) {
        this.hideGlobalError();
        return;
      }

      this.keyUpSwagHandler(event.keyCode);

      this.event.publish('app.keyUp', event);
    };

    App.prototype.keyUpSwagHandler = function keyUpSwagHandler(keyCode) {
      var _this2 = this;

      var now = performance.now();

      if (now - this.swagTime > this.swagInterval) {
        this.swagJ = 0;
      }

      this.swagTime = now;

      if (this.swagJ === 0) {
        this.swag.forEach(function (codeWurst, index) {
          if (keyCode === codeWurst[0]) {
            _this2.swagI = index;
            _this2.swagJ = 1;
          }
        });
      } else if (keyCode === this.swag[this.swagI][this.swagJ]) {
        this.swagJ += 1;
      }

      if (this.swagJ === this.swag[this.swagI].length) {
        this.dialogPromise = new Promise(function (resolve, reject) {
          _this2.dialogDeferred = { resolve: resolve, reject: reject };
        });

        this.dialogIsOpen = true;

        if (this.swagI < 2) {
          this.dialogMessage = 'Yuuhuu! May the bockwurst be with you my young compression lover.' + '<br/>Learn more about Compresso\'s awesome bockwurst-guided ' + 'compression by clicking on <em>Okay</em>.';
        } else {
          this.dialogMessage = 'We hear you! You are not alone, help is on it\'s way.<br/>' + 'Meanwhile have a look at our extensive documentation and get ' + 'yourself a nice cup of ☕️';
        }

        switch (this.swagI) {
          case 0:
          case 1:
            this.dialogMessage = 'May the bockwurst be with you my young compression lover.' + '<br/>Learn more about Compresso\'s awesome bockwurst-guided ' + 'compression for segmentation data by clicking <strong>Okay' + '</strong>.';
            break;
          case 2:
            this.dialogMessage = 'We hear you! You are not alone, help is on it\'s way.<br/>' + 'Meanwhile have a look at our extensive <a href="">documentation' + '</a>, get yourself a nice cup of ☕️ , and ping us on <a ' + 'href="https://twitter.com/flekschas" target="_blank">Twitter</a>';
            break;
          case 3:
            this.dialogMessage = 'Exactly! HiPiler is a <strong>cool</strong> piece of software. ' + 'If you want to go more low-level and play with those Hi-C maps ' + 'directly we highly recommend checking out ' + '<a href="https://github.com/mirnylab/cooler" target="_blank"> ' + '<strong>Cooler</strong></a>. Cooler is a fine piece of digital ' + 'craftmanship for smart storing and outragously efficient ' + 'querying of Hi-C maps, provided by the smart folks at Mirnylab.';
            break;
          default:
        }

        this.dialogPromise.then(function () {
          if (_this2.swagI < 2) {
            window.open('https://github.com/vcg/compresso');
          } else {
            _this2.router.navigateToRoute('docs');
          }
        }).catch(function () {});
      }
    };

    App.prototype.mouseUpHandler = function mouseUpHandler(event) {
      this.event.publish('app.mouseUp', event);
    };

    App.prototype.mouseMoveHandler = function mouseMoveHandler(event) {
      this.event.publish('app.mouseMove', event);
    };

    App.prototype.resetHandler = function resetHandler() {
      var _this3 = this;

      this.dialogPromise = new Promise(function (resolve, reject) {
        _this3.dialogDeferred = { resolve: resolve, reject: reject };
      });

      this.dialogIsOpen = true;
      this.dialogMessage = 'Are you sure you want to reset your current session? This cannot be ' + 'undone.';

      this.dialogPromise.then(function () {
        _this3.reset();
        _fragmentsState2.default.reset();
        _this3.exploreIsReady = false;
        _this3.router.navigateToRoute('home');
      }).catch(function () {});
    };

    App.prototype.resumeExploration = function resumeExploration() {
      this.router.navigateToRoute('explore');
    };

    App.prototype.scrollHandler = function scrollHandler(event) {
      this.event.publish('app.scroll', event);
    };

    App.prototype.setConfig = function setConfig(config) {
      if ((0, _validateConfig2.default)(config.fgm, config.hgl)) {
        this.store.dispatch((0, _appActions.updateConfigs)(config));
        this.router.navigateToRoute('explore');
      } else {
        this.showGlobalError('Corrupted Config File', 3000);
      }
    };

    App.prototype.showGlobalError = function showGlobalError(msg) {
      var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _appDefaults.ERROR_DURATION;

      if (this.globalErrorDisplay) {
        clearTimeout(this.globalErrorDisplay);
      }

      this.globalError = true;
      this.globalErrorMsg = msg;

      (0, _domEl2.default)(this.baseEl).addClass('is-global-error');

      this.globalErrorDisplay = setTimeout(this.hideGlobalError.bind(this), duration);
    };

    App.prototype.update = function update() {
      var state = this.store.getState().present;

      try {
        this.exploreIsReady = (0, _validateConfig2.default)(state.explore.fragments.config, state.explore.higlass.config);
      } catch (e) {
        this.exploreIsReady = false;
      }
    };

    _createClass(App, [{
      key: 'currentRoute',
      get: function get() {
        try {
          return this.router.currentInstruction.config.name;
        } catch (e) {
          return undefined;
        }
      }
    }]);

    return App;
  }()) || _class);
  exports.default = App;
});
define('environment',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = {
    debug: false,
    testing: false
  };
});
define('main',['exports', 'aurelia-framework', 'aurelia-logging-console'], function (exports, _aureliaFramework, _aureliaLoggingConsole) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.configure = configure;

  if (Promise.config) {
    Promise.config({
      warnings: {
        wForgottenReturn: false
      }
    });
  }

  function configure(aurelia) {
    aurelia.use.standardConfiguration().feature('resources');

    if (!window.hipilerConfig) {
      window.hipilerConfig = {};
    }

    if (window.hipilerConfig.debug) {
      _aureliaFramework.LogManager.addAppender(new _aureliaLoggingConsole.ConsoleAppender());
      _aureliaFramework.LogManager.setLevel(_aureliaFramework.LogManager.logLevel.debug);
    }

    if (window.hipilerConfig.testing) {
      aurelia.use.plugin('aurelia-testing');
    }

    aurelia.start().then(function () {
      return aurelia.setRoot();
    });
  }

  exports.default = {
    configure: configure
  };
});
define('configs/app',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var name = exports.name = 'HiPiler';

  var routes = exports.routes = [{
    route: '',
    name: 'home',
    title: 'Home',
    moduleId: 'views/home',
    nav: false
  }, {
    route: 'about/:anchor?',
    href: '#about',
    name: 'about',
    title: 'About',
    moduleId: 'views/about',
    nav: true,
    icon: 'info'
  }, {
    route: 'docs/:anchor?/:anchor2?',
    href: '#docs',
    name: 'docs',
    title: 'Documentation',
    moduleId: 'views/docs',
    nav: true,
    navTitle: 'Docs',
    icon: 'help'
  }, {
    route: 'explore',
    name: 'explore',
    title: 'Explore',
    moduleId: 'views/explore',
    nav: false
  }];

  var transition = exports.transition = {
    veryFast: 150,
    fast: 200,
    semiFast: 250,
    normal: 330,
    slow: 660,
    slowest: 1000
  };

  exports.default = {
    routes: routes,
    transition: transition
  };
});
define('configs/colors',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var BLACK = exports.BLACK = 0x000000;
  var GRAY = exports.GRAY = 0x999999;
  var WHITE = exports.WHITE = 0xffffff;

  var GRAY_LIGHT = exports.GRAY_LIGHT = 0xbfbfbf;
  var GRAY_LIGHTER = exports.GRAY_LIGHTER = 0xd9d9d9;
  var GRAY_LIGHTEST = exports.GRAY_LIGHTEST = 0xe5e5e5;
  var GRAY_DARK = exports.GRAY_DARK = 0x666666;
  var GRAY_DARKER = exports.GRAY_DARKER = 0x444444;
  var GRAY_DARKEST = exports.GRAY_DARKEST = 0x222222;

  var CYAN = exports.CYAN = 0x3ae0e5;
  var GREEN = exports.GREEN = 0x40bf00;
  var ORANGE = exports.ORANGE = 0xff5500;
  var PINK = exports.PINK = 0xec3bb6;
  var RED = exports.RED = 0xf60029;
  var YELLOW = exports.YELLOW = 0xffcc00;
  var BLUE = exports.BLUE = 0x4e40ff;

  var PRIMARY = exports.PRIMARY = ORANGE;
  var SECONDARY = exports.SECONDARY = BLUE;

  var LOW_QUALITY_BLUE = exports.LOW_QUALITY_BLUE = 0xdcd9ff;
  var LOW_QUALITY_BLUE_ARR = exports.LOW_QUALITY_BLUE_ARR = [0.862745098, 0.850980392, 1];
  var LOW_QUALITY_BLUE_RGBA = exports.LOW_QUALITY_BLUE_RGBA = [220, 217, 255, 255];
  var LOW_QUALITY_ORANGE = exports.LOW_QUALITY_ORANGE = 0xffd9cb;
  var LOW_QUALITY_ORANGE_ARR = exports.LOW_QUALITY_ORANGE_ARR = [1, 0.890196078, 0.835294118];
  var LOW_QUALITY_ORANGE_RGBA = exports.LOW_QUALITY_ORANGE_RGBA = [255, 227, 213, 255];

  exports.default = {
    BLACK: BLACK,
    GRAY: GRAY,
    WHITE: WHITE,
    GRAY_LIGHT: GRAY_LIGHT,
    GRAY_LIGHTER: GRAY_LIGHTER,
    GRAY_LIGHTEST: GRAY_LIGHTEST,
    GRAY_DARK: GRAY_DARK,
    GRAY_DARKER: GRAY_DARKER,
    GRAY_DARKEST: GRAY_DARKEST,
    CYAN: CYAN,
    GREEN: GREEN,
    ORANGE: ORANGE,
    PINK: PINK,
    RED: RED,
    YELLOW: YELLOW,
    BLUE: BLUE,
    PRIMARY: PRIMARY,
    SECONDARY: SECONDARY,
    LOW_QUALITY_BLUE: LOW_QUALITY_BLUE,
    LOW_QUALITY_BLUE_ARR: LOW_QUALITY_BLUE_ARR,
    LOW_QUALITY_BLUE_RGBA: LOW_QUALITY_BLUE_RGBA,
    LOW_QUALITY_ORANGE: LOW_QUALITY_ORANGE,
    LOW_QUALITY_ORANGE_ARR: LOW_QUALITY_ORANGE_ARR,
    LOW_QUALITY_ORANGE_RGBA: LOW_QUALITY_ORANGE_RGBA
  };
});
define('configs/examples',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var rao2014Gm12878Mbol1kbMresChr22Loops = exports.rao2014Gm12878Mbol1kbMresChr22Loops = {
    name: 'Loops in chromosome 22 of GM12878',
    data: 'Rao et al. (2014) GM12878 Mbol 1kb',
    url: 'https://rawgit.com/flekschas/8b0163f25fd4ffb067aaba2a595da447/raw/rao-2014-gm12878-mbol-1kb-mres-chr22-loops.json'
  };

  var rao2014Gm12878Mbol1kbMresTelomeres = exports.rao2014Gm12878Mbol1kbMresTelomeres = {
    name: 'Telomere contacts of GM2878',
    data: 'Rao et al. (2014) GM12878 Mbol 1kb',
    url: 'https://rawgit.com/flekschas/3700ffa02aac69b52a2b10300299f967/raw/rao-2014-gm12878-mbol-1kb-mres-telomeres.json'
  };

  var rao2014Gm12878VsK562Mbol1kbMresTelomeres = exports.rao2014Gm12878VsK562Mbol1kbMresTelomeres = {
    name: 'Telomere contacts of GM12878 vs K562',
    data: 'Rao et al. (2014) GM12878 and K562 Mbol 1kb',
    url: 'https://rawgit.com/flekschas/a397dded3694fc3984c6acdae6a837fd/raw/rao-2014-gm12878-vs-k562-mbol-1kb-mres-telomeres.json'
  };

  exports.default = [rao2014Gm12878Mbol1kbMresChr22Loops, rao2014Gm12878Mbol1kbMresTelomeres, rao2014Gm12878VsK562Mbol1kbMresTelomeres];
});
define('configs/icons',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var ARROW_BOTTOM = exports.ARROW_BOTTOM = {
    viewBox: '0 0 16 16',
    svg: '<path d="M1 5l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2"/>'
  };

  var BIORXIV = exports.BIORXIV = {
    viewBox: '0 0 16 16',
    svg: '<path d="M8.827 14.25c-.326-.4.442-1.947 1.84-3.662l.76-.947-.612-1.44c-1.01-2.44-1.073-2.525-1.862-2.62-.43-.042-.484-.084-.484-.315 0-.348.378-.526 1.135-.526 1.23 0 1.642.388 2.483 2.355.306.726.58 1.326.59 1.326.084 0 1.557-2.272 1.84-2.83.16-.336.37-.662.464-.736.2-.168.484-.115.62.116.274.42-.64 2.157-2 3.82l-.514.63.663 1.62c.948 2.315 1.042 2.473 1.558 2.536.715.105.894.368.452.673-.315.22-1.557.22-1.988 0-.432-.222-.842-.895-1.43-2.378l-.496-1.252-.19.242c-.44.547-1.03 1.462-1.598 2.483-.495.862-.652 1.073-.852 1.073-.127 0-.295-.074-.38-.17z" fill="currentColor"/><path d="M0 11.26c0-.114.074-.21.158-.21s.22-.136.315-.315C.61 10.483.63 9.82.63 6.538.63 4.17.59 2.54.527 2.37c-.063-.156-.2-.304-.316-.335C.095 2.003 0 1.887 0 1.782c0-.19.116-.2 2.188-.2 1.642 0 2.325.042 2.725.158 1.81.537 2.473 2.42 1.368 3.882-.24.305-.672.642-1.398 1.073-.17.095-.074.242.873 1.42C6.912 9.558 7.743 10.368 8.69 11l.62.42-1.104.033c-1.157.032-1.767-.073-2.178-.4-.378-.294-2.05-2.398-2.798-3.523l-.705-1.053v1.968c0 2.04.074 2.44.442 2.556.105.043.19.158.19.274 0 .19-.085.2-1.58.2-1.503 0-1.577-.01-1.577-.21zM3.482 5.94c.39-.116.705-.305 1.01-.62.41-.4.453-.495.453-.958 0-.958-.6-1.515-1.62-1.515-.832 0-.8-.063-.8 1.694 0 1.787-.063 1.693.957 1.398z" fill="currentColor">'
  };

  var CALENDAR = exports.CALENDAR = {
    viewBox: '0 0 16 16',
    svg: '<path d="M14.857,16H1.143C0.512,16,0,15.487,0,14.857v-12c0-0.631,0.512-1.143,1.143-1.143h1.143v0.571C2.286,3.233,3.053,4,4,4 s1.714-0.767,1.714-1.714V1.714h4.572v0.571C10.286,3.233,11.054,4,12,4s1.714-0.767,1.714-1.714V1.714h1.144 c0.63,0,1.143,0.512,1.143,1.143v12C16,15.487,15.487,16,14.857,16z M14.857,5.714H1.143v9.143h13.714V5.714z M11.982,3.429 c-0.622,0-1.125-0.503-1.125-1.125V1.125C10.857,0.503,11.36,0,11.982,0c0.621,0,1.125,0.503,1.125,1.125v1.179 C13.107,2.925,12.604,3.429,11.982,3.429z M3.982,3.429c-0.622,0-1.125-0.503-1.125-1.125V1.125C2.857,0.503,3.36,0,3.982,0 c0.622,0,1.125,0.503,1.125,1.125v1.179C5.107,2.925,4.604,3.429,3.982,3.429z" fill="currentColor"/>'
  };

  var CODE = exports.CODE = {
    viewBox: '0 0 16 16',
    svg: '<path d="M5 11.838l-.437.438c-.058.058-.125.087-.2.087s-.144-.03-.202-.087L.088 8.2C.03 8.144 0 8.076 0 8c0-.076.03-.143.087-.2L4.16 3.723c.06-.058.127-.087.203-.087s.143.03.2.087L5 4.162c.06.058.088.125.088.2s-.03.143-.088.2L1.564 8 5 11.437c.058.058.087.125.087.2 0 .076-.028.143-.087.2zm5.168-9.33l-3.262 11.29c-.023.074-.068.13-.135.17-.066.038-.134.045-.204.02l-.542-.147c-.076-.023-.133-.068-.17-.135-.038-.066-.045-.14-.022-.214l3.26-11.288c.024-.076.07-.132.136-.17.067-.038.135-.046.206-.022l.542.15c.075.022.132.067.17.135.04.066.045.137.022.213zM15.912 8.2l-4.074 4.076c-.058.058-.125.087-.2.087-.076 0-.143-.03-.2-.087L11 11.838c-.06-.058-.088-.125-.088-.2 0-.076.03-.144.088-.2L14.436 8 11 4.563c-.06-.058-.088-.125-.088-.2s.03-.143.088-.2l.437-.44c.06-.057.125-.086.2-.086.076 0 .144.03.2.087L15.913 7.8c.06.057.088.124.088.2 0 .075-.03.143-.088.2z" fill="currentColor"/>'
  };

  var CROSS = exports.CROSS = {
    viewBox: '0 0 16 16',
    svg: '<path d="M16 2l-2-2-6 6-6-6-2 2 6 6-6 6 2 2 6-6 6 6 2-2-6-6" fill="currentColor"/>'
  };

  var DATA = exports.DATA = {
    viewBox: '0 0 16 16',
    fillRule: 'evenodd',
    svg: '<path d="M7.936 0c-3.17 0-6.538 1.013-6.538 2.89v10.22c0 1.877 3.37 2.89 6.538 2.89 3.17 0 6.538-1.013 6.538-2.89V2.89c0-1.877-3.368-2.89-6.538-2.89zm5.57 13.11c0 .802-2.12 1.92-5.57 1.92s-5.568-1.118-5.568-1.92v-1.84c1.228.868 3.443 1.325 5.568 1.325 2.126 0 4.34-.457 5.57-1.324v1.84zm0-3.407c0 .802-2.12 1.922-5.57 1.922s-5.568-1.12-5.568-1.922V7.865c1.228.867 3.443 1.323 5.568 1.323 2.126 0 4.34-.456 5.57-1.323v1.838zm0-3.406c0 .802-2.12 1.92-5.57 1.92S2.368 7.1 2.368 6.298V4.46c1.228.866 3.443 1.323 5.568 1.323 2.126 0 4.34-.457 5.57-1.324v1.837zm-5.57-1.484c-3.45 0-5.568-1.12-5.568-1.92C2.368 2.088 4.486.97 7.936.97c3.45 0 5.57 1.12 5.57 1.922 0 .802-2.12 1.92-5.57 1.92z" fill="currentColor"/>'
  };

  var DOCUMENT = exports.DOCUMENT = {
    viewBox: '0 0 16 16',
    svg: '<path d="M9.777 0h.297l3.555 4.148V14.82c0 .647-.53 1.18-1.185 1.18h-8.89c-.657 0-1.185-.532-1.185-1.19V1.19C2.37.533 2.902 0 3.558 0h6.22zM9.48.593H3.553c-.326 0-.59.27-.59.59v13.634c0 .326.27.59.592.59h8.888c.328 0 .594-.264.594-.59V4.74h-2.37c-.655 0-1.187-.526-1.187-1.19V.594zm.594.296v2.66c0 .33.268.598.59.598h2.195L10.073.888zM4.148 4.147v.593h4.148V4.15H4.148zm0-1.777v.593h4.148V2.37H4.148zm0 3.556v.593h7.704v-.594H4.148zm0 1.778v.593h7.704v-.593H4.148zm0 1.777v.594h7.704V9.48H4.148zm0 1.78v.592h7.704v-.593H4.148zm0 1.777v.593h7.704v-.593H4.148z" fill="currentColor"/>'
  };

  var DNA = exports.DNA = {
    viewBox: '0 0 16 16',
    svg: '<path d="M9.45 1.203C9.193 1.04 8.82.83 8.37.658 8.652.51 9.004.293 9.327 0h1.27c-.26.412-.607.79-1.042 1.124l-.107.08zm.228 13.872c-.384-.287-.767-.483-1.05-.607-.145-.066-.324-.144-.56-.245l-.013-.005c-.036-.015-.46-.19-.932-.524l-.046-.032-.007-.005c-.123-.09-.248-.188-.37-.296h.005c-.207-.186-.404-.405-.565-.654h-.007c-.187-.29-.32-.622-.362-.996h4.587c-.038.376-.164.708-.343.996H6.54c.202.26.447.478.684.655H9.46c-.324.296-.68.514-.964.663.45.17.825.382 1.08.545l.107-.08c1.037-.795 1.585-1.837 1.585-3.012 0-1.225-.55-2.283-1.59-3.06-.2-.148-.4-.273-.584-.375-.294-.174-.7-.394-1.153-.53-.004-.003-.008-.005-.013-.006-.035-.014-.458-.19-.932-.524l-.045-.032-.007-.006c-.124-.09-.25-.187-.37-.295h.004c-.207-.188-.404-.406-.565-.655h-.006c-.187-.29-.322-.622-.362-.996h4.586c-.038.376-.165.708-.344.996H6.414c.2.26.445.478.683.655h2.235c-.324.294-.678.513-.963.662.45.17.824.38 1.08.544l.106-.08c1.036-.796 1.585-1.837 1.585-3.012 0-1.225-.582-2.262-1.594-3.076-.13-.105-.264-.198-.396-.28h.002l-.052-.03c-.202-.123-.395-.22-.56-.29C8.357 1 8.156.922 7.94.857L7.93.854C7.892.84 7.468.664 6.995.33L6.95.296c-.002 0-.005-.003-.007-.005C6.82.204 6.698.107 6.578 0H5.293c.41.633.976 1.095 1.47 1.41-.002 0-.003 0-.004.002.322.2.737.428 1.178.592.254.094.493.208.716.34.004 0 .008.004.012.006l.017.01c.134.08.274.17.413.274l.07.057.012.013c.248.2.443.396.61.63l.01.012c.082.12.154.243.214.37.083.17.142.343.174.516.008.037.016.074.022.112H5.665c.06-.358.197-.69.41-.997h3.3c-.208-.24-.473-.463-.777-.654H6.706l.072-.056c.26-.195.52-.342.74-.448-.412-.18-.78-.395-1.063-.578-.044.03-.09.062-.133.095-1.04.777-1.59 1.835-1.59 3.06 0 2.08 1.758 3.204 2.618 3.63.222.118.464.232.716.325.252.094.492.208.715.34l.013.006.017.01c.134.08.274.17.413.274l.07.056.01.007c.247.2.446.41.615.644l.006.005c.084.118.155.242.215.37.082.17.142.342.174.514.007.037.015.074.02.112H5.793c.06-.358.197-.69.412-.997h3.298c-.208-.24-.473-.464-.777-.656h-1.89l.07-.056c.26-.196.52-.343.74-.448-.412-.18-.78-.396-1.063-.578-.044.03-.088.062-.133.095-1.04.777-1.59 1.834-1.59 3.06 0 1.676 1.142 2.732 2.035 3.302-.003 0-.006.002-.01.004.324.2.738.43 1.18.592.253.094.493.21.716.34l.013.006.017.01c.13.077.268.166.404.268h1.38c-.243-.34-.548-.65-.916-.925zm-3.23 0c-.366.275-.672.585-.914.925h1.38c.256-.192.514-.337.73-.44-.41-.182-.78-.397-1.062-.58-.044.03-.088.062-.133.095z" fill="currentColor"/>'
  };

  var EXTERNAL = exports.EXTERNAL = {
    viewBox: '0 0 16 16',
    svg: '<path d="M12 11.76l1.6-1.316v2.996c0 .442-.357.8-.8.8H.8c-.44 0-.8-.357-.8-.8v-8.8c0-.44.358-.8.8-.8h4.612c-1.185.883-1.736 1.6-1.736 1.6H1.6v7.2H12v-.88zm-1.31-4.68c-3.5 0-4.625.56-6.45 3.56 0 0 0-6.375 6.45-6.376V1.76l5.31 4-5.31 4.16V7.08z" fill="currentColor"/>'
  };

  var FLIP_XY = exports.FLIP_XY = {
    viewBox: '0 0 16 16',
    svg: '<path d="M14.707 2L14 1.293 1.293 14l.707.707L14.707 2z" fill="currentColor"/><path d="M8 14h6V8l-6 6zM8 2H2v6l6-6z" fill="currentColor"/>'
  };

  var GEZWITSCHER = exports.GEZWITSCHER = {
    viewBox: '0 0 16 16',
    svg: '<path d="M16 3.54c-.588.262-1.223.437-1.884.515.678-.406 1.196-1.05 1.444-1.816-.635.374-1.338.65-2.083.796-.6-.638-1.453-1.034-2.397-1.034-1.812 0-3.28 1.47-3.28 3.28 0 .256.028.506.084.747C5.156 5.89 2.738 4.585 1.12 2.6.84 3.083.676 3.65.676 4.25c0 1.137.578 2.143 1.458 2.73-.538-.017-1.044-.167-1.487-.41v.04c0 1.592 1.13 2.92 2.633 3.22-.275.074-.566.115-.865.115-.212 0-.416-.02-.62-.06.42 1.303 1.63 2.254 3.066 2.28-1.124.882-2.537 1.407-4.076 1.407-.266 0-.525-.016-.784-.047C1.456 14.46 3.18 15 5.032 15c6.035 0 9.34-5 9.34-9.338 0-.144-.004-.284-.01-.425C15 4.777 15.558 4.2 16 3.54z" fill="currentColor"/>'
  };

  var GITHUB = exports.GITHUB = {
    viewBox: '0 0 16 16',
    svg: '<path d="M8 .198c-4.418 0-8 3.582-8 8 0 3.534 2.292 6.532 5.47 7.59.4.075.548-.173.548-.384 0-.19-.008-.82-.01-1.49-2.227.484-2.696-.943-2.696-.943-.364-.925-.888-1.17-.888-1.17-.725-.497.055-.485.055-.485.802.056 1.225.824 1.225.824.714 1.22 1.872.867 2.328.663.072-.517.28-.87.508-1.07-1.776-.2-3.644-.888-3.644-3.954 0-.874.313-1.588.824-2.148-.082-.202-.357-1.015.077-2.116 0 0 .672-.216 2.2.82.64-.177 1.323-.267 2.003-.27.68.003 1.365.093 2.004.27 1.527-1.036 2.197-.82 2.197-.82.437 1.102.164 1.916.08 2.116.514.56.823 1.274.823 2.147 0 3.072-1.872 3.748-3.652 3.947.288.248.543.734.543 1.48 0 1.07-.01 1.93-.01 2.195 0 .213.146.462.552.384C13.71 14.726 16 11.73 16 8.196c0-4.418-3.58-8-8-8v.002z" fill="currentColor"/>'
  };

  var GLOBE = exports.GLOBE = {
    viewBox: '0 0 16 16',
    svg: '<path d="M15.997 8c0-4.34-3.478-7.882-7.79-7.992-.005 0-.01-.005-.01-.005v.005C8.134.008 8.07 0 8.002 0c-4.412 0-8 3.588-8 8 0 4.232 3.31 7.7 7.473 7.974.005.004.013.004.018.007l.003-.006c.17.006.34.026.51.026.17 0 .336-.02.508-.026v.004s.005 0 .005-.004c4.163-.267 7.477-3.742 7.477-7.975zM12.7 7.88c-.018-1.21-.232-2.367-.598-3.413.587-.35 1.128-.78 1.613-1.277 1.07 1.272 1.724 2.91 1.756 4.694H12.7V7.88zm-.52 0H8.26V5.594c1.185-.04 2.346-.348 3.39-.88.324.973.52 2.045.533 3.164zM8.26 5.077V.598c1.387.614 2.522 1.934 3.203 3.63-.98.516-2.075.81-3.202.85zm-.522 0c-1.127-.04-2.22-.334-3.203-.85C5.22 2.535 6.348 1.215 7.736.6V5.08zm0 .52v2.286H3.812c.018-1.12.21-2.192.538-3.16 1.047.528 2.2.832 3.386.874zm-4.44 2.28H.523c.03-1.783.683-3.416 1.755-4.693.486.5 1.028.928 1.613 1.282-.366 1.05-.58 2.203-.598 3.412zM3.3 8.4c.034 1.113.227 2.183.554 3.155-.57.345-1.1.77-1.575 1.258C1.26 11.608.626 10.073.535 8.4H3.3zm.516 0h3.92v2.003c-1.204.038-2.37.35-3.424.898-.29-.897-.46-1.876-.496-2.9zm3.92 2.524v4.545c-.042 0-.084-.004-.127-.01-1.368-.66-2.46-1.98-3.12-3.67.997-.524 2.106-.827 3.246-.866zm.522 0c1.048.045 2.173.38 3.216.935-.662 1.65-1.747 2.954-3.1 3.6-.04 0-.078.007-.122.007v-4.542h.006zm0-.526V8.4h3.922c-.036 1.045-.215 2.05-.52 2.96-1.01-.53-2.17-.914-3.402-.962zM12.695 8.4h2.757c-.088 1.674-.724 3.208-1.74 4.416-.442-.414-.983-.83-1.597-1.195.346-.995.548-2.085.58-3.22zm.675-5.594c-.434.453-.93.84-1.45 1.166-.582-1.4-1.453-2.562-2.516-3.318 1.535.294 2.91 1.063 3.966 2.152zM6.61.653C5.54 1.41 4.665 2.57 4.084 3.973c-.53-.327-1.016-.72-1.456-1.172C3.68 1.718 5.06.95 6.61.654zM2.63 13.198c.426-.443.9-.822 1.413-1.142.538 1.34 1.34 2.467 2.336 3.24-1.457-.322-2.752-1.07-3.75-2.098zm6.983 2.105c.98-.763 1.776-1.867 2.313-3.184.512.31.997.674 1.43 1.084-1 1.03-2.293 1.773-3.743 2.1z" fill="currentColor"/>'
  };

  var HELP = exports.HELP = {
    viewBox: '0 0 16 16',
    fillRule: 'evenodd',
    svg: '<path d="M8.79 12.62c0 .103-.038.192-.113.267-.075.076-.164.113-.268.113h-.804c-.103 0-.192-.037-.267-.113-.076-.075-.114-.164-.114-.267v-.803c0-.104.038-.192.113-.268.074-.076.163-.113.266-.113h.803c.103 0 .192.037.267.112.075.075.113.163.113.267v.803zM4.775 5.746c.02-.31.097-.626.233-.95.136-.324.338-.62.606-.888.267-.267.603-.485 1.007-.654.404-.17.874-.254 1.41-.254.46 0 .884.068 1.274.204.39.136.727.322 1.014.557.286.235.51.517.67.846.16.33.238.68.238 1.056 0 .385-.063.716-.19.993s-.287.523-.48.74c-.19.216-.398.415-.62.598-.22.183-.426.37-.618.563-.193.193-.352.404-.48.634-.126.23-.19.505-.19.824v.197c0 .105-.037.194-.112.27-.075.074-.164.112-.268.112h-.52c-.104 0-.193-.038-.268-.113-.076-.076-.113-.165-.113-.27v-.295c0-.375.063-.702.19-.978.127-.277.287-.524.48-.74.19-.216.398-.415.62-.598.22-.185.426-.373.618-.565.193-.192.353-.396.48-.612.126-.217.19-.47.19-.76 0-.236-.055-.445-.162-.628-.108-.183-.252-.336-.43-.458-.178-.12-.382-.216-.613-.28-.23-.067-.467-.1-.71-.1-.49 0-.907.122-1.255.366-.347.245-.586.64-.718 1.183-.02.104-.065.18-.14.233-.076.05-.15.076-.226.076h-.605c-.084 0-.16-.03-.225-.09-.065-.062-.094-.135-.085-.22z" fill="currentColor"/><path d="M8 0c4.415 0 8 3.585 8 8s-3.585 8-8 8-8-3.585-8-8 3.585-8 8-8zm0 .5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5C3.86 15.5.5 12.14.5 8 .5 3.86 3.86.5 8 .5z" fill="currentColor"/>'
  };

  var HOME = exports.HOME = {
    viewBox: '0 0 16 16',
    svg: '<path d="M8.24.627c-.058-.05-.13-.08-.205-.085-.098-.01-.2.02-.273.085L4.544 3.385V1.047H3.088v3.586L.12 7.176l.48.552L8 1.383l7.4 6.345.48-.552L8.24.626z" fill="currentColor"/><path d="M8 1.998l-5.82 4.91v8.552H6.5v-6h3v6h4.32V6.91" fill="currentColor"/>'
  };

  var INFO = exports.INFO = {
    viewBox: '0 0 16 16',
    fillRule: 'evenodd',
    svg: '<path d="M8.64 12.62c0 .103-.036.192-.112.267-.075.076-.164.113-.267.113h-.52c-.104 0-.193-.037-.268-.113-.076-.075-.113-.164-.113-.267V6.056c0-.103.036-.192.112-.267.075-.077.164-.114.267-.114h.52c.104 0 .193.037.268.113.076.074.113.163.113.266v6.564zm.142-8.437c0 .104-.038.192-.113.268-.076.076-.165.113-.27.113h-.8c-.105 0-.194-.037-.27-.112-.074-.075-.112-.163-.112-.267V3.38c0-.103.038-.192.113-.267.076-.076.165-.113.27-.113h.8c.105 0 .194.037.27.113.074.075.112.164.112.267v.803z" fill="currentColor"/><path d="M8 0c4.415 0 8 3.585 8 8s-3.585 8-8 8-8-3.585-8-8 3.585-8 8-8zm0 .5c4.14 0 7.5 3.36 7.5 7.5 0 4.14-3.36 7.5-7.5 7.5C3.86 15.5.5 12.14.5 8 .5 3.86 3.86.5 8 .5z" fill="currentColor"/>'
  };

  var LINK = exports.LINK = {
    viewBox: '0 0 16 16',
    svg: '<path d="M11.636 0c.572 0 1.124.11 1.656.325.53.216 1.008.534 1.43.954.42.42.738.895.954 1.428s.322 1.084.322 1.656c0 .568-.107 1.12-.325 1.656-.218.536-.535 1.012-.952 1.43l-2.18 2.18c-.043.042-.105.1-.19.176-.404.36-.857.633-1.357.82-.5.188-1.012.28-1.538.28-.663 0-1.29-.14-1.88-.424-.444-.208-.846-.492-1.205-.852s-.644-.76-.852-1.205C5.802 8.14 6.145 8 6.546 8c.14 0 .282.02.426.06.247.4.568.72.966.967.466.284.972.427 1.518.427.378 0 .745-.072 1.102-.216.356-.145.674-.356.955-.637l2.182-2.18c.28-.28.492-.6.637-.956.144-.356.216-.724.216-1.103 0-.377-.072-.745-.216-1.1-.145-.357-.356-.676-.637-.956s-.6-.492-.955-.636-.724-.216-1.103-.216-.746.072-1.102.216c-.356.144-.675.356-.955.636l-1.53 1.53c-.485-.132-.987-.198-1.505-.198-.083 0-.2.004-.352.012.076-.083.134-.146.176-.188l2.18-2.182C8.97.862 9.445.545 9.98.326 10.517.108 11.068 0 11.636 0zm-5.09 5.09c.662 0 1.29.143 1.88.427.443.21.845.493 1.205.853.36.36.645.76.854 1.204-.285.284-.628.426-1.03.426-.14 0-.282-.02-.426-.062-.246-.398-.568-.72-.966-.967-.465-.282-.97-.424-1.516-.424-.378 0-.746.072-1.103.215-.356.145-.674.357-.955.637L2.308 9.58c-.28.28-.493.6-.638.954-.144.355-.216.724-.216 1.102 0 .38.072.747.216 1.104.145.355.356.675.637.954.28.28.6.492.955.637.357.145.724.217 1.103.217s.746-.072 1.103-.216c.356-.144.675-.355.955-.636l1.528-1.528c.485.133.987.198 1.506.198.083 0 .2-.003.352-.012-.075.084-.133.146-.175.188L7.45 14.722c-.42.42-.896.738-1.43.955-.532.216-1.083.323-1.655.323-.568 0-1.12-.108-1.655-.327-.536-.218-1.012-.534-1.43-.95-.42-.422-.737-.898-.954-1.43s-.324-1.085-.324-1.657c0-.57.108-1.122.324-1.654s.534-1.01.955-1.43L3.463 6.37c.042-.042.104-.1.188-.176.404-.36.857-.633 1.357-.82.5-.188 1.013-.282 1.54-.283z" fill="currentColor"/>'
  };

  var LOCATION = exports.LOCATION = {
    viewBox: '0 0 16 16',
    svg: '<path d="M12.283,2.831c-0.232-0.552-0.566-1.048-0.992-1.473c-0.426-0.426-0.922-0.76-1.475-0.994C9.246,0.123,8.638,0,8.013,0C7.387,0,6.78,0.123,6.208,0.364C5.657,0.598,5.161,0.932,4.735,1.358 C4.31,1.783,3.975,2.279,3.742,2.831 C3.5,3.403,3.377,4.01,3.377,4.636c0,1.05,0.743,2.744,2.209,5.032c1.075,1.679,2.165,3.083,2.176,3.097l0.25,0.321l0.25-0.321 c0.011-0.014,1.1-1.418,2.176-3.097c1.465-2.289,2.209-3.982,2.209-5.032C12.648,4.01,12.525,3.403,12.283,2.831z M8.013,6.226 c-0.993,0-1.797-0.805-1.797-1.797c0-0.992,0.805-1.797,1.797-1.797s1.795,0.805,1.795,1.797C9.809,5.421,9.006,6.226,8.013,6.226z" fill="currentColor"/><path d="M15.07,11.442c-0.402-0.371-0.973-0.701-1.693-0.98c-0.594-0.231-1.268-0.42-1.998-0.562 c-0.111,0.185-0.229,0.373-0.35,0.564c0.781,0.139,1.5,0.331,2.125,0.573c1.26,0.49,1.982,1.131,1.982,1.759 s-0.723,1.269-1.982,1.759C11.781,15.089,9.951,15.382,8,15.382s-3.782-0.293-5.153-0.826c-1.261-0.49-1.984-1.131-1.984-1.759 s0.723-1.269,1.984-1.759c0.666-0.259,1.439-0.461,2.283-0.601c-0.122-0.193-0.238-0.382-0.35-0.566 c-0.791,0.144-1.52,0.343-2.157,0.59c-0.72,0.28-1.29,0.61-1.693,0.98c-0.455,0.419-0.686,0.874-0.686,1.355 c0,0.48,0.23,0.937,0.686,1.354c0.403,0.371,0.973,0.701,1.693,0.98C4.063,15.691,5.973,16,8,16c2.026,0,3.936-0.309,5.379-0.869 c0.719-0.279,1.289-0.609,1.691-0.98c0.455-0.417,0.686-0.873,0.686-1.354C15.756,12.315,15.525,11.86,15.07,11.442z" fill="currentColor"/>'
  };

  var LOGO = exports.LOGO = {
    viewBox: '0 0 16 16',
    svg: '<path d="M8 8.25L.75 11.633 8 15.017l7.25-3.384L8 8.25z" fill="#fff" stroke="currentColor" stroke-width=".5" opacity="0.7"/><path d="M8 6.8L.75 10.183 8 13.567l7.25-3.384L8 6.8z" fill="#fff" stroke="currentColor" stroke-width=".5" opacity="0.75"/><path d="M8 5.35L.75 8.733 8 12.117l7.25-3.384L8 5.35z" fill="#fff" stroke="currentColor" stroke-width=".5" opacity="0.8"/><path d="M8 3.9L.75 7.283 8 10.667l7.25-3.384L8 3.9z" fill="#fff" stroke="currentColor" stroke-width=".5" opacity="0.85"/><path d="M8 2.45L.75 5.833 8 9.217l7.25-3.384L8 2.45z" fill="#fff" stroke="currentColor" stroke-width=".5" opacity="0.9"/><path d="M8 1L.75 4.383 8 7.767l7.25-3.384L8 1z" fill="#fff" stroke="currentColor" stroke-width=".5" opacity="0.95"/><path d="M8 1L.75 4.383 8 7.767l7.25-3.384L8 1z" fill="none" stroke="currentColor" stroke-width=".5"/><path d="M11.625 6.075l-7.25-3.383M4.375 6.075l7.25-3.383" fill="none" stroke="currentColor" stroke-width=".5" stroke-linecap="butt"/>'
  };

  var LOGO_HARVARD_HMS = exports.LOGO_HARVARD_HMS = {
    viewBox: '0 0 14 16',
    svg: '<path d="M6.94 16l-.06-.038c-.065-.04-6.452-4.13-6.53-10.508V0h13.3v.117s-.003.778-.003 5.254c0 6.605-6.578 10.554-6.645 10.594L6.94 16zM.584 5.22v.117c0 5.985 5.707 9.953 6.36 10.388.665-.416 6.47-4.224 6.47-10.354V.234H.585V5.22z" fill="currentColor"/><path d="M6.984 5.932c.06-.01.1-.054.085-.113-.07-.078-.15-.165-.243-.216-.02-.013-.046-.03-.07-.028-.025.002-.054.02-.07.043-.017.074-.066.168.012.227.075.078.182.093.284.085zM7.48 6.146c.043-.052.073-.12.073-.186-.01-.05-.08-.066-.115-.043-.042.045-.074.12-.056.2.017.04.057.055.1.03zM6.628 7.226c.223-.093.224-.35.37-.512l.014-.142c-.018-.027-.052-.05-.085-.043-.068.11-.18.22-.213.354-.078.087-.105-.108-.2-.056-.033.093-.01.22 0 .312.007.06.054.095.114.086z" fill="currentColor"/><path d="M11.104 6.25l-.045-.06c.09-.29 0-.612-.246-.828-.097-.057-.274-.12-.425-.08l-.03.01-.02.024c-.1.13-.015.243.03.303.022.026.045.057.046.077.027.312-.233.442-.51.58-.084.043-.174.088-.242.133-.587.296-1.373.784-1.42 1.615.01.434.186.838.492 1.15.033.057.07.113.108.17.13.195.253.38.192.592-.027.066-.11.097-.256.097-.436-.03-.693-.508-.9-.892l-.028-.052-.044-.096c.034.014.076.02.126.015l.04-.007.023-.033c.15-.213.056-.457-.013-.635l-.017-.04c-.05-.09-.124-.154-.195-.218-.056-.05-.11-.098-.146-.153h.004c.048-.014.16-.044.17-.174v-.018l-.004-.017c-.06-.188-.075-.402-.052-.6.004-.01.023-.022.044-.035.05-.03.132-.08.132-.2l-.003-.026c-.06-.21-.056-.426-.05-.617.008-.037.022-.075.036-.114.038-.105.086-.236.015-.373l-.03-.04-.04-.01c-.004-.007-.007-.04-.01-.055-.005-.062-.016-.175-.146-.216l-.028-.006c-.187 0-.34-.07-.505-.147-.07-.033-.143-.065-.226-.096-.11-.03-.215.008-.295.042l-.073.027-.1.016c-.133.022-.284.046-.397.168-.08.094-.086.194-.085.293-.066-.047-.092-.123-.068-.21.024-.092-.01-.19-.1-.264-.11-.072-.257-.09-.365-.053-.135.047-.188.17-.23.27l-.027.06-.01.032c-.01.11.014.23.077.33.106.112.232.182.354.25.08.045.157.087.227.14.002.056-.044.122-.09.18l-.018.022-.002.027c-.004.043.005.077.02.104-.048-.01-.093-.03-.13-.063-.014-.01-.028-.035-.043-.06-.037-.063-.088-.15-.217-.168-.137 0-.188.124-.218.198-.008.02-.016.04-.03.065-.02.042-.024.09-.03.133 0 .022-.004.05-.01.07-.31-.106-.61-.273-.945-.522-.13-.1-.235-.245-.338-.385l-.08-.106-.024-.085c-.054-.2-.13-.473-.414-.543l-.015-.004-.017.002c-.057.005-.21.02-.228.16l-.06-.015c-.094-.026-.183-.064-.334-.004-.073.047-.155.107-.207.192l-.015.044c-.008.153.107.198.163.22.017.005.04.015.042 0 0 .114.062.207.113.276-.004.005-.008.01-.013.013-.03.028-.062.06-.093.114l-.1.252.018.037c.036.075.097.2.237.215l.024.002.02-.01c.04-.015.082-.007.137.006.042.01.09.02.144.02.04 0 .076 0 .12-.007.01-.003.022-.005.036-.005l.006.02c.02.048.01.097 0 .16-.005.02-.01.04-.012.06-.096.132-.224.24-.38.316-.093.06-.103.184-.072.272l.012.024c.064.09.198.104.333.086l.04-.005c.11-.005.2-.04.29-.072.047-.017.093-.035.14-.046.05.08.12.168.223.218.106.03.187-.03.237-.073.016-.015.034-.03.053-.032.02.025.033.062.048.115.013.043.027.094.055.143-.043.016-.098.02-.156.025-.115.01-.247.02-.34.12l-.017.018-.006.024c-.028.114.052.218.14.26.125.067.272.09.416.11l.062.01c.058.008.117.005.176 0l-.25.172c-.073.03-.148.053-.222.078-.118.04-.24.08-.33.13-.096.022-.168-.032-.255-.103-.086-.07-.184-.148-.336-.148-.118 0-.21.036-.308.123-.076.074-.104.193-.07.337.03.063.084.087.137.107-.01.09-.055.175-.102.264-.056.105-.12.226-.126.36-.016.096.02.22.123.26.077.043.194.022.26-.043.025-.028.04-.058.054-.083.01-.02.015-.03.02-.032.156.012.303-.004.402-.074.002.07.016.168.118.21l.046.007c.234 0 .356-.204.445-.354l.016-.026.05-.016c.034-.012.066-.02.09-.023-.003.037-.02.075-.046.126-.025.05-.053.108-.065.174l-.003.015.002.015c.014.084.095.14.164.155l.017.004.017-.003c.256-.033.412-.233.55-.41.02-.03.044-.058.066-.085l.018-.03c.017-.037.025-.05.032-.054.16.033.266-.072.334-.17 0 .004 0 .006.002.01l.018.027c.083.09.215.065.295.026.02-.01.042-.02.056-.02l.177-.103c.186.057.38.103.567.147l.046.01c.027.01.028.01.018.088-.005.046-.014.108.005.17-.016.002-.04.005-.07.006-.102.014-.208.016-.32.018-.296.006-.603.01-.846.24l-.156.152c-.16.016-.28.094-.386.162-.09.058-.173.112-.27.128l-.04.016c-.04.03-.117.032-.203.028-.127-.006-.278-.017-.37.146l-.025.043.02.044c.106.224.362.292.534.337.045.02.093.022.136.025.018 0 .046 0 .06.004.01.087.04.223.19.276l.05.008c.047 0 .083-.02.114-.04.047.058.1.102.148.142l.06.05-.05-.008c-.027-.004-.055-.01-.08-.01l-.025-.013-.028.002c-.033.004-.067.01-.102.017-.112.02-.23.032-.286-.034l-.017-.017c-.04-.03-.08-.064-.117-.1-.12-.105-.254-.226-.46-.226l-.024.003c-.096.024-.32.083-.36.302-.015.08.02.137.054.176-.23.19-.246.378-.215.506l.01.027c.018.04.058.136.175.136.047 0 .087-.015.118-.026l.008-.003v.008c.006.122.015.307.19.376l.024.01.025-.004c.057-.008.104-.032.145-.054.03-.016.06-.03.08-.03.005 0 .017 0 .055.025.117.053.238 0 .327-.05.024-.015.048-.028.07-.037.09.008.137.094.195.22l.01.024.06.06c.094.07.21.16.348.16.05 0 .1-.013.145-.037l.033-.03c.067-.095.05-.198.037-.272-.017-.097-.012-.105.013-.12.04-.01.095-.01.15-.007.06.003.12.004.173-.006.05.005.105.01.16.01.08 0 .324 0 .44-.227l.168-.29.03-.128c.012.003.023.008.034.012.042.015.086.03.133.03.048 0 .135-.02.172-.14l.008-.03-.01-.03c-.057-.16-.07-.313-.05-.475.017-.064.04-.124.07-.176l.01.06c.024.137.05.278.11.415-.012.08-.04.16-.067.245-.03.092-.062.187-.073.28-.042.168-.165.314-.352.41-.09.07-.12.173-.076.27.058.11.17.11.208.11l.053-.003.045-.002c.01 0 .022 0 .033.003l.014.002h.015c.27-.035.52-.16.712-.352.103.015.174-.036.234-.07.05-.03.08-.058.127-.033.08.06.168.065.228.065.036 0 .073-.003.11-.006.03-.003.06-.005.09-.005.067 0 .092.012.107.063-.005.05 0 .1.007.15.017.14.01.174-.036.19-.05-.012-.107-.04-.167-.07-.103-.05-.206-.1-.32-.1-.106 0-.2.046-.272.13-.094.09-.122.2-.07.306l.038.065-.033.046c-.064.11-.152.26-.082.433.043.076.12.118.216.118.028 0 .058-.003.107-.015.042-.02.1.003.162.027.043.017.09.034.14.042l.012.01c.104.08.22.175.376.175l.064-.014c.068-.037.09-.1.104-.142.007-.022.01-.034.007-.03.02-.016.055-.028.09-.04.088-.032.234-.083.233-.245.015-.082.085-.17.182-.233.078-.01.268-.065.365-.178h.213l-.155-.13v-.004l-.043-.033c-.02-.018-.046-.046-.068-.07-.01-.01-.02-.02-.027-.03 0-.05.03-.102.078-.177.073-.112.172-.266.05-.45-.01-.035-.015-.073-.02-.11-.015-.12-.033-.267-.163-.37l-.014-.01c.098.025.21.005.283-.087l.018-.022.003-.025c.024-.17-.11-.305-.202-.394l-.022-.022c-.133-.094-.288-.13-.438-.166-.1-.023-.194-.047-.277-.085.233-.003.447-.08.605-.217l.017-.018c.112-.145.22-.28.374-.323l.03-.017c.22-.167.25-.435.25-.69.008-.07.04-.135.092-.187.02-.02.068-.033.11-.047.095-.03.288-.09.23-.304l-.012-.036L10.51 9c-.107-.055-.23-.114-.368-.133l.142-.08c.245-.13.55-.293.535-.662l-.002-.024-.013-.02-.01-.025c-.01-.038-.038-.126-.17-.14-.097.012-.165.068-.225.118-.034.028-.065.055-.106.074-.112.063-.24.09-.378.12-.026.005-.053.01-.08.017.037-.034.07-.076.095-.132.013-.028.022-.058.033-.09.038-.113.066-.185.133-.208l.027-.015c.022-.02.057-.032.093-.046.072-.028.16-.062.208-.158l.014-.026-.005-.03c-.012-.082-.08-.148-.193-.186-.055-.017-.11-.026-.17-.026-.234 0-.437.146-.568.273l-.064.028c-.126.052-.264.11-.382.2.024-.227.227-.413.408-.58l.04-.037c.063-.02.117-.054.17-.087.085-.054.177-.09.228-.068.154.083.318.15.495.093.13-.048.202-.146.267-.233.046-.063.09-.123.146-.153.024 0 .06.01.093.02.045.015.092.03.14.03.063 0 .147-.023.2-.153.04-.182-.058-.31-.14-.41zM5.59 5.846c-.084-.06-.144-.146-.128-.257.018-.075.044-.17.128-.185.042-.01.086.015.086.058-.027.11-.026.22.042.312.18.195.456.252.57.483h-.072c-.214-.135-.404-.307-.626-.41zM3.3 5.463c.047-.027.128.09.128.142.01.045.018.08 0 .114-.033.032-.075.003-.1-.016-.05-.042-.075-.114-.057-.156.003-.045.014-.076.03-.085zm.782 1.806c-.084-.01-.156.102-.24.042-.088-.07.028-.223-.1-.256-.145.06-.27.225-.442.2.112-.188.315-.393.214-.642-.028-.11-.097-.227-.2-.27-.102-.008-.168.108-.27.057-.042-.094-.22-.05-.143-.17.06-.104.303-.113.2-.284-.068-.093-.224-.042-.242-.17.018-.08-.05-.19 0-.243.207-.015.336.187.456.314.23.113.406.343.568.54.368.307.752.577 1.196.697.018.07-.034.135-.085.186-.147.153-.26.33-.413.468-.033.008-.072.003-.1-.015-.153-.146-.133-.446-.398-.454zm-.98 1.606c.005-.015.015-.036.027-.042.034-.02.08.008.112.028.06.06.186.082.186.185-.076.05-.203.085-.3.042-.05-.052-.02-.137-.027-.214zm2.544-.042c-.084.087-.22.015-.312.057-.13.033-.15.35-.313.142-.066-.024-.11.052-.14.086-.07.162-.14.313-.258.44-.026.017-.072.042-.1.015-.015-.108.078-.307-.084-.342-.068-.007-.14.03-.2.06-.126-.01-.286-.002-.354.127-.018.06-.038.134-.114.142-.077-.036-.18-.055-.213-.157-.036-.027-.087-.057-.13-.014-.07.067-.087.183-.198.183-.088 0-.16-.024-.23-.058.02-.198.235-.22.37-.298.274-.06.48-.233.755-.284.43-.162.775-.487 1.11-.81.05-.02.09-.03.14-.03.035.067.033.156.13.172.093.018.213-.1.256.028-.017.178-.027.388-.114.54zm.143.1c.108-.284.195-.624.084-.94-.026-.06-.083-.04-.128-.015-.05.034-.08.11-.156.085-.06-.093.066-.24-.07-.298-.12.026-.183.132-.286.184-.257.154-.573.206-.88.215-.062 0-.11-.02-.144-.043.078-.078.19-.09.284-.143.358-.214.59-.605.882-.897-.026-.126-.134-.28-.014-.397.096-.01.123.104.2.128.128.068.302.103.44.043.12-.024.204-.13.213-.242.01-.052-.038-.082-.07-.1-.034 0-.07.005-.086-.028 0-.06.033-.104.084-.113.145.008.296.312.4.056.06-.204-.127-.355-.272-.483-.033-.043-.06-.085-.042-.143.11-.068-.03-.166.057-.242.145-.11.373-.045.526-.156.265.007.442.21.683.27.033.052.01.163.114.172.023 0 .057.03.057.057-.01.083-.033.17-.057.254-.026.068-.114.09-.114.184 0 .052.076.077.085.13l-.013.34c-.213.068-.113.345-.128.483-.028.112.008.217 0 .327-.053.025-.146.022-.172.1 0 .13.058.227.1.328.078.11.233.14.242.284-.11.01-.21-.067-.313-.1-.162-.087-.276-.258-.37-.413-.026-.024-.06-.033-.085 0-.018.102-.02.26-.114.328-.11-.066-.104-.34-.284-.256-.06.368-.314.66-.527.967-.05.018-.062.09-.128.073zM4.124 11.35c.095.017.182.104.228.187-.076.05-.17.022-.256.014-.052-.04-.08-.135-.07-.184.03-.015.066-.02.098-.015zm2.873-.867c-.146.14-.29.32-.342.526 0 .144-.006.276-.014.412-.042.036-.086-.018-.114-.042-.068-.103-.048-.33-.228-.3-.093.106-.188.264-.128.4.076.11.227.196.143.34-.13.07-.085.27-.257.285-.257.036-.52-.08-.725.1-.07.06-.12.144-.157.228-.117.02-.082-.145-.142-.213-.04-.07-.124-.023-.184-.058-.093-.033-.188-.135-.3-.057-.094.05-.2.164-.31.07l-.157-.042c-.01-.052.056-.12.014-.17l-.3-.13c-.017-.026-.002-.067.016-.085.25-.16.534.023.825-.028.188-.068.364-.02.57-.014.11.01.242.036.31-.058.044-.062.07-.158.03-.228-.088-.187-.365-.232-.4-.455-.017-.042-.042-.08-.084-.1-.07-.024-.116.062-.185.028-.02-.06-.034-.146-.1-.17-.13 0-.29.06-.4-.03.02-.065.106-.05.157-.084.18-.036.336-.15.498-.23l.24-.027c.248-.4.755-.38 1.182-.398l.427-.128c.145.033.175.207.2.327-.01.13-.017.22-.086.33zm1.08 2.405c.03-.02.087.018.1.043.007.045-.053.028-.07.028-.036.01-.04-.01-.057-.027.003-.018.018-.036.03-.042zm2.106-5.99c-.138-.026-.25-.168-.412-.1-.42.197-.87.487-.982.982-.05.19-.038.403.1.555.033.02.078.02.113 0 .085-.152.15-.354.356-.398.12-.042.243-.088.355-.157.018 0 .048-.02.057.015-.05.145-.122.318-.284.37-.12.102-.24.23-.257.383-.008.078-.016.182.043.242.06.052.132-.023.185-.057.22-.273.563-.31.896-.327.016.027-.038.077-.07.086-.283.094-.548.33-.64.61.008.043.034.07.07.086.136-.015.252-.088.4-.07.032.093-.122.093-.158.17-.264.23 0 .748-.44.825-.13.036-.114.18-.2.256-.144.188-.385.24-.625.213-.17.018-.308-.22-.454-.058.018.17.157.27.24.413.217.207.51.212.784.3.033.008.066.036.085.07 0 .06-.077.037-.128.028-.172.023-.372.055-.54-.015-.027-.008-.05.033-.058.058.023.19.226.254.354.356.13.06.31.045.37.198v.2c.06.093.084.206.057.326-.116.136-.192.318-.1.498-.05.044-.132-.003-.183.03-.06.13-.226.16-.27.284-.01.105-.07.198-.172.214-.086-.006-.138.032-.213.014-.054-.06.022-.148-.07-.185-.12-.023-.17.154-.3.085-.06-.033-.115-.053-.142-.112-.007-.078.074-.107.127-.143.28-.033.652-.078.755-.384.016-.148-.054-.272-.03-.4-.04-.16-.206-.266-.368-.283-.154-.043-.33.012-.44-.1-.045-.034-.09-.067-.144-.043-.042.01-.06.07-.113.042-.042-.042-.105-.103-.156-.042-.102.204-.248.438-.497.483-.033-.06.032-.13.058-.2.078-.16.14-.348.17-.525.07-.096.154-.215.1-.342-.1-.29-.228-.603-.14-.938.06-.392-.038-.76-.328-1.024-.164-.093-.29-.263-.485-.3-.13-.04-.33.016-.398-.112.014-.136.17-.222.226-.342l.23-.327c.092-.018.06.108.155.1.18 0 .17-.292.356-.2.087.12.227.154.314.256.12.49.292.958.625 1.352.258.334.658.59 1.067.47.11-.094.258-.193.284-.355.112-.78-.872-1.167-.796-1.936.07-.728.806-1.126 1.395-1.408.324-.17.74-.39.768-.81-.01-.044 0-.072.015-.114.12.042.12.187.128.297.026.135-.104.214-.07.34.035.07.136.096.127.172-.326.008-.374.435-.7.426zM.38 3.82v1.085h13.237V3.82H.38zm1.596.83H.63v-.578h1.346v.578zm3.214 0H3.708v-.578H5.19v.578zm3.246 0h-1.48v-.578h1.48v.578zm3.224 0h-1.482v-.578h1.482v.578zM4.835 2.58c-.102-.093-.23-.104-.35-.106l.01-.047.002-.02-.003-.017c-.03-.13-.018-.26-.008-.394.008-.092.015-.186.012-.286l.05-.003c.084-.005.188-.01.287-.124.057-.097.07-.197.04-.26-.016-.093-.09-.135-.15-.168-.047-.033-.1-.037-.142-.037l-.067.002h-.013C4.496.993 4.496.873 4.496.748V.72L4.482.7C4.41.575 4.28.575 4.236.575c-.03 0-.063.002-.095.005-.04.004-.084.01-.11.003L4.018.58h-.014c-.156.01-.312 0-.468-.008C3.423.565 3.31.56 3.198.56c-.238 0-.42.028-.586.092-.13-.05-.28-.08-.457-.09C2.1.56 2.043.556 1.985.552c-.202-.012-.432-.017-.542.01-.027 0-.057-.004-.087-.007-.158-.02-.296.007-.36.118l-.043.42c-.014.004-.046.002-.075 0l-.06-.002c-.032 0-.126 0-.19.07-.115.1-.084.223-.064.304.042.14.167.18.237.196.045.027.09.027.115.027l.016-.004c.026.152.02.296.01.448-.004.104-.01.21-.004.32-.004 0-.008 0-.013.002-.08.004-.167.01-.25.073-.104.09-.104.207-.104.31v.034l.02.025.02.03c.023.037.062.1.14.117.042.02.086.023.124.023V2.97l.038.095c.02 0 .03 0 .038.003.006.042.003.088 0 .136-.007.11-.015.25.103.35l.027.023h.035l.41.007c.274.004.552.008.834.02l.004.003c.074.05.15.102.258.12l.01.002.013-.002c.12-.008.236-.052.33-.125.277-.015.565-.008.857 0 .174.005.35.01.522.01h.064l.025-.06c.042-.098.035-.218.03-.323-.003-.033-.005-.064-.006-.107-.003-.025-.002-.04-.003-.04.005-.003.018-.005.043-.005l.097.002c.158 0 .252-.067.278-.196.026-.105.016-.205-.028-.282l-.02-.023zM3.992.93c.036-.046.09.007.108.043-.01.717.007 1.424-.02 2.07-.017.036-.052-.008-.08-.025-.043-.108-.008-.24-.008-.345-.026-.575 0-1.16 0-1.744zM2.72.91c.05-.104.175-.14.29-.14l.83.01.027.042c0 .718 0 1.4-.008 2.1-.354.033-.753-.03-1.108.068-.077-.07-.018-.186-.033-.282-.02-.23 0-.487-.013-.727.012-.343-.016-.732.012-1.07zM1.566 2.283c.01-.444.018-.984.018-1.462 0-.034.045-.05.07-.06.31.026.646-.052.895.105l.036.08c.017.594.017 1.196.017 1.816l-.017.23c-.152.01-.303-.07-.47-.054-.17-.016-.355.018-.504-.026-.09-.202-.027-.407-.045-.627zM1.46.893c.036.717-.008 1.407.01 2.088-.01.037-.045.08-.09.08-.052-.22-.044-.432-.026-.655-.018-.45-.008-.955-.008-1.406.017-.046.07-.09.115-.108zM2.1 3.37l-.904-.017c-.062-.054-.035-.178-.035-.248 0-.09.027-.195-.07-.25-.125-.025-.25.01-.33-.087.063-.176.348-.033.4-.23.027-.328-.026-.655-.01-.964-.034-.178-.23-.124-.354-.15-.018-.018-.042-.045-.035-.08.107-.104.32.018.4-.13.036-.144.01-.277.028-.408.044-.044.122-.044.184-.027v.034c-.08.06-.184.176-.15.283.035.742 0 1.407.035 2.104l.062.072c.346 0 .726-.036 1.06.026.018.01.018.037.01.055-.09.035-.196.017-.29.017zm.335-.16c-.283-.077-.594-.024-.894-.06l-.008-.008c.018-.054.062-.1.125-.1.3 0 .59 0 .857.063.01.045-.035.087-.08.105zm.317.258c-.035.045-.105.053-.158.026-.054-.01-.062-.07-.07-.115-.02-.1.08-.132.132-.205.07.01.115.055.15.097.017.072.008.16-.054.196zm.07-.345c.027-.08.125-.054.196-.08.273.01.603-.008.867 0 .045.02.09.054.116.1-.025.053-.105.025-.16.043h-.28c-.232-.01-.46-.026-.665.016-.037-.007-.072-.034-.072-.08zM4.64 2.85c-.117.025-.286-.038-.347.088-.027.14.018.284-.027.424l-.063.027-1.247-.02c-.026-.018 0-.035.01-.053l.124-.044 1.01.008c.104-.025.104-.156.112-.236-.01-.496 0-.93-.01-1.407-.007-.24.037-.47-.017-.7C4.177.884 4.1.847 4.09.787c.054-.026.15-.026.185.027.026.14-.035.327.054.467.088.055.222.028.31.046.036.035.027.09.01.124-.1.1-.304-.026-.357.133 0 .346-.02.68.008 1.036l.055.043c.115.02.257-.025.335.06.01.054 0 .107-.05.126z" fill="currentColor"/><path d="M8.914 2.503c-.03-.004-.056-.007-.073-.014-.02-.267-.012-.478.004-.755.01-.007.034-.01.086-.014.075-.003.178-.01.246-.096.07-.086.072-.232.03-.324-.062-.146-.198-.165-.298-.18l-.05-.008c-.008-.05-.007-.098-.005-.15.002-.08.005-.17-.02-.267l-.01-.038-.056-.033C8.727.597 8.67.56 8.602.56l-.025.002c-.182.02-.372.007-.56-.003C7.897.55 7.78.544 7.66.544c-.25 0-.445.033-.634.112-.04.023-.088 0-.148-.025-.045-.02-.096-.042-.165-.05l-.82-.01c-.046.008-.098.002-.15-.002C5.703.567 5.66.563 5.62.563c-.056 0-.225 0-.316.153l-.038.418c-.055.008-.13-.002-.18.014-.15.028-.246.166-.22.32.028.217.22.234.333.244.02.002.038.003.056.006l.008.117c.008.103.016.2 0 .322l.007.338c-.02.006-.055.007-.098.008-.092 0-.22.003-.3.12l-.01.023c-.034.098-.04.176-.016.244.072.17.24.18.36.19.025 0 .05.002.07.004.008.067.004.137 0 .21-.002.044-.004.09-.004.134v.03l.017.024c.09.136.24.15.343.15.043 0 .088-.002.13-.005.04-.003.076-.005.11-.005h.038c.136-.005.268-.002.4 0 .116.002.234.004.356 0l.194.086c.044.025.09.038.138.038.104 0 .19-.06.262-.106l.343-.017c.16-.012.318-.005.472.002.223.01.438.014.616-.013l.032-.01c.14-.073.124-.204.115-.282-.004-.037-.008-.072 0-.093.02-.05.015-.098.01-.133V3.09c.007-.003.013-.004.02-.005.113-.02.255-.043.334-.173l.013-.027c.024-.098.003-.188-.058-.262-.066-.098-.167-.11-.24-.12zM8.35.937c.045-.026.116.026.116.08-.01.673.018 1.398-.027 2.053-.036.01-.08-.035-.09-.07-.008-.276-.035-.55-.017-.84.018-.384-.027-.832.018-1.223zM7.06 2.804V.964c0-.062.042-.116.096-.134.098-.068.23-.042.355-.06l.698.018.02.05c-.01.692.007 1.4-.01 2.09l-.036.018c-.38.035-.75-.062-1.096.062-.063-.035-.01-.142-.026-.204zM5.944.806c-.01-.038.026-.018.044-.026.29.018.636-.045.894.068.08.07.07.195.07.303-.008.335.02.733-.017 1.09l.01.12c.018.23 0 .417-.01.657-.106-.018-.222-.053-.335-.07-.223 0-.436.017-.647-.02l-.018-.078c0-.69.01-1.347.01-2.044zm-.142.068l.035.036c.026.61-.035 1.16 0 1.77-.053.14.062.345-.143.38-.035-.61-.008-1.266-.026-1.928-.018-.107.045-.204.134-.258zm.813 2.532c-.354-.01-.733.018-1.078-.027l-.035-.027c-.01-.157.01-.326-.062-.47-.106-.043-.238 0-.354-.034-.054-.028-.035-.1 0-.133.115-.062.336.034.397-.124-.01-.347.02-.674 0-1.027-.098-.142-.3-.01-.39-.142.037-.203.32-.028.4-.195L5.52.812c.054-.053.124-.034.185-.025-.02.077-.088.104-.124.166-.053.143.01.285-.017.434.01.61 0 1.187.01 1.787 0 .047.032.1.077.106l.95.02c.05.008.113.026.148.06-.018.055-.09.037-.133.046zm.214-.15c-.31-.114-.702-.036-1.028-.088.026-.044.054-.09.098-.125.308.027.646-.017.946.063.036.008.08.044.054.087l-.07.063zm.193.258c-.062.008-.16 0-.16-.09.02-.062.07-.115.134-.15.063-.02.096.043.113.08 0 .07-.008.16-.087.16zm.186-.277c-.055.01-.115 0-.124-.06.033-.08.14-.107.23-.116.317-.025.628 0 .937 0 .045.028.1.072.1.117l-.047.016c-.37.008-.753-.043-1.097.044zm1.44-.3c-.026.16.045.3-.018.452l-.044.025c-.45-.01-.893-.01-1.317-.018-.017-.008-.008-.036.01-.044l.08-.045c.353-.035.74 0 1.114-.035.054-.01.096-.05.088-.105 0-.673.01-1.374.01-2.125-.02-.106-.123-.17-.14-.265.06 0 .175-.035.21.043 0 .16-.01.303.027.46.104.1.405-.04.343.196-.096.063-.23.018-.335.036l-.028.036c-.044.354.027.718 0 1.036.01.035.027.098.08.104.098.012.25-.06.282.065-.015.21-.29.018-.362.185z" fill="currentColor"/><path d="M13.328 2.533c-.052-.026-.105-.037-.152-.046-.024-.005-.048-.01-.068-.016 0-.08-.003-.163-.006-.243-.005-.177-.01-.344.002-.502.013-.003.032-.003.058-.004.06 0 .144-.002.215-.074.048-.055.128-.147.103-.276-.026-.212-.2-.232-.303-.245-.033-.004-.066-.008-.09-.016-.003-.036-.002-.074 0-.113.006-.12.012-.253-.08-.368L12.987.6 12.95.595c-.115-.024-.23-.026-.34-.028-.107-.002-.208-.004-.307-.024L12.285.54l-.02.002c-.095.017-.202.018-.315.02-.216 0-.44.002-.626.12-.016-.005-.03-.01-.045-.017-.105-.04-.214-.08-.34-.08L9.698.56l-.11.083-.016.475-.062.01c-.11.015-.256.036-.328.188l-.008.025c-.034.197.043.292.11.333.06.043.13.043.194.044h.084c-.004.154 0 .31.004.47.003.096.006.193.006.292h-.042c-.028 0-.064 0-.1.017-.134.033-.22.12-.23.23-.017.134.04.25.143.295.05.022.102.03.147.035.033.004.074.01.09.02.008.037.004.085 0 .135-.01.12-.02.27.106.377l.027.024.81.008.107.002h.15c.166 0 .34.006.49.1.036.013.074.02.112.02.1 0 .185-.05.252-.093l.032-.02 1.018.01c.114 0 .243 0 .36-.056l.046-.02.01-.05c.014-.08.01-.158.007-.234-.004-.075-.007-.146.007-.2.008-.007.045-.01.064-.014.036-.004.076-.01.108-.024.104-.04.17-.124.185-.24 0-.105-.063-.18-.11-.24l-.032-.025zM12.558.92c.035-.08.106.035.134.08-.02.495-.01.964.01 1.433-.01.223-.01.416-.01.62-.01.017-.01.026-.027.035-.15-.062-.097-.23-.105-.362.01-.187-.02-.4.017-.584l-.026-.062.01-1.16zM10.25.777c.31 0 .576.01.867.034.195.062.143.293.15.442-.01.057-.026.11-.04.166l.034.076.135.026.042-.096c-.022-.076-.044-.15-.064-.225.018-.124-.026-.248.062-.354.184-.116.442-.042.67-.08l.32.01c.043.07.034.168.034.248 0 .425.008.822-.01 1.223 0 0 .018.537-.016.69l-.07.025c-.32.035-.656-.07-.93.09-.054.008-.054-.063-.062-.09l.018-.912c.01-.008.014-.015.018-.02l-.015-.05-.154-.02v.056c.04.012.026.07.035.096.01.3.01.627-.018.902-.098.026-.16-.062-.256-.062-.248.018-.478-.026-.734.01-.09-.036-.062-.143-.062-.223-.01-.672 0-1.257-.01-1.937.01-.015.036-.025.054-.025zm-.177.106c.036.08.02.133.036.213V3c-.018.053-.08.08-.115.115l-.035-.026c-.007-.206.01-.435-.007-.63v-.152c-.01-.415-.01-.875.007-1.3.036-.035.07-.107.116-.124zm1 2.513c-.424-.01-.85.025-1.264-.01l-.035-.043c-.017-.158.02-.31-.052-.45-.098-.09-.38.025-.31-.177.105-.08.273.026.336-.106 0-.37.018-.7-.01-1.044-.08-.106-.23-.036-.335-.062-.036-.036-.062-.09-.027-.134.115-.096.45.026.39-.247.034-.115-.054-.335.105-.345.036 0 .08-.01.104.027-.017.07-.104.123-.13.194.01.726 0 1.513.026 2.264l.063.036c.39.008.806-.08 1.142.08.017.008.008.008 0 .017zm-.246-.196c-.23-.025-.486 0-.718-.025.062-.193.335-.078.487-.113.204.026.433-.036.61.07.027.02.027.063 0 .07-.105.124-.236-.027-.38 0zm.54.32c-.07.01-.133-.025-.15-.088-.02-.09.035-.17.097-.205.08-.01.117.054.152.1.01.078.01.194-.098.194zm.176-.265c-.054-.01-.07-.07-.054-.104.07-.08.188-.06.294-.08l.724.02c.045.025.09.07.1.112-.364.044-.717-.043-1.064.053zm1.683-.45c-.08.115-.273-.017-.327.133l-.018.44-.062.027-1.178-.008c-.02-.02-.01-.027.01-.036l.142-.053h.894c.044-.008.106-.044.106-.106-.01-.697-.018-1.424-.018-2.184l-.107-.21c.045-.046.17-.055.196.015.036.17-.034.34.063.488.104.026.274-.037.328.07-.008.214-.3.045-.362.214.026.336-.026.61.01.974-.036.026-.045.062-.02.097.097.08.22-.053.32.036.06.017.025.07.025.104z" fill="currentColor"/><path d="M6.846 2.213c-.106-.09-.133-.223-.222-.33.035-.053.098-.062.142-.107.07-.068.142-.166.107-.273-.01-.09-.054-.177-.143-.222-.184-.067-.423-.04-.61-.023-.036.017-.045.05-.018.078.07.026.098.08.106.142-.01.24-.01.478-.035.718l-.098.104c.098.088.23.02.373.044.035-.062-.062-.107-.08-.176.018-.07 0-.17.044-.23.134.115.18.3.336.406l.21.016-.008-.114c-.026.017-.077-.025-.104-.033m-.276-.437c-.06 0-.158.045-.175-.033.008-.115-.045-.267 0-.373.08-.062.205-.036.264.044.034.062.034.143.034.214-.035.062-.052.134-.124.148m4.866.25c.035.053.06.106.054.175l-.07.1.043.035c.104-.01.247.026.345-.018-.026-.054-.09-.07-.124-.106-.125-.324-.212-.67-.31-1.004l-.106.05c-.062.3-.187.574-.258.886-.016.06-.078.068-.123.104-.062.017-.088-.054-.115-.087-.008-.268.027-.488.01-.772-.01-.045.044-.098.088-.053.07.035.062.124.09.187.018.026.062.026.068-.02l.045-.272c-.036-.09-.114.01-.186 0-.133-.01-.32.027-.444-.053-.104.036-.077.185-.095.282-.01.017 0 .035.01.043.085-.053.13-.195.255-.16l.007.267-.026.575c-.036.045-.123.06-.116.122.15.045.338 0 .49.018.085.01.184.027.254 0 .018-.018.01-.044-.008-.062-.054-.026-.116-.07-.1-.14.028-.045.037-.133.117-.106.02 0 .027.01.033.024l.127.017v-.005c.018-.017.018-.027.046-.027M11.25 1.9l-.046-.018c.027-.097 0-.21.08-.282.08.054.07.176.106.274-.017.045-.097.045-.14.027m.992-.6c0 .063.047.18-.01.226-.06-.055-.07-.108-.17-.135-.054 0-.106.01-.118.07-.018.192.173.192.28.316.1.1.145.263.1.39-.042.102-.09.162-.188.162-.09.018-.156-.045-.228-.01-.017 0-.053.02-.073-.008l.012-.352c.01-.018.027-.026.045-.026.053.115.017.25.18.26.053-.01.098-.016.106-.087.02-.315-.396-.237-.387-.562.01-.073.02-.136.057-.197.07-.118.233-.047.342-.118.043-.018.043.043.052.07m-4.44-.017c-.09.046-.187.116-.16.24-.027.214-.018.434-.01.666l.144.122-.01.018c-.15 0-.29.027-.44 0-.063-.068.08-.104.105-.158.027-.248.055-.504.027-.78-.026-.08-.16-.045-.124-.13.134-.02.31-.02.442 0l.026.023zm-4.296.17c-.09.107-.108-.097-.196-.107-.053-.006-.133-.025-.176.018-.018.116-.035.223 0 .33.036.027.105.018.15.018.053-.036.08-.134.15-.125.044.045-.02.116.01.16-.018.07.043.15-.036.176-.054-.027-.08-.125-.15-.125l-.124.01c-.044.16-.026.3 0 .452.07.068.158.006.238.006.115-.024.09-.184.187-.166.026.062.035.16.018.23l-.055.034-.628-.007c-.027-.01-.09-.01-.062-.054.205-.123.09-.363.115-.557-.026-.142.08-.355-.106-.442-.01-.052.053-.036.07-.052.16 0 .37.06.496-.07.098.05.09.175.098.272m-.966-.14c-.177.14-.186.39-.266.59-.07.117-.036.286-.15.383-.043.016-.08-.026-.087-.062-.063-.274-.143-.548-.24-.806-.01-.08-.193-.098-.088-.157.13-.018.228.018.353.007.027.08-.098.124-.063.22.08.116.054.292.15.408l.046-.045c.007-.202.237-.39.042-.566.044-.077.178-.023.267-.05.018.015.08.034.035.08" fill="currentColor"/>'
  };

  var LOGO_HARVARD_SEAS = exports.LOGO_HARVARD_SEAS = {
    viewBox: '0 0 14 16',
    svg: '<path d="M.31 4.647l-.14.034v.49c.066 1.105.207 2.007.474 2.986h.15C.525 7.17.375 6.273.31 5.168v-.52zM12.236 10.66c-.017.002-.03.003-.047.003-.32.567-.705 1.144-1.167 1.718-.64.797-1.427 1.59-2.393 2.348.014.035.023.073.028.118l.006.04-.002.002c1.746-1.358 2.927-2.84 3.705-4.25l-.03.01c-.028.004-.062.01-.1.012zM6.187 15.382c-1.14-.686-3.125-2.178-4.476-4.84-.01.01-.03.028-.05.04l-.067.05c1.397 2.738 3.455 4.247 4.594 4.92v-.17z" fill="currentColor"/><path d="M13 7.482c-.093.053-.157.134-.235.242-.148.208-.267.37-.313.43H11.094c.04-.078.09-.187.127-.27.027-.062.048-.127.048-.195 0-.064-.022-.135-.078-.184-.056-.05-.135-.075-.237-.083-.112-.008-.205-.013-.285-.013-.153 0-.262.018-.354.07-.093.055-.157.135-.234.244-.15.208-.268.37-.315.43h-1.83v-.13c.06-.045.222-.164.43-.313.108-.076.19-.14.242-.232.053-.092.07-.202.07-.354 0-.08-.005-.173-.013-.286-.007-.104-.032-.182-.08-.238s-.12-.08-.185-.08c-.068 0-.134.022-.194.048-.084.036-.193.09-.273.127v-1.41l.417-.312.243-.182c-.05-.017-.09-.048-.117-.077-.02-.022-.036-.044-.045-.06l-.01.003c-.16.048-.323.086-.416.124-.052.02-.1.03-.145.03h-.002c-.1 0-.173-.05-.216-.096-.017-.018-.028-.036-.038-.05l-.006.002c-.148.043-.297.08-.383.114-.052.02-.1.03-.145.03-.1 0-.174-.05-.215-.096-.022-.024-.037-.047-.047-.065l-.01.003c-.16.05-.33.09-.425.127-.052.02-.1.03-.144.03-.016 0-.03-.002-.044-.004V5.62l-.073-.035-.2-.092s-.126-.046-.193-.047h-.002c-.062 0-.132.022-.18.078-.042.046-.065.107-.077.184l-.006.054c-.007.092-.01.17-.013.24v.046c0 .152.02.262.07.354.035.058.08.104.134.15l.044.035.065.05.173.122c.005.002.01.005.013.01.116.083.204.148.247.18v1.207h-.38c-.047-.064-.165-.225-.314-.433-.026-.037-.052-.07-.077-.102-.048-.06-.096-.105-.157-.14-.054-.03-.112-.05-.18-.06-.053-.007-.11-.01-.176-.01h-.096l-.19.012c-.102.007-.18.033-.236.082-.028.024-.047.052-.06.082-.013.033-.02.068-.02.1v.005c.002.067.02.13.048.19l.034.075c.03.067.065.14.094.198H3.067c-.046-.063-.165-.223-.314-.43-.005-.01-.012-.018-.018-.026-.048-.068-.093-.124-.145-.168l-.006-.005c-.02-.017-.04-.032-.064-.045-.013-.008-.028-.015-.04-.02-.05-.023-.104-.036-.167-.043-.044-.006-.093-.01-.148-.01-.03 0-.06 0-.093.003l-.193.01c-.104.01-.182.035-.238.084-.04.036-.063.083-.072.13-.005.018-.007.036-.007.053 0 .067.02.132.047.194.037.083.09.192.128.272H.644l.025.092c.23.826.522 1.575.857 2.25.01.02.02.04.027.058l.038.075.07-.047.05-.04.034-.035.008-.01.03-.032.003-.006c.012-.013.02-.027.033-.04l.01-.015c.01-.012.02-.024.028-.038 0-.003.003-.004.004-.006l.195-.27.02-.026c.045-.06.078-.107.1-.135h1.226c-.02.038-.04.085-.063.132-.022.05-.045.097-.063.14-.003.006-.006.012-.008.02-.02.045-.034.093-.04.142v.033c0 .04.008.082.028.12.012.023.028.044.05.062.052.045.123.07.214.08h.023c.056.006.107.01.154.01.048.003.092.004.132.004.152 0 .26-.018.354-.07.093-.054.156-.135.233-.242l.128-.18c.086-.12.153-.208.186-.252h1.453v.604c-.08-.04-.188-.09-.272-.127L5.9 10.4c-.05-.02-.1-.036-.153-.04H5.72c-.062-.002-.133.02-.183.077-.044.05-.068.118-.08.206 0 .01 0 .02-.002.03-.008.103-.012.19-.013.265v.076c.002.047.006.09.013.128.01.065.028.122.058.173.04.068.093.12.162.174.024.02.052.038.08.06.093.065.176.126.244.176.086.063.15.11.187.14v1.224l-.147-.07-.065-.03c-.02-.01-.04-.018-.06-.025-.062-.026-.126-.047-.193-.048-.022 0-.046.003-.068.01-.043.01-.083.032-.115.07-.045.05-.07.118-.08.207l-.004.03c-.007.1-.012.187-.012.262v.074c0 .046.005.087.01.126.012.067.03.125.06.177.014.022.028.043.045.063.05.062.115.112.197.17l.273.198.158.116v1.133l.036.02.006.006c.036.02.07.038.103.058.425.24.688.35.692.35l.032.012.032-.02c.558-.346 1.07-.702 1.542-1.067l.03-.024.002-.002-.005-.04c-.007-.046-.017-.085-.03-.12-.015-.034-.033-.064-.057-.09 0 0-.002 0-.002-.002-.048-.05-.113-.07-.174-.07-.02 0-.04.004-.062.008-.045.007-.088.02-.13.04-.083.036-.192.088-.272.126v-1.41l.025-.02c.076-.056.223-.163.406-.294.108-.078.188-.142.242-.233.04-.072.06-.152.068-.255.002-.03.002-.064.002-.1 0-.08-.004-.175-.012-.287-.003-.03-.007-.06-.014-.088-.01-.04-.022-.072-.038-.102-.01-.018-.02-.032-.032-.047l-.018-.018-.002-.002-.008-.006c-.047-.037-.103-.053-.156-.052-.06 0-.118.017-.174.04l-.02.006c-.083.038-.192.09-.272.13V9.93h.573l.197.272.116.16c.036.05.068.094.103.132.02.024.042.046.066.066.02.016.04.03.063.045.092.053.2.07.353.07.08 0 .174-.005.287-.013h.01c.082-.008.147-.027.198-.06.002-.002.005-.003.006-.006.003 0 .006-.003.008-.005l.015-.01c.057-.05.08-.12.08-.184-.002-.063-.02-.124-.043-.182l-.006-.013-.01-.025-.112-.238V9.93h1.213c.047.064.166.226.313.433l.006.006c.073.1.136.178.223.23l.005.005c.093.053.2.07.354.07.067 0 .146-.004.238-.01l.048-.003c.038-.003.07-.01.1-.015l.032-.007.016-.028c.02-.036.04-.07.058-.106.03-.056.06-.11.087-.165l.012-.024-.007-.026c-.008-.028-.018-.057-.03-.085-.036-.083-.088-.192-.126-.27h.35l.02-.044c.002 0 .002 0 .003-.002l.046-.1c.363-.805.607-1.575.766-2.28l.02-.085-.075-.003h-.01l-.065-.003h-.077c-.156-.006-.265.012-.358.065zM.164 0v3.817h13.67V0H.165zM12.35 2.754l.013-1.972c0-.103.085-.04.085-.04l.08.142c-.02.103 0 .167 0 .167l-.014 1.853c.02.148-.053.064-.053.064-.038-.018-.117-.167-.117-.167l.006-.046zM9.614 1.85s-.014-.483 0-.528c0 0 .02-.444.006-.495 0 0 .008-.104-.012-.155 0 0 0-.065.11-.026 0 0 .04.072.257.04 0 0 .158.025.31.006 0 0 .336-.025.42 0 0 0 .132-.025.172.115l-.007.4.004.01c.015-.04.03-.09.068-.063.015.01.025.023.033.037l.006-.41s.028-.077.133-.09c0 0 .165-.02.19-.006.026.013.38.033.48.013.1-.02.118.063.414-.084 0 0 .08.006.08.058 0 0-.027.547 0 .65 0 0 0 1.003-.02 1.074l.013.32s.013.142-.217.155c0 0 .144.018-.763-.008 0 0-.145-.006-.302.064 0 0-.034-.005-.034-.09 0 0 .026-.3 0-.597l-.01-.26c-.018.005-.047.012-.062.005 0 .06-.002.148-.014.235-.01.08.026.457-.007.648 0 0-.005.064-.144.007 0 0-.84.018-.867-.007 0 0-.23.007-.25-.11.002.003.036-.877.015-.91zM9.49.743s.046 0 .04.077l-.014 1.942s.02.128-.09.212c0 0-.062.07-.062-.04L9.39.954c.002.002.008-.146.1-.21zm-1.803.01c.11-.154.177.155.177.155l-.027 1.933c-.007.065-.02.103-.02.103-.086.02-.137-.16-.137-.16L7.687.754zM6.615 2.598l.013-.816C6.622 1.75 6.643.78 6.643.78c.013-.103.248-.097.248-.097.625.02.61-.032.61-.032.114-.05.12.007.12.007.015.026-.012.283-.012.283.013.032-.015 1.832-.015 1.832-.02.104-.085.07-.085.07-.084.065-.504.026-.504.026-.132-.02-.343.033-.343.033-.032.04-.07-.018-.07-.018l.025-.284zm-1.032.142l.02-2.062c-.005-.053.073-.06.073-.06l.196.05c.047.04.546 0 .546 0 .112.01.118.156.118.156.026.347-.026 2.02-.026 2.02-.007.095-.086.017-.086.017-.32-.01-.446-.004-.446-.004-.046.02-.236 0-.236 0-.164-.02-.16-.116-.16-.116zM5.503.734s.016.128.016.16l-.022 1.86s.02.14-.105.21c0 0-.032.014-.04-.077L5.368.96s.013-.238.137-.226zM3.758.77c.112-.154.178.155.178.155L3.907 2.86c-.006.063-.018.1-.018.1-.087.02-.14-.16-.14-.16L3.757.77zm-1.07 1.835L2.7 1.79c-.008-.032.013-1.003.013-1.003.013-.103.25-.096.25-.096.624.02.61-.032.61-.032.11-.05.12.007.12.007.012.026-.016.283-.016.283.015.032-.012 1.83-.012 1.83-.02.104-.085.072-.085.072-.086.065-.506.025-.506.025-.132-.02-.343.033-.343.033-.03.038-.07-.02-.07-.02l.027-.283zm-1.033.15L1.674.69c-.007-.05.072-.058.072-.058l.196.052c.046.038.546 0 .546 0 .112.006.12.154.12.154.025.347-.028 2.017-.028 2.017-.007.098-.086.02-.086.02-.32-.012-.446-.006-.446-.006-.046.02-.236 0-.236 0-.165-.018-.158-.116-.158-.116zM1.574.75s.014.128.014.16l-.02 1.858s.02.142-.105.213c0 0-.032.013-.04-.077L1.44.973c0 .002.013-.235.137-.223zm.822 2.526H1.37c-.13-.007-.117-.102-.117-.102V2.93c.006-.13-.13-.156-.13-.156-.192.04-.238-.076-.238-.076-.006-.135.218-.123.218-.123.184 0 .13-.16.13-.16l.014-.97c-.014-.097-.25-.097-.25-.097-.152.026-.112-.117-.112-.117.073-.07.23-.062.23-.062.138.006.138-.142.138-.142L1.26.762c.15-.135.177-.026.177-.026-.085.13-.066.445-.066.445l-.005-.024C1.37 1.186 1.358 3 1.358 3c.013.2.15.154.15.154l.854.013c.08 0 .086.05.086.05 0 .066-.052.06-.052.06zm-.11-.207h-.678c-.1.02-.072-.07-.072-.07.06-.11.125-.084.125-.084l.15.038c.053.013.658.007.658.007.19.104 0 .148 0 .148l-.183-.04zm.393.327c-.132 0-.146-.123-.146-.123-.006-.16.12-.16.12-.16.06-.025.13.135.13.135.014.128-.105.147-.105.147zm.07-.372s.06-.063.1-.063c0 0 .658.057.77-.02 0 0 .098-.02.125 0 0 0 .1.077.1.123 0 0-.008.057-.127.025l-.78.006c-.002 0-.207.045-.187-.07zM4.126 1.49l-.02.932s-.014.16.145.154c0 0 .164-.006.196.045 0 0 .112.162-.13.148 0 0-.15-.007-.184.02 0 0-.028.032-.047.333 0 0 .013.182-.125.163 0 0-.914.013-1-.007 0 0-.09.026-.103-.045 0 0 0-.05.09-.05l.922-.006s.084.044.084-.11c0 0 .033-.7.037-1.472.002-.23.012-.47.003-.694 0 0-.02-.096-.047-.115 0 0 0-.103.113-.065 0 0 .098.007.07.155l.007.225s-.02.097.158.07c0 0 .177.026.184.09 0 0 .052.13-.16.117h-.15s-.065.038-.045.114zm2.2 1.77H5.302c-.13-.006-.117-.102-.117-.102v-.244c.007-.128-.13-.154-.13-.154-.19.038-.238-.078-.238-.078-.006-.135.217-.123.217-.123.184 0 .132-.16.132-.16l.013-.97c-.013-.097-.25-.097-.25-.097-.152.024-.113-.117-.113-.117.073-.07.23-.064.23-.064.138.007.138-.14.138-.14L5.19.747c.15-.135.177-.026.177-.026-.086.13-.066.445-.066.445s-.01-.057-.005-.025c.006.032-.006 1.844-.006 1.844.01.2.15.155.15.155l.853.01c.08 0 .085.052.085.052 0 .066-.052.058-.052.058zm-.11-.188h-.678c-.098.02-.072-.07-.072-.07.06-.11.125-.084.125-.084.027.006.15.04.15.04.053.012.658.005.658.005.19.103 0 .148 0 .148l-.183-.038zm.382.328c-.133 0-.146-.123-.146-.123-.006-.16.12-.16.12-.16.06-.026.13.134.13.134.014.13-.103.15-.103.15zm.084-.384s.06-.064.1-.064c0 0 .657.058.77-.02 0 0 .1-.02.125 0 0 0 .098.078.098.123 0 0-.006.058-.124.026l-.783.007c-.002 0-.206.045-.186-.07zm1.375-1.543l-.02.933s-.014.16.145.153c0 0 .165-.006.197.046 0 0 .11.16-.132.148 0 0-.15-.007-.184.02 0 0-.025.03-.046.333 0 0 .014.18-.124.16 0 0-.915.013-1-.006 0 0-.09.027-.104-.044 0 0 0-.05.093-.05l.92-.007s.084.043.084-.11c0 0 .033-.7.038-1.473 0-.23.01-.47.002-.694 0 0-.02-.096-.046-.115 0 0 0-.103.11-.064 0 0 .1.007.073.155l.007.223s-.02.098.16.07c0 0 .175.027.183.09 0 0 .053.13-.16.116h-.148c0-.003-.067.037-.047.113zm2.644 1.77s0 .046-.072.032c0 0-.546.052-1.04.033 0 0-.327.02-.348-.02 0 0-.053-.006-.053-.192 0 0 0-.173-.013-.206 0 0 .013-.09-.15-.11 0 0-.23.04-.236-.096 0 0 .03-.096.256-.083 0 0 .164.028.13-.1l.02-.952s.02-.167-.092-.175c0 0-.104-.005-.138.008 0 0-.19 0-.177-.11 0 0 .065-.115.256-.088 0 0 .145.026.15-.135 0 0-.006-.328.073-.34 0 0 .164.005.118.05 0 0-.08.142-.072.174l-.006.43s-.007.277 0 .31c.007.03-.007.84-.007.84s-.007.156 0 .208v.346s-.014.154.104.116c0 0 1.156-.025 1.23-.006 0 0 .104.018.065.07zm-.02-.15l-1.078-.014-.118.007c-.074-.012-.005-.1.046-.162l.052-.045s.092.097.243.09l.894.013s.098.007.092.058c0 0-.014.078-.132.052zm.29.28c-.066.012-.14-.01-.158-.09-.02-.085.014-.188.104-.207 0 0 .112.02.112.12 0 .105.006.163-.06.176zm.08-.352s.116-.076.162-.063c0 0 .598.038.782.006.184-.033.072-.006.072-.006s.157 0 .204-.058c0 0 .046-.052.072-.007l.1.142s.005.064-.106.057c0 0-1.07 0-1.104.007 0 0-.204.03-.183-.08zM13 2.77s-.276-.006-.257.07c0 0-.02.182-.033.212 0 0 .027.147-.005.174 0 0-.02.083-.197.07 0 0-1.132-.006-1.308.007 0 0-.106-.012-.08-.103 0 0 .08-.038.13-.025.055.013.823-.006.823-.006s.335.025.388-.02l.08-.026s.032-.04.032-.09c0-.05.008-.223.008-.223l.02-.066s-.008-.062 0-1.78c0 0 .025-.134-.06-.217 0 0 0-.05.025-.044.014.002.017.004.017.004.018-.004.117-.027.135.014 0 0 .053.154.007.244 0 0-.014.186.085.186 0 0 .038.04.118.02 0 0 .17.02.17.072 0 0 0 .115-.118.095l-.157.013s-.105.02-.092.14c.013.123-.006.998-.006.998s0 .102.164.095c0 0 .204-.004.204.052 0 0 .053.13-.092.136z" fill="currentColor"/><path d="M6.893 2.346l.19-.007s.073.012.073-.046c0 0-.053-.058-.065-.09 0 0-.006-.61 0-.68l.027-.084s.08-.04.032-.11c0 0-.047-.02-.094-.014l-.065-.012s-.13.007-.11.058l.06.13v.635s-.02.115-.086.147c0 0-.02.065.04.072zM5.81 1.395s.052.058.052.09l-.008.27.007.372s-.006.083-.06.115c0 0-.04.064 0 .084l.212.02s.065-.04.026-.09l-.06-.096.014-.2s.04-.045.06-.02l.236.36s.105.07.132 0c0 0 .007-.025-.026-.05l-.19-.296.013-.103s.204-.076.184-.263c0 0 .04-.186-.222-.27H5.9s-.11-.02-.124.013c0 0-.014.057.033.065zm.21.013s.13-.033.157.005c.026.04.19.18.026.334 0 0-.072.135-.197.04 0 0 0-.194-.006-.334l.02-.045zM1.832 1.464c.014.026.27.817.27.817.112.104.126-.024.126-.024.08-.13.222-.753.222-.753l.06-.122c-.02-.05-.158-.037-.158-.037-.06.006-.02.07-.02.07l.04.136-.133.455c-.047.11-.086-.04-.086-.04-.138-.392-.15-.493-.15-.493.104-.07.025-.136.025-.136l-.243-.006c-.092.006-.04.078-.04.078l.085.056zM2.87 1.446s.02.012.02.037l-.007.683-.02.05s-.065.083-.02.09c0 0-.058.04.422.045 0 0 .184.033.138-.2 0 0-.02-.082-.085.04 0 0-.02.102-.256.07 0 0-.053-.045-.053-.095v-.283s-.008-.07.103-.064c0 0 .124.078.145.045 0 0 .047-.103 0-.167 0 0-.06-.006-.065.02 0 0-.04.077-.15.03 0 0-.053-.103-.02-.185 0 0-.014-.16.098-.147 0 0 .132.026.146.064 0 0 .032.078.065-.013l-.032-.11s-.02-.044-.052-.032c0 0-.223.033-.25.007l-.178.02s-.026.064.053.096zM9.932 1.438l.098-.09.08-.006c.045.018.032.09.032.09-.015.032-.015.572-.015.572.007.115-.025.162-.025.162-.092.115 0 .115 0 .115.04-.005.203.007.203.007.08.006.047-.083.047-.083-.04-.025-.066-.096-.066-.096l.007-.103c.02-.064 0-.54 0-.54.007-.148.092-.104.092-.104.026.072.08.09.08.09.085-.02.064-.166.064-.166.013-.058-.033-.064-.033-.064l-.113.05h-.31c-.05-.012-.11-.05-.11-.05l-.04.006-.06.154v.05c.046.104.068.008.068.008zM11.686 2.157s-.105-.05-.1-.108c0 0-.033-.072-.072-.06 0 0-.045.014-.025.225 0 0 0 .085.097 0l.053.013s.18.142.33-.032c0 0 .163-.147.046-.327 0 0-.086-.13-.237-.194 0 0-.146-.065-.178-.173 0 0 .045-.195.223-.09 0 0 .066.076.105.09 0 0 .052 0 .04-.116l-.016-.097s-.012-.07-.104 0c0 0-.086.032-.106 0 0 0-.25-.02-.256.244 0 0-.026.18.25.296 0 0 .204.096.19.22 0-.002-.026.217-.242.107zM10.956 1.302l.02-.096v-.014c-.008-.014-.02-.027-.033-.038-.038-.026-.054.022-.068.062l.036.12.046-.034zM10.884 1.92v.066c.015.007.044 0 .06-.005v-.067l-.06.006zM10.62 2.12s-.02.076-.092.09c0 0-.04.045.02.057 0 0 .126.04.164-.012 0 0 .046.025 0-.136 0 0 .033-.193.113-.193 0 0 .045.026.052.05 0 .005.004.008.007.01V1.92l.058-.006.003.07.01-.004s.048-.06.073-.045c0 0 .06.083.065.134 0 0 .027.128-.006.16 0 0-.032.026.046.04 0 0 .15.024.197.005 0 0 .11-.033 0-.07 0 0-.06-.052-.092-.117 0 0-.112-.495-.243-.835 0 0-.003-.03-.02-.06v.014l-.02.096-.047.033-.036-.12c-.003.01-.006.018-.01.024.002 0-.21.835-.24.88zm.322-.548s.072.193.072.225-.006.064-.046.064-.144-.005-.144-.005l-.04-.064.052-.21.073-.045.032.037zM12.57 9.93c-.032.066-.064.133-.098.2l-.012-.027c.017.034.03.068.045.1.012.028.02.056.028.084l.008.027.19-.384h-.16zM13.83 4.728l-.003-.615-.066.037-.032.018c-.01.005-.034.017-.06.027-.024.01-.047.022-.064.032l-.05.027-.006.002c-.044.024-.085.046-.118.066-.05.028-.068.047-.086.06-.056.04-.074.097-.074.143v.008l-.006.062c.004.013.002.023.006.03.003.006.005.018.014.032.01.017.022.048.04.068.043.046.114.107.215.107.044 0 0-.02.267-.042v-.004l-.06-.004-.026-.003c0 .04-.014.39-.014.39 0 .595-.07 1.366-.262 2.244l.07.002.07.002c.19-.878.252-1.65.252-2.25l-.006-.44zm-.136-.094l-.06.02c-.04.016-.07.02-.095.02-.058 0-.092-.023-.12-.05l-.007-.01c.063-.024.122-.05.173-.084.034-.022.065-.048.09-.08l.018-.03v.214zM.31 4.647s-.03-.09-.03-.105c0-.03.008-.065.03-.1l-.006.01v-.308H.33c.053 0 .104.012.147.04.03.02.06.046.082.087l-.067.037.118-.065.066-.036C.646 4.146.6 4.1.55 4.068s-.107-.055-.163-.056H.17v.67c.13-.03.123-.03.14-.035zM3.166 4.26c0 .002 0 .004.003.007v.007c.01.02.012.042.012.062v-.017c.11-.06.224-.116.288-.14.046-.018.1-.03.148-.03s.096.012.134.035c.025.016.05.037.068.068l.055-.028s.002 0 .003-.002l.06-.032c-.03-.052-.07-.092-.117-.12-.06-.038-.133-.053-.202-.053-.07 0-.137.015-.197.04-.07.026-.174.078-.28.133l.026.073zM3.97 4.25l.01.02v.002c.007.022.01.043.01.063v-.023c.105-.057.214-.11.276-.134.047-.018.1-.03.15-.03.08.002.15.025.198.1l-.038.02.04-.022.057-.03c.003 0 .006-.003.008-.004l.054-.028c-.076-.122-.204-.172-.318-.17-.07 0-.138.016-.198.04-.072.027-.175.078-.28.134l.03.06zM4.766 4.246c.004.007.007.017.01.027.005.013.007.025.01.037.103-.056.207-.108.27-.13.045-.02.1-.03.148-.03.052 0 .1.01.14.037.026.018.052.043.072.08-.04.02-.077.04-.108.06-.02.01-.035.02-.048.027l.048-.028c.044-.026.1-.057.162-.09l.022-.013.035-.02.006-.002c-.03-.055-.07-.098-.118-.128-.065-.04-.14-.058-.21-.058-.07 0-.14.016-.2.04-.068.026-.168.075-.27.128l.03.064zM5.13 4.52c-.157.05-.33.09-.445.135-.04.016-.07.02-.094.02-.057 0-.09-.023-.117-.05 0-.002-.002-.004-.003-.005h.005c-.027.01-.056.02-.085.028l-.054.016c.01.015.022.032.04.05.04.046.113.096.214.096.045 0 .093-.01.145-.03.093-.037.26-.075.418-.124 0 0-.016-.123-.024-.135zM5.568 4.285c.005.017.007.034.007.05 0 .035-.01.068-.027.096.016-.027.028-.06.027-.094V4.33c.117-.062.242-.124.312-.15.047-.02.1-.03.15-.03.05 0 .096.01.135.035.025.017.05.04.07.072-.013.006-.024.013-.036.02l.06-.033.032-.017.054-.03.008-.003c-.03-.054-.072-.096-.118-.124-.063-.04-.136-.055-.205-.055-.07 0-.14.015-.2.04-.066.025-.167.074-.27.127v.103z" fill="currentColor"/><path d="M5.22 4.633l.078-.03.03-.012c.004 0 .007-.002.01-.003.014-.006.026-.01.04-.018 0 0 0-.002.003-.003.012-.005.022-.01.033-.017.003 0 .006-.003.008-.004l.034-.02c.033-.023.062-.048.084-.08.004-.004.008-.01.01-.015.016-.027.028-.06.028-.094 0-.017-.003-.034-.007-.05V4.18l-.037.02-.006.003-.034.018-.023.013c-.062.033-.117.064-.162.09-.02.01-.034.02-.047.028-.02.012-.034.02-.045.03-.007.004-.015.01-.02.016-.003 0-.005.003-.006.005-.006.004-.01.01-.013.013l-.006.006c-.003.004-.006.01-.01.013l-.004.007-.008.014-.003.006-.006.015-.003.004-.006.02c0 .005 0 .01-.002.017v.022c0 .016 0 .03.004.042l.017.07v.002l.012-.004.057-.02zM6.394 4.263l.004.013c.007.02.01.04.01.06V4.32c.11-.06.224-.116.288-.14.047-.02.1-.03.15-.03s.098.01.137.035c.028.02.055.044.075.084l-.065.036c.022-.012.046-.025.07-.04l.047-.026h.002l.064-.037c-.03-.057-.073-.1-.12-.13-.065-.043-.14-.06-.21-.06-.07 0-.138.016-.2.04-.068.028-.17.08-.275.134l.024.076z" fill="currentColor"/><path d="M5.944 4.597c-.005-.015-.007-.033-.007-.055V4.53c-.03.008-.318.083-.42.125-.038.015-.07.02-.095.02-.057 0-.09-.024-.117-.052l-.014-.016c.004 0 .006-.002.008-.003l-.08.03-.058.018c.01.017.024.04.046.062.042.046.115.095.215.095h.002c.044 0 .093-.01.143-.03.09-.036.248-.073.398-.118l-.02-.065zM6.398 4.276l-.004-.013-.024-.076-.01.005-.008.004-.054.03-.03.016c-.022.01-.042.023-.062.033L6.2 4.28c-.01.004-.02.01-.03.016l-.016.01c-.004 0-.008.003-.01.005l-.02.012c-.042.024-.07.042-.09.054-.004.002-.008.004-.01.007-.008.005-.015.01-.022.017-.002 0-.002.003-.004.004l-.015.015c-.002 0-.003.003-.004.004-.006.005-.01.01-.012.015l-.004.005-.008.014-.003.006-.006.013-.003.006c0 .005-.003.01-.004.014 0 .002 0 .004-.002.006v.014c-.002 0-.002.003-.002.005v.016c0 .02.003.04.007.054l.02.065v.002l.01-.003.054-.02.084-.03c.012-.003.022-.008.033-.012.004 0 .008-.002.01-.004.015-.005.028-.01.04-.018l.007-.002.032-.017c.003 0 .006-.003.01-.005l.034-.02c.036-.023.066-.05.09-.08.01-.015.02-.03.027-.047.008-.02.014-.045.014-.07 0-.02-.002-.04-.01-.06zM7.208 4.278c.006.02.01.038.01.058 0 .04-.016.08-.037.11l-.024.03c.01-.01.018-.02.025-.03.022-.03.038-.07.038-.11.12-.064.25-.13.32-.157.046-.02.1-.03.148-.03.082.002.15.024.2.098l-.036.02c.03-.017.062-.034.095-.05v-.002l.048-.025.013-.005c-.077-.122-.204-.17-.32-.17-.068 0-.137.016-.196.04-.077.03-.193.088-.306.147l.024.076zM6.78 4.58c-.002-.012-.003-.024-.003-.038V4.52c-.028.006-.34.09-.453.135-.037.015-.068.02-.093.02-.056 0-.09-.024-.117-.052l-.008-.01c.002 0 .005 0 .007-.002l-.084.03-.055.02c.01.015.023.034.042.055.036.04.094.08.172.092l.042.003c.044 0 .092-.01.144-.03.095-.038.264-.077.423-.127L6.78 4.58z" fill="currentColor"/><path d="M7.208 4.278L7.184 4.2l-.008.004-.065.035c-.016.01-.032.018-.047.026-.024.014-.05.027-.07.04-.003 0-.005.003-.007.004l-.03.018c-.04.022-.065.038-.084.05l-.008.006-.02.016-.008.008-.01.01-.006.01c-.003.002-.006.005-.008.01l-.005.007-.006.01c0 .004-.002.006-.004.01l-.006.013-.002.005c-.003.007-.005.013-.006.02 0 0 0 .003-.002.005v.01c-.003.01-.003.017-.003.024 0 .014.002.026.004.037l.018.072.012-.002.06-.02.075-.03.03-.012c.004 0 .007-.002.01-.004.013-.005.025-.01.038-.017l.004-.002c.01-.005.02-.01.03-.017.004 0 .006-.003.01-.005l.03-.02H7.1l.005-.005c.02-.013.036-.028.05-.043.01-.01.02-.02.025-.03.022-.03.037-.068.037-.11 0-.02-.003-.038-.01-.057zM8.037 4.246l.01.024.002.002c.006.02.01.042.01.062 0-.01 0-.02-.003-.028.103-.053.21-.105.268-.127.047-.02.1-.03.15-.03.05 0 .098.01.138.036.027.018.052.043.072.08-.01.006-.02.01-.03.017l.085-.046.015-.008.05-.027c-.032-.057-.073-.1-.118-.13-.065-.042-.14-.058-.21-.058s-.14.015-.2.04c-.068.025-.168.074-.27.128l.03.063z" fill="currentColor"/><path d="M7.576 4.605c-.006-.015-.01-.036-.01-.063v-.006c-.033.01-.303.08-.4.12-.037.014-.068.02-.095.02-.055 0-.09-.025-.116-.053l-.016-.02c.002 0 .004 0 .006-.002l-.076.03-.06.02c.01.018.026.04.05.064.04.046.113.096.212.096.046 0 .094-.01.146-.03.086-.034.235-.07.382-.114l-.022-.06zM8.05 4.273h-.002V4.27l-.01-.023-.03-.063h-.003l-.013.006-.047.025-.095.052-.013.007c-.012.006-.022.012-.03.018-.004 0-.007.003-.01.005l-.037.02-.08.047-.027.018c-.024.018-.042.037-.056.058v.002c-.005.007-.01.013-.012.02l-.002.004-.007.015c0 .003 0 .006-.002.008L7.57 4.5l-.002.01-.002.01v.016l-.002.006c0 .026.006.047.012.062l.02.06H7.6l.007-.002.054-.018.084-.03c.013 0 .026-.006.038-.01l.01-.005.042-.02c.002 0 .005 0 .006-.002.012-.005.023-.01.034-.017.004 0 .007-.002.01-.004l.037-.02c.033-.02.062-.043.085-.07l.012-.012.008-.013c.02-.03.033-.065.033-.103 0-.022-.002-.043-.01-.064zM8.77 4.228h.012c.006.002.013 0 .03.014.008.004.02.017.024.03.007.022.01.042.01.063V4.33c.118-.062.243-.125.312-.152.048-.018.1-.03.15-.03.05 0 .097.012.135.036.026.017.05.04.07.072l.057-.03.062-.033c-.032-.054-.073-.095-.118-.123-.065-.04-.137-.056-.206-.056-.07 0-.138.015-.198.04-.077.03-.193.087-.306.147l-.05.027h.017zM10.376 4.22h-.003.003l.07-.038.025.075s.004.005.007.015c.006.015.008.03.01.043v-.002c.106-.057.215-.11.276-.134.048-.02.1-.03.15-.03.08 0 .15.024.2.097l.04-.022.018-.01.06-.03c-.074-.122-.2-.172-.316-.17-.07 0-.14.015-.198.04-.07.026-.174.078-.278.133-.02.01-.042.02-.062.032zM.573 4.81c.046 0 .093-.01.145-.03.086-.034.234-.07.382-.114l-.02-.06c-.008-.015-.013-.037-.013-.064v-.006c-.02.005-.3.08-.4.12-.036.014-.067.02-.093.02-.057 0-.09-.025-.117-.053l-.016-.02c-.02.01-.13.047-.13.047.01.018.027.04.05.064.04.046.114.095.213.095zM1.188 4.015c-.07 0-.138.015-.198.04-.075.028-.2.09-.313.152l.04.13c.116-.06.254-.13.322-.158.046-.02.1-.03.148-.03.082.002.15.025.2.098l-.04.022.16-.085c-.077-.122-.204-.173-.32-.17zM2.717 4.596c-.005-.014-.008-.032-.008-.054V4.53v-.002c-.04.012-.32.087-.42.127-.04.015-.07.02-.096.02-.056 0-.09-.024-.117-.052-.005-.006-.01-.01-.014-.017h.003l-.075.026-.057.02c.01.017.024.04.045.062.042.045.115.095.215.095.046 0 .094-.01.145-.03.09-.036.247-.073.398-.118l-.02-.066zM4.305 4.605c-.006-.014-.01-.036-.01-.063v-.006c-.04.01-.302.08-.4.118-.036.015-.067.02-.093.02-.057 0-.09-.024-.117-.052 0-.002-.003-.004-.005-.006l-.078.027-.058.02c.01.016.025.036.043.054.04.046.11.093.21.093h.007c.044 0 .09-.01.143-.03.085-.035.234-.07.38-.114l-.022-.06zM3.515 4.6c-.005-.014-.01-.033-.01-.057v-.008c-.05.013-.31.083-.406.12-.04.015-.07.02-.096.02-.057 0-.09-.024-.117-.052l-.008-.01s.003 0 .005-.002l-.083.03-.056.018c.01.016.023.036.042.056.042.046.114.095.215.095.045 0 .094-.01.145-.03.088-.035.24-.07.387-.116l-.02-.063zM.677 4.207H.672l-.06.035-.12.065-.005.004-.028.017c-.002 0-.003 0-.004.002-.043.023-.072.04-.09.052l-.02.02H.343c-.006.005-.012.01-.017.017l-.003.002c-.005.006-.01.012-.012.017 0 0 0 .002-.003.004-.023.034-.034.064-.034.098 0 .024.032.107.032.107.002 0 .11-.04.133-.046h.005l.035-.015.007-.004.038-.018h.003L.56 4.55l.01-.005.03-.02c.008-.005.016-.01.022-.016.038-.03.07-.067.086-.112.006-.018.01-.038.01-.058v-.002l-.04-.13z" fill="currentColor"/><path d="M1.55 4.275c-.005-.015-.01-.022-.01-.024l-.026-.07-.007.004-.06.032-.012.006c-.03.016-.06.03-.086.047-.003 0-.005 0-.007.002l-.034.02c-.005 0-.01.004-.013.005l-.03.018-.006.003-.03.018c-.036.02-.06.036-.075.046-.01.006-.015.012-.022.018l-.002.002-.016.017-.003.003-.01.016c-.002 0-.003.003-.004.005l-.01.015c0 .002 0 .004-.002.006l-.006.014-.002.008-.005.012v.008l-.002.012V4.54c0 .028.004.05.01.063l.02.06h.01l.054-.02c.028-.007.057-.017.085-.026l.037-.014.01-.005.042-.018c.002 0 .004 0 .006-.002.012-.005.023-.01.034-.017.004 0 .007-.002.01-.004l.037-.02c.037-.024.07-.05.096-.082.014-.02.025-.04.033-.065.005-.018.008-.036.008-.054v-.028c-.003-.01-.005-.022-.01-.033zM2.066 4.605l.038-.015.006-.003.04-.018v-.002l.037-.018c0-.002.003-.003.005-.004l.034-.02c.034-.023.063-.048.086-.08.02-.027.034-.06.037-.098v-.012c0-.017-.004-.034-.008-.05l-.022-.057-.013-.03-.003.002-.062.034-.01.006c-.008.004-.017.008-.024.013l-.092.05-.036.022-.042.024-.043.028h-.003l-.005.005-.02.017-.006.006-.012.012-.006.008-.008.012-.005.007c-.004.004-.007.01-.008.013l-.005.007-.005.013-.003.007c-.004.006-.005.012-.007.017v.005l-.003.015-.002.02c0 .017.002.03.005.043l.017.07v.002l.013-.005.058-.02c.027-.008.052-.018.076-.027zM3.17 4.27V4.27l-.004-.007-.026-.072-.007.004-.005.003-.04.022-.017.01c-.025.012-.05.026-.074.04l-.034.017-.017.01-.018.01-.03.018-.062.036c-.017.01-.03.018-.038.025l-.006.005-.015.012-.007.008-.01.01-.007.01-.008.01-.006.01-.006.01c0 .004-.002.006-.004.01l-.005.01c0 .004 0 .007-.002.01 0 .004-.003.008-.004.012l-.002.008-.002.012v.01l-.002.014c0 .02.004.04.008.053l.02.065.01-.002.056-.02c.028-.008.057-.018.083-.028.012-.004.022-.01.034-.013l.01-.005.04-.018s.003 0 .004-.002c.012-.006.023-.01.034-.018.004 0 .006-.003.01-.004.01-.008.022-.014.033-.022.036-.022.067-.047.092-.08l.02-.03c.013-.026.02-.054.02-.084 0-.02-.003-.042-.01-.062V4.27zM3.99 4.336c0-.02-.003-.042-.01-.062v-.002l-.01-.023-.032-.062-.06.032c-.002 0-.002 0-.003.002l-.056.03c-.013.006-.024.013-.036.02-.004 0-.008.003-.012.005-.01.005-.02.01-.028.016l-.012.007c-.01.006-.02.01-.027.016-.003 0-.006.002-.008.004-.045.026-.078.046-.096.06 0 0-.004 0-.005.003-.017.012-.03.024-.04.037-.002 0-.003.002-.003.003l-.014.017c0 .002-.002.004-.003.005l-.01.015c0 .003 0 .005-.002.007l-.005.014-.003.01c0 .003-.003.007-.004.01v.008l-.002.012v.008c-.002.002-.002.004-.002.005v.01c0 .023.005.043.01.057l.016.065h.003l.01-.003.055-.018.085-.03.035-.014c.003 0 .007-.002.01-.004.015-.005.028-.012.04-.018.003 0 .005 0 .006-.002l.035-.017.01-.006.037-.02c.025-.017.048-.034.07-.055 0-.002 0-.003.002-.005 0 0 0-.002.002-.002l.018-.02c0-.003.004-.007.005-.01.015-.02.024-.042.03-.066l.005-.025V4.35v-.014zM4.786 4.31c-.002-.012-.005-.024-.01-.035-.003-.013-.006-.022-.01-.03l-.03-.062h-.003l-.05.028-.01.006-.056.03-.04.023H4.57c-.01.008-.023.016-.036.022l-.008.005c-.013.008-.026.015-.04.02-.025.017-.048.03-.065.04l-.038.026c-.01.005-.016.012-.022.018l-.003.002-.016.017s0 .003-.002.004c-.004.005-.01.01-.012.016l-.004.006-.01.014v.008l-.007.012c-.002.003-.002.006-.003.01 0 .003-.003.007-.004.01 0 .003 0 .006-.002.01 0 .003 0 .006-.002.01V4.54c0 .028.005.05.01.064l.022.06.008-.002.054-.018.085-.03.038-.014h.01l.043-.02.004-.002c.012-.005.023-.01.035-.017.004 0 .006-.002.01-.004l.037-.02c.036-.024.068-.05.094-.082.026-.032.043-.074.043-.118V4.31zM8.848 4.335c0-.02-.004-.042-.01-.062-.007-.014-.018-.027-.026-.032-.017-.01-.024-.01-.03-.01l-.01-.002h-.016l-.016.008c-.03.015-.057.032-.084.046l-.013.008-.02.01-.017.01-.017.01-.012.006-.038.023c-.024.013-.042.024-.054.032-.008.006-.015.012-.02.018-.003 0-.004.002-.006.004l-.014.014c0 .002-.004.004-.005.006l-.01.014s0 .004-.003.006l-.008.013-.004.007-.007.014c0 .002-.002.003-.003.005-.004.014-.008.026-.01.038v.02c0 .017.002.03.005.043l.018.07v.002l.01-.004.06-.02c.026-.008.052-.018.076-.027.012-.003.023-.008.035-.013.004 0 .007-.002.01-.003.013-.005.025-.012.038-.018l.003-.002.034-.018c.003 0 .006-.002.008-.004l.034-.02c.03-.022.057-.045.08-.073l.004-.007.006-.01c.02-.028.03-.063.032-.1zM10.487 4.315c-.002-.014-.005-.028-.01-.042l-.006-.016-.024-.075-.07.038-.072.04c-.003 0-.006.002-.01.004l-.013.007c0 .002-.002.003-.005.004l-.035.02c-.003 0-.006.003-.008.004l-.036.02-.03.018c-.002 0-.004.002-.006.004l-.052.03c-.006.005-.012.01-.017.012l-.002.002-.02.016-.006.007-.01.012c-.004.002-.006.004-.008.007-.003.004-.006.007-.008.012-.003 0-.004.004-.006.008l-.007.01c-.002.004-.004.007-.004.01l-.007.01c0 .004-.002.007-.003.01.002.005 0 .008 0 .012-.002.003-.002.006-.003.01 0 .003 0 .006-.002.01v.014c0 .003-.002.006 0 .01 0 .023.003.042.008.057l.02.063h.002l.01-.002.054-.017.083-.03c.012-.003.024-.008.036-.013.003 0 .005-.002.01-.004l.04-.018c.002 0 .003 0 .005-.002.012-.006.023-.01.035-.017l.01-.006.035-.02c.024-.016.046-.033.065-.052l.028-.03c.02-.028.037-.062.04-.1v-.017-.02zM11.286 4.335c0-.008 0-.017-.002-.025-.002-.013-.005-.025-.01-.038V4.27l-.013-.026-.03-.06-.06.032-.017.01-.042.022-.04.022-.04.023c-.003 0-.005.002-.007.003l-.038.022c-.053.03-.088.05-.106.064h-.002c-.023.018-.04.038-.055.058v.002c-.005.006-.01.012-.012.02v.004c-.004.005-.007.01-.008.015 0 .003-.002.006-.003.008l-.005.012c0 .003 0 .006-.002.01v.01c-.002.003-.002.006-.002.01v.011c0 .027.006.05.01.063h.002l.02.06.01-.002.053-.016.084-.028.04-.015s.004 0 .007-.002l.043-.02h.004l.037-.018c.004 0 .006-.003.01-.004l.037-.02c.037-.024.07-.05.095-.082.01-.014.02-.03.028-.046.01-.023.015-.047.016-.073zM.677 4.206l.007-.003c.113-.06.23-.12.307-.15.062-.023.13-.04.2-.04.114 0 .24.05.317.17.102-.054.203-.103.272-.13.06-.024.127-.04.198-.04.07 0 .146.017.21.06.047.03.088.072.12.128l.034-.02c.1-.052.2-.102.27-.128.06-.022.127-.038.198-.038.07 0 .142.016.205.056.047.028.087.07.118.122l.007-.004c.105-.055.21-.107.28-.134.06-.024.13-.04.197-.04.07 0 .14.015.204.054.047.027.086.067.118.12.104-.056.208-.107.28-.135.06-.024.127-.04.197-.04.115 0 .243.05.318.17h.002c.102-.055.2-.104.27-.13.062-.024.13-.04.2-.04s.145.017.21.06c.047.03.088.072.118.128l.035-.02c.102-.05.203-.1.27-.127.06-.023.13-.038.2-.038.068 0 .14.015.204.055.046.028.087.07.117.122l.01-.006c.105-.054.208-.106.277-.132.06-.024.128-.04.198-.04s.145.017.21.06c.048.03.09.073.12.13l.008-.004c.113-.06.23-.117.305-.146.06-.024.128-.04.198-.04.115-.002.242.048.318.17l.002-.002c.1-.053.2-.103.27-.128.06-.024.13-.04.2-.04s.144.017.21.058c.045.03.086.074.117.13.112-.06.23-.12.305-.15.06-.022.128-.037.2-.037.068 0 .14.016.205.056.046.028.086.07.117.122.107-.057.215-.11.287-.14.06-.022.13-.038.198-.038s.14.015.204.054c.045.027.085.067.116.12.104-.056.21-.108.278-.135.06-.024.128-.04.198-.04.115-.002.242.048.317.17.102-.055.202-.105.27-.13.062-.025.13-.04.2-.04s.146.016.21.058c.05.032.09.076.12.13.113-.06.23-.117.306-.146.06-.024.128-.04.198-.04.068 0 .142.016.206.056.045.028.086.07.117.122.107-.057.215-.11.287-.14.06-.022.128-.038.198-.038s.142.016.206.056c.047.03.088.07.12.126h.002l.057-.028.1-.055v-.1H.387c.056.006.11.023.162.055s.094.078.127.138z" fill="currentColor"/><path d="M2.188 4.072c-.064-.042-.14-.058-.21-.058s-.14.015-.2.04c-.067.025-.165.073-.264.126l.028.07.01.024.007.033c.103-.055.207-.107.268-.13.047-.018.1-.03.15-.03.052 0 .1.012.138.038.027.018.053.043.073.08l-.03.015c.016-.008.03-.017.048-.025l.023-.013.012-.006.064-.035c-.03-.054-.072-.098-.118-.128zM3.015 4.07c-.064-.04-.136-.055-.205-.055-.07 0-.14.015-.198.04-.07.025-.208.094-.308.147h.003l.013.027.02.055c.006.017.008.034.008.05V4.332c.117-.06.242-.125.31-.152.048-.018.1-.03.15-.03.05 0 .097.012.136.036.027.016.05.04.07.07l-.017.01.074-.04.018-.008.04-.022.005-.003c-.03-.05-.07-.092-.118-.12zM1.904 4.584C1.9 4.572 1.9 4.56 1.9 4.544V4.52c-.028.008-.336.09-.444.133-.038.015-.068.02-.094.02-.057 0-.09-.024-.118-.052L1.24 4.62c.003 0 .005-.002.007-.003l-.086.03-.053.016c.01.015.022.032.04.05.04.046.113.095.214.095h.002c.044 0 .092-.01.144-.03.093-.037.258-.073.416-.122l-.018-.072zM8.402 4.583c-.003-.012-.005-.025-.005-.04v-.02c-.032.008-.335.09-.443.132-.037.015-.068.02-.094.02-.057 0-.09-.024-.118-.052L7.74 4.62l.004-.002-.084.03-.055.016c.01.015.022.032.04.05.042.046.115.095.214.095.045 0 .093-.01.145-.03.093-.038.258-.076.415-.125l-.017-.07v-.002zM9.19 4.534c-.145.043-.3.08-.403.12-.038.016-.068.02-.094.02-.057 0-.092-.023-.118-.05-.005-.007-.01-.012-.013-.018.002 0 .003 0 .004-.002-.024.01-.05.02-.075.028l-.058.02c.01.017.024.04.045.062.027.03.066.06.117.078.028.01.062.018.1.018.044 0 .092-.01.144-.03.09-.037.252-.075.406-.123-.01-.016-.016-.028-.018-.034-.002-.005-.007-.015-.01-.028l-.01-.067-.016.006zM9.207 4.532l.007.064.012.028c.003.006.008.02.018.034.01.017.022.036.042.056.042.046.115.095.215.095h.002c.045 0 .093-.01.144-.03.088-.035.24-.072.388-.117l-.02-.062c-.006-.014-.01-.034-.01-.058v-.01c-.03.01-.31.084-.407.123-.038.015-.07.02-.095.02-.057 0-.092-.024-.117-.052l-.01-.01c.065-.024.124-.05.175-.083.034-.022.065-.047.09-.08.023-.03.04-.07.04-.114v-.018c.11-.06.223-.115.287-.14.046-.018.1-.03.15-.03.048 0 .094.012.133.035.025.016.05.037.068.068l-.023.014c.003 0 .006-.003.01-.005.02-.013.044-.025.068-.038l.003-.002c.02-.01.04-.02.062-.033-.032-.05-.072-.09-.118-.12-.063-.038-.135-.053-.203-.053-.07 0-.138.015-.198.04-.073.027-.18.08-.288.138-.022.01-.042.022-.063.034l-.058.03H9.51l-.115.066c-.05.028-.082.048-.1.06-.06.043-.084.1-.088.147v.002zM10.803 4.605c-.006-.015-.01-.036-.01-.062v-.006c-.024.006-.3.08-.4.12-.037.014-.067.02-.093.02-.057 0-.092-.025-.117-.053l-.006-.005c0-.002.003-.002.006-.003l-.084.03-.056.017c.01.015.022.033.04.052.04.046.114.095.215.095.044 0 .092-.008.143-.028.087-.035.235-.07.382-.114l-.022-.063zM11.626 4.573V4.52c-.154.048-.332.09-.444.134-.038.015-.068.02-.094.02-.057 0-.092-.024-.118-.052l-.003-.003.004-.002c-.026.01-.055.02-.083.028l-.054.017c.01.015.02.033.04.05.04.046.114.096.214.096h.002c.043 0 .09-.01.142-.03.095-.04.267-.08.427-.128-.01-.013-.013-.023-.016-.028-.004-.008-.013-.03-.018-.05zM12.032 4.2c-.03-.055-.072-.098-.12-.128-.063-.042-.14-.058-.21-.058s-.138.015-.198.04c-.07.025-.17.075-.272.13l.03.058.013.026v.002c.006.013.008.025.01.038v-.002c.104-.055.208-.106.268-.13.048-.018.1-.03.15-.03s.1.012.14.038c.024.017.053.046.072.08l.044-.023.072-.04z" fill="currentColor"/><path d="M12.44 4.594l-.005-.066c-.147.044-.315.085-.422.127-.038.015-.07.02-.094.02-.058 0-.092-.024-.118-.052-.006-.005-.01-.01-.014-.016.06-.023.116-.05.163-.082.034-.022.063-.047.085-.078.022-.03.038-.07.038-.11V4.33c.117-.062.242-.125.31-.15.048-.02.1-.03.15-.03.05 0 .097.013.135.034.036.02.066.066.07.072l.01-.006.048-.025.062-.033h.002c-.03-.048-.077-.096-.12-.122-.063-.04-.137-.056-.206-.055-.07 0-.138.015-.197.04-.077.028-.193.087-.306.146-.02.013-.053.03-.072.04l-.044.024h-.002l-.107.06c-.045.027-.074.045-.092.058-.052.037-.078.086-.086.13v.06c.004.02.013.043.017.05.002.005.007.016.015.028.01.018.023.04.045.062.042.046.114.095.215.095.045 0 .093-.01.145-.03.092-.036.253-.074.407-.12l-.02-.037c-.003-.004-.008-.013-.01-.026z" fill="currentColor"/><path d="M13.55 4.256c-.02-.033-.045-.056-.07-.072-.04-.024-.086-.035-.136-.035s-.104.01-.15.028c-.064.025-.18.082-.288.14v.018c0 .043-.016.083-.04.114-.023.032-.055.058-.09.08-.05.032-.11.06-.173.083l.008.01c.027.027.063.05.12.05.024 0 .055-.004.093-.02.108-.042.27-.08.422-.125v.01l.007.056c.004.013.008.023.012.03l.018.032c-.155.047-.317.085-.41.123-.05.02-.098.028-.142.028h-.002c-.1 0-.173-.05-.215-.095-.02-.02-.032-.04-.043-.056l-.02-.036c0-.005-.005-.014-.01-.028l-.005-.065V4.52c.006-.045.032-.1.087-.138.02-.013.05-.033.1-.06.034-.02.074-.043.118-.066l.01-.006.048-.025.062-.033h.002c.106-.057.214-.11.285-.138.06-.024.128-.04.198-.04s.142.016.206.057c.048.03.09.072.12.127-.023.01-.046.02-.063.03l-.05.027-.008.002z" fill="currentColor"/>'
  };

  var LOGO_HARVARD_VCG = exports.LOGO_HARVARD_VCG = {
    viewBox: '0 0 16 16',
    svg: '<path d="M15.993 8.005C16.008 12.32 12.533 15.998 8 16 3.516 16-.01 12.367.007 7.968.022 3.568 3.6-.052 8.1 0c4.436.052 7.916 3.685 7.893 8.005zM7.99 15.442c4.05.037 7.376-3.253 7.458-7.268.088-4.194-3.246-7.63-7.443-7.63C3.872.55.565 3.853.555 7.99c-.012 4.168 3.388 7.48 7.434 7.452z" fill="currentColor"/><path d="M12.646 7.565c-.336.056-.673.107-1.01.167-1.04.186-2.063.432-3.076.73-.05.017-.11.05-.15.012-.054-.052.007-.108.028-.157.573-1.48 1.05-2.993 1.42-4.535.155-.646.294-1.295.402-1.952.024-.146.08-.157.195-.11.665.268 1.28.618 1.832 1.077.97.812 1.675 1.81 2.087 3.007.352 1.022.443 2.07.297 3.14-.186 1.356-.76 2.533-1.652 3.564-.117.136-.23.2-.43.188-1.655-.09-3.23-.498-4.74-1.17-.197-.086-.39-.185-.586-.273-.09-.042-.104-.093-.06-.18.37-.728.705-1.47 1.015-2.227.033-.08.096-.11.17-.137 1.358-.507 2.744-.905 4.187-1.09.027-.003.052-.016.08-.023l-.008-.032zM8.082 1.256c.124-.017.307.044.494.04.1 0 .126.055.116.15-.09.838-.205 1.675-.348 2.507-.266 1.555-.607 3.098-.967 4.635-.047.2-.14.3-.333.365-.667.232-1.326.482-1.973.764-.1.046-.18.038-.27-.034-1.184-.965-2.153-2.11-2.92-3.43-.266-.453-.28-.458-.048-.955C2.756 3.303 4.28 2.016 6.41 1.46c.526-.138 1.066-.182 1.672-.204zM11.368 13.83c-.435.27-.896.46-1.375.608-.684.215-1.386.32-2.1.306-.8-.017-1.575-.165-2.322-.456-.128-.05-.153-.1-.072-.226.433-.67.848-1.353 1.22-2.062.052-.1.097-.14.21-.067 1.338.845 2.78 1.443 4.315 1.82.04.013.082.017.125.076zM4.807 10.37c.07.002.105.043.143.078.405.37.835.71 1.284 1.022.085.062.112.11.065.215-.35.772-.745 1.516-1.18 2.24-.06.104-.123.116-.227.06-.938-.505-1.73-1.177-2.356-2.042-.084-.115-.07-.173.044-.248.696-.447 1.402-.877 2.126-1.28.035-.02.073-.033.1-.045zM1.268 8.063c-.005-.68.082-1.283.248-1.875.016-.058.012-.15.085-.157.062-.004.074.083.098.133C2.363 7.54 3.243 8.766 4.32 9.85c.098.096.103.15-.03.21-.72.32-1.424.672-2.115 1.048-.103.056-.147.008-.19-.074-.29-.576-.498-1.182-.61-1.817-.07-.403-.12-.807-.107-1.154zM7.13 9.228c.09.015.05.077.037.118-.057.196-.114.39-.18.584-.093.27-.196.535-.29.804-.05.148-.112.17-.25.083-.33-.207-.666-.407-.982-.637-.074-.054-.122-.104-.007-.16.53-.268 1.057-.538 1.604-.77l.067-.022z" fill="currentColor"/>'
  };

  var MAX_HORIZONTAL = exports.MAX_HORIZONTAL = {
    viewBox: '0 0 16 16',
    svg: '<path d="M10 12l4-4-4-4M6 4L2 7.998 6 12M0 0h1v16H0zM15 0h1v16h-1z" fill="currentColor"/>'
  };

  var MIN_HORIZONTAL = exports.MIN_HORIZONTAL = {
    viewBox: '0 0 16 16',
    svg: '<path d="M15 4l-4 4 4 4M1 12l4-4.002L1 4M7 0h1v16H7zM8 0h1v16H8z" fill="currentColor"/>'
  };

  var PEOPLE = exports.PEOPLE = {
    viewBox: '0 0 16 16',
    svg: '<path d="M10.706,11.939c-0.229-0.051-0.428-0.093-0.523-0.135c-0.729-0.316-1.177-0.799-1.336-1.435 c0.676-0.581,1.243-1.479,1.566-2.482c0.345-0.447,0.532-0.907,0.532-1.301c0-0.262-0.084-0.48-0.252-0.651 c-0.094-2.194-1.659-3.923-3.604-3.951L7.031,1.983c-1.909,0.011-3.482,1.693-3.62,3.851c-0.245,0.181-0.37,0.433-0.37,0.754 c0,0.463,0.262,1.018,0.72,1.526c0.317,0.87,0.809,1.635,1.394,2.17c-0.158,0.641-0.607,1.123-1.337,1.44 c-0.094,0.041-0.283,0.086-0.5,0.139C2.322,12.1,0.471,12.54,0.006,14.271c-0.028,0.104,0.035,0.211,0.139,0.239l13.657,0.007 c0.018,0,0.034-0.002,0.052-0.007c0.105-0.028,0.167-0.135,0.138-0.24C13.533,12.552,11.693,12.152,10.706,11.939z M0.458,14.145 c0.5-1.318,2.021-1.681,2.95-1.902c0.246-0.058,0.44-0.104,0.565-0.158c1.117-0.484,1.48-1.265,1.589-1.833 c0.013-0.068-0.012-0.139-0.064-0.186c-0.582-0.502-1.072-1.255-1.381-2.12C4.109,7.919,4.095,7.896,4.077,7.877 c-0.409-0.444-0.644-0.915-0.644-1.29c0-0.219,0.083-0.366,0.269-0.477c0.057-0.034,0.093-0.095,0.095-0.16 c0.087-1.995,1.508-3.565,3.251-3.576c0.001,0,0.04,0.003,0.042,0.003c1.752,0.024,3.164,1.629,3.214,3.652 c0.002,0.057,0.027,0.108,0.069,0.145c0.124,0.104,0.181,0.235,0.181,0.414c0,0.313-0.167,0.699-0.471,1.085 c-0.015,0.02-0.024,0.04-0.032,0.062c-0.313,0.994-0.876,1.871-1.542,2.408c-0.057,0.045-0.083,0.117-0.07,0.188 c0.109,0.567,0.473,1.348,1.589,1.832c0.132,0.058,0.337,0.103,0.596,0.158c0.919,0.198,2.42,0.524,2.918,1.817 C13.547,14.16,0.451,14.164,0.458,14.145z" fill="currentColor"/><path d="M12.707,11.439c-0.229-0.051-0.428-0.093-0.523-0.135c-0.729-0.316-1.177-0.799-1.337-1.435 c0.677-0.581,1.243-1.479,1.566-2.482c0.345-0.447,0.532-0.907,0.532-1.301c0-0.262-0.084-0.48-0.252-0.651 C12.6,3.241,11.034,1.513,9.09,1.484L9.032,1.483C8.649,1.485,8.285,1.567,7.94,1.699c0.218,0.055,0.43,0.129,0.631,0.227 c0.155-0.031,0.313-0.051,0.477-0.052c0.002,0,0.04,0.003,0.042,0.003c1.752,0.024,3.164,1.629,3.214,3.652 c0.002,0.057,0.027,0.108,0.069,0.145c0.124,0.104,0.181,0.235,0.181,0.414c0,0.313-0.167,0.699-0.471,1.085 c-0.015,0.02-0.024,0.04-0.032,0.062c-0.313,0.994-0.876,1.871-1.542,2.408c-0.058,0.045-0.084,0.117-0.07,0.188 c0.108,0.567,0.473,1.348,1.589,1.832c0.132,0.058,0.337,0.103,0.596,0.158c0.919,0.198,2.42,0.524,2.918,1.817 c0.001,0.004-0.528,0.008-1.368,0.01c0.062,0.111,0.107,0.24,0.156,0.366l1.475,0.001c0.018,0,0.034-0.002,0.052-0.007 c0.105-0.028,0.167-0.135,0.138-0.24C15.534,12.052,13.694,11.652,12.707,11.439z" fill="currentColor"/>'
  };

  var PLAY = exports.PLAY = {
    viewBox: '0 0 16 16',
    svg: '<path d="M3.896 1.243l8.91 5.523c2.006 1.236 1.975 1.236-.026 2.467l-8.864 5.52C2 16 2 15.602 2 14V2c0-1.47 0-2 1.896-.757z" fill="currentColor"/>'
  };

  var PLAY_OUTLINE = exports.PLAY_OUTLINE = {
    viewBox: '0 0 16 16',
    fillRule: 'evenodd',
    svg: '<path d="M3.896 1.243l8.91 5.523c2.006 1.236 1.975 1.236-.026 2.467l-8.864 5.52C2 16 2 15.602 2 14V2c0-1.47 0-2 1.896-.757zM13 8.018L3 2v12l10-5.982z" fill="currentColor"/>'
  };

  var PRESENTATION = exports.PRESENTATION = {
    viewBox: '0 0 16 16',
    svg: '<path d="M16,1.067H8.266V0.267C8.266,0.119,8.147,0,8,0C7.852,0,7.733,0.119,7.733,0.267v0.801H0v11.2 h7.355l-3.278,3.276c-0.104,0.104-0.104,0.273,0,0.378C4.13,15.974,4.198,16,4.266,16c0.068,0,0.137-0.026,0.188-0.078 l3.278-3.278v2.556c0,0.146,0.119,0.267,0.267,0.267c0.147,0,0.266-0.12,0.266-0.267v-2.556l3.279,3.278 C11.596,15.974,11.664,16,11.732,16s0.137-0.026,0.188-0.078c0.104-0.104,0.104-0.273,0-0.378l-3.276-3.276H16V1.067L16,1.067z M0.533,1.6h14.933v10.133H0.533V1.6z" fill="currentColor"/><circle cx="2.5" cy="10" r="1" fill="currentColor"/><circle cx="10" cy="7.724" r="1" fill="currentColor"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="13.5" cy="4" r="1" fill="currentColor"/><polygon points="2.782,10.247 2.218,9.753 5.901,5.543 9.907,7.357 13.224,3.747 13.776,4.253 10.093,8.265 6.099,6.457" fill="currentColor"/>'
  };

  var TEXT = exports.TEXT = {
    viewBox: '0 0 16 16',
    svg: '<rect y="3.691" width="8.615" height="1.231" fill="currentColor"/><rect width="8.615" height="1.23" fill="currentColor"/><rect y="7.384" width="16" height="1.231" fill="currentColor"/><rect y="11.075" width="16" height="1.233" fill="currentColor"/><rect y="14.769" width="16" height="1.231" fill="currentColor"/>'
  };

  var RESET = exports.RESET = {
    viewBox: '0 0 16 16',
    svg: '<path d="M15.29 8.145c-.392-.05-.747.24-.8.63-.172 1.463-.833 2.807-1.872 3.847-2.552 2.552-6.723 2.568-9.275.017-.24-.24-.476-.512-.68-.785l.968.02c.412 0 .734-.324.717-.718 0-.407-.323-.73-.714-.714l-3.37-.03-.17 3.535c-.017.223.066.41.202.548.12.117.29.186.48.2.39.018.73-.29.747-.678l.103-1.157c.204.272.442.545.698.798 3.113 3.114 8.2 3.133 11.333 0 1.275-1.274 2.058-2.908 2.28-4.697.036-.407-.237-.78-.646-.815zM.26 7.515c.104.103.258.188.41.204.392.05.768-.222.82-.614.186-1.445.833-2.74 1.853-3.76 2.553-2.553 6.723-2.57 9.292 0 .22.22.426.458.613.715l-.972-.018c-.407 0-.73.323-.714.716.002.204.086.39.204.508.138.138.31.206.51.206l3.372.033.152-3.487c.017-.39-.29-.735-.682-.75-.39-.018-.73.29-.75.68l-.05 1.14c-.203-.27-.408-.51-.647-.747-3.113-3.113-8.2-3.132-11.332 0C1.098 3.585.296 5.168.075 6.92c-.05.223.034.445.186.597z" fill="currentColor"/>'
  };

  var TRASH = exports.TRASH = {
    viewBox: '0 0 16 16',
    svg: '<path d="M2.54 4.17l1.114 11.375c.025.253.2.455.396.455h7.717c.194 0 .373-.202.403-.455L13.46 4.17H2.54zm3.163 9.783c-.276 0-.5-.224-.5-.5l-.328-6.828c0-.276.224-.5.5-.5s.5.224.5.5l.328 6.828c0 .276-.224.5-.5.5zm2.31 0c-.277 0-.5-.224-.5-.5l-.025-6.828c0-.276.224-.5.5-.5s.5.224.5.5l.023 6.828c.002.276-.222.5-.498.5zm2.706-.5c0 .276-.225.5-.5.5s-.5-.224-.5-.5l.358-6.828c0-.276.224-.5.5-.5s.5.224.5.5l-.36 6.828zM14.05 1.087h-3.89V.552C10.16.246 9.84 0 9.513 0H6.486c-.326 0-.648.246-.648.552v.535h-3.89c-.24 0-.434.165-.434.37v1.516c0 .203.194.368.433.368H14.05c.24 0 .436-.164.436-.367V1.456c0-.204-.195-.37-.435-.37z" fill="currentColor"/>'
  };

  var VIDEO = exports.VIDEO = {
    viewBox: '0 0 16 16',
    svg: '<path d="M15.838,4.799L15.836,4.8c0,0-0.154-1.103-0.637-1.587c-0.607-0.637-1.291-0.641-1.602-0.678C11.359,2.372,8,2.372,8,2.372 H7.994c0,0-3.359,0-5.597,0.163C2.083,2.573,1.403,2.576,0.793,3.213C0.312,3.697,0.16,4.8,0.16,4.8S0,6.094,0,7.391v1.212 c0,1.295,0.159,2.592,0.159,2.592s0.156,1.103,0.634,1.588c0.609,0.637,1.409,0.615,1.766,0.684C3.841,13.589,8,13.626,8,13.626 s3.363-0.006,5.601-0.166c0.312-0.037,0.994-0.041,1.602-0.678c0.482-0.484,0.639-1.589,0.639-1.589S16,9.9,16,8.604V7.39 C15.996,6.096,15.838,4.799,15.838,4.799z M15,8.532c0,1.134-0.137,2.265-0.137,2.265s-0.137,0.965-0.561,1.389 c-0.529,0.557-1.128,0.561-1.401,0.594C10.943,12.92,8,12.924,8,12.924s-3.64-0.031-4.761-0.137 c-0.311-0.062-1.012-0.041-1.545-0.598c-0.418-0.428-0.555-1.393-0.555-1.393S1,9.664,1,8.532V7.468 c0-1.135,0.139-2.266,0.139-2.266s0.135-0.966,0.555-1.39C2.227,3.256,2.822,3.252,3.097,3.22c1.959-0.144,4.898-0.144,4.898-0.144 H8c0,0,2.939,0,4.898,0.144c0.273,0.032,0.871,0.036,1.4,0.593c0.421,0.424,0.558,1.39,0.558,1.39V5.201c0,0,0.14,1.135,0.144,2.268 V8.532z" fill="currentColor"/><path d="M6.343 5.578v4.497l4.32-2.24" fill="currentColor"/>'
  };

  var WARNING = exports.WARNING = {
    viewBox: '0 0 16 16',
    svg: '<path d="M15.928 14.233c.1.177.097.393-.006.567-.104.175-.295.282-.5.282H.578c-.205 0-.395-.107-.498-.282s-.106-.39-.005-.567L7.497 1.208c.103-.18.295-.29.503-.29.208 0 .4.11.503.29l7.425 13.025zm-7.01-.816V11.75H7.082v1.667h1.834zm0-7.917H7.082v5h1.833v-5z" fill="currentColor"/>'
  };

  exports.default = {
    ARROW_BOTTOM: ARROW_BOTTOM,
    BIORXIV: BIORXIV,
    CALENDAR: CALENDAR,
    CODE: CODE,
    CROSS: CROSS,
    DNA: DNA,
    DATA: DATA,
    DOCUMENT: DOCUMENT,
    EXTERNAL: EXTERNAL,
    FLIP_XY: FLIP_XY,
    GEZWITSCHER: GEZWITSCHER,
    GITHUB: GITHUB,
    GLOBE: GLOBE,
    HELP: HELP,
    HOME: HOME,
    INFO: INFO,
    LINK: LINK,
    LOCATION: LOCATION,
    LOGO: LOGO,
    LOGO_HARVARD_HMS: LOGO_HARVARD_HMS,
    LOGO_HARVARD_SEAS: LOGO_HARVARD_SEAS,
    LOGO_HARVARD_VCG: LOGO_HARVARD_VCG,
    MAX_HORIZONTAL: MAX_HORIZONTAL,
    MIN_HORIZONTAL: MIN_HORIZONTAL,
    PEOPLE: PEOPLE,
    PLAY: PLAY,
    PLAY_OUTLINE: PLAY_OUTLINE,
    PRESENTATION: PRESENTATION,
    TEXT: TEXT,
    RESET: RESET,
    TRASH: TRASH,
    VIDEO: VIDEO,
    WARNING: WARNING
  };
});
define('configs/nav',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var externalLinks = exports.externalLinks = [{
    href: 'https://github.com/flekschas/hipiler',
    title: 'GitHub',
    icon: 'github',
    iconOnly: true
  }];

  exports.default = {
    externalLinks: externalLinks
  };
});
define('services/chrom-info',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var isReady = void 0;

  var ready = new Promise(function (resolve) {
    isReady = resolve;
  });

  var chromInfo = void 0;

  var ChromInfo = function () {
    function ChromInfo() {
      _classCallCheck(this, ChromInfo);
    }

    ChromInfo.prototype.get = function get() {
      return chromInfo;
    };

    ChromInfo.prototype.set = function set(newChromInfo) {
      if (!chromInfo && newChromInfo) {
        chromInfo = newChromInfo;
        isReady(chromInfo);
      }
    };

    _createClass(ChromInfo, [{
      key: "ready",
      get: function get() {
        return ready;
      }
    }]);

    return ChromInfo;
  }();

  exports.default = ChromInfo;
});
define('services/font',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var Font = function Font() {
    _classCallCheck(this, Font);

    this.size = 16;
  };

  exports.default = Font;
});
define('services/states',['exports', 'localForage', 'redux', 'redux-persist', 'redux-persist-transform-compress', 'redux-thunk', 'redux-undo', 'redux-batched-actions', 'app-actions', 'app-reducer'], function (exports, _localForage, _redux, _reduxPersist, _reduxPersistTransformCompress, _reduxThunk, _reduxUndo, _reduxBatchedActions, _appActions, _appReducer) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;

  var _localForage2 = _interopRequireDefault(_localForage);

  var _reduxPersistTransformCompress2 = _interopRequireDefault(_reduxPersistTransformCompress);

  var _reduxThunk2 = _interopRequireDefault(_reduxThunk);

  var _reduxUndo2 = _interopRequireDefault(_reduxUndo);

  var _appReducer2 = _interopRequireDefault(_appReducer);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var compressor = (0, _reduxPersistTransformCompress2.default)();

  var CONFIG = {
    storage: _localForage2.default,
    debounce: 25,
    keyPrefix: 'hipiler.',
    transforms: [compressor]
  };

  var States = function () {
    function States() {
      var _this = this;

      _classCallCheck(this, States);

      this.store = (0, _redux.createStore)((0, _reduxUndo2.default)((0, _reduxBatchedActions.enableBatching)(_appReducer2.default), {
        limit: 50
      }), undefined, (0, _redux.compose)((0, _reduxPersist.autoRehydrate)(), (0, _redux.applyMiddleware)(_reduxThunk2.default)));

      (0, _reduxPersist.persistStore)(this.store, CONFIG, function (err, state) {
        _this.isRehydrated = Object.keys(true).length > 0;
      });
    }

    States.prototype.undo = function undo() {
      this.store.dispatch(_reduxUndo.ActionCreators.undo());
    };

    States.prototype.redo = function redo() {
      this.store.dispatch(_reduxUndo.ActionCreators.redo());
    };

    States.prototype.reset = function reset() {
      this.store.dispatch((0, _appActions.resetState)());

      this.store.dispatch(_reduxUndo.ActionCreators.clearHistory());

      return (0, _reduxPersist.purgeStoredState)(CONFIG);
    };

    return States;
  }();

  exports.default = States;
});
define('resources/index',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.configure = configure;
  function configure(config) {}

  exports.default = {
    configure: configure
  };
});
define('utils/arrays-equal',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = arraysEqual;
  function arraysEqual(a, b) {
    if (!a || !b) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    return a.every(function (element, index) {
      return element === b[index];
    });
  }
});
define('utils/caps',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = caps;
  function caps(string, force) {
    if (force) {
      string = string.toLowerCase();
    }

    return string.charAt(0).toUpperCase() + string.slice(1);
  }
});
define('utils/debounce',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = debounce;
  function debounce(func, wait, immediate) {
    var timeout = void 0;

    var debounced = function debounced() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var later = function later() {
        timeout = null;
        if (!immediate) {
          func.apply(undefined, args);
        }
      };

      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) {
        func.apply(undefined, args);
      }
    };

    debounce.cancel = function () {
      clearTimeout(timeout);
      timeout = null;
    };

    return debounced;
  }
});
define('utils/deep-clone',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  exports.default = function (source) {
    var target = void 0;
    return extend(target, source);
  };

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  function extend(target, source) {
    if (source === null || (typeof source === 'undefined' ? 'undefined' : _typeof(source)) !== 'object') {
      return source;
    }

    if (source.constructor !== Object && source.constructor !== Array) {
      return source;
    }

    if (source.constructor === Date || source.constructor === RegExp || source.constructor === Function || source.constructor === String || source.constructor === Number || source.constructor === Boolean) {
      return new source.constructor(source);
    }

    target = target || new source.constructor();

    Object.keys(source).forEach(function (attr) {
      target[attr] = typeof target[attr] === 'undefined' ? extend(undefined, source[attr]) : target[attr];
    });

    return target;
  }
});
define('utils/dom-el',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = DomElFactory;

  var DomEl = {
    addClass: function addClass(className) {
      if (!this.hasClass(className)) {
        var space = this.node.className.length > 0 ? ' ' : '';

        this.node.className += '' + space + className;
      }

      return this;
    },
    dispatch: function dispatch(eventName, eventType, blubbles, cancelable) {
      var event = document.createEvent(eventType || 'Event');

      event.initEvent(eventName, blubbles || true, cancelable);

      this.node.dispatchEvent(event);

      return this;
    },
    hasClass: function hasClass(className, pos) {
      var re = new RegExp('\\s?' + className + '\\s?');

      var results = this.node.className.match(re);

      if (results) {
        return pos ? { index: results.index, match: results[0] } : true;
      }

      return pos ? -1 : false;
    },


    node: undefined,

    removeClass: function removeClass(className) {
      var re = this.hasClass(className, true);

      if (re.index >= 0) {
        this.node.className = (this.node.className.substr(0, re.index) + ' ' + this.node.className.substr(re.index + re.match.length)).trim();
      }

      return this;
    }
  };

  function DomElFactory(el) {

    var inst = Object.create(DomEl);
    inst.node = el;

    return inst;
  }
});
define('utils/drag-drop',['exports', './dom-el', './has-parent'], function (exports, _domEl, _hasParent) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = dragDrop;

  var _domEl2 = _interopRequireDefault(_domEl);

  var _hasParent2 = _interopRequireDefault(_hasParent);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function dragDrop(baseEl, dropEl, dropCallback) {
    var $baseEl = (0, _domEl2.default)(baseEl);
    var isDragging = false;

    document.addEventListener('dragenter', function (event) {
      if ((0, _hasParent2.default)(event.target, baseEl)) {
        $baseEl.addClass('is-dragging-over');
        isDragging = true;
        event.preventDefault();
      }
    });

    document.addEventListener('dragover', function (event) {
      if (isDragging) {
        event.preventDefault();
      }
    });

    document.addEventListener('dragleave', function () {
      if (isDragging && (0, _hasParent2.default)(event.target, dropEl)) {
        $baseEl.removeClass('is-dragging-over');
        isDragging = false;
      }
    });

    document.addEventListener('drop', function (event) {
      if (isDragging) {
        event.preventDefault();

        if ((0, _hasParent2.default)(event.target, baseEl)) {
          dropCallback(event);
        }

        $baseEl.removeClass('is-dragging-over');
        isDragging = false;
      }
    }, false);
  }
});
define('utils/halt-resume',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = HaltResume;


  var logger = _aureliaFramework.LogManager.getLogger('higlass');

  function HaltResume() {
    var stack = [];

    var halt = function halt(f, params) {
      stack.push([f, params]);
    };

    var resume = function resume() {
      var entry = stack.pop();
      while (entry) {
        try {
          var _entry;

          (_entry = entry)[0].apply(_entry, entry[1]);
        } catch (e) {
          logger.error('Could not resume function: ' + e);
        }
        entry = stack.pop();
      }
    };

    return { halt: halt, resume: resume };
  }
});
define('utils/has-parent',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = hasParent;
  function hasParent(el, target) {
    var _el = el;

    while (_el !== target && _el.tagName !== 'HTML') {
      _el = _el.parentNode;
    }

    if (_el === target) {
      return true;
    }

    return false;
  }
});
define('utils/hilbert-curve',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = hilbertCurve;

  var hilbert = function () {
    var pairs = [[[0, 3], [1, 0], [3, 1], [2, 0]], [[2, 1], [1, 1], [3, 0], [0, 2]], [[2, 2], [3, 3], [1, 2], [0, 1]], [[0, 0], [3, 2], [1, 3], [2, 3]]];

    function rot(n, x, y, rx, ry) {
      if (ry === 0) {
        if (rx === 1) {
          x = n - 1 - x;
          y = n - 1 - y;
        }
        return [y, x];
      }
      return [x, y];
    }

    return {
      xy2d: function xy2d(x, y, z) {
        var quad = 0;
        var pair = void 0;
        var i = 0;

        while (--z >= 0) {
          pair = pairs[quad][(x & 1 << z ? 2 : 0) | (y & 1 << z ? 1 : 0)];
          i = i << 2 | pair[0];
          quad = pair[1];
        }

        return i;
      },
      d2xy: function d2xy(z, t) {
        var n = 1 << z;
        var x = 0;
        var y = 0;
        for (var s = 1; s < n; s *= 2) {
          var rx = 1 & t / 2;
          var ry = 1 & (t ^ rx);
          var xy = rot(s, x, y, rx, ry);
          x = xy[0] + s * rx;
          y = xy[1] + s * ry;
          t /= 4;
        }
        return [x, y];
      }
    };
  }();

  function hilbertCurve(level, index) {
    return hilbert.d2xy(level, index);
  }
});
define('utils/mod',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = mod;
  function mod(n, m) {
    return (n % m + m) % m;
  }
});
define('utils/ping',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = ping;
  function ping(host) {
    return new Promise(function (resolve, reject) {
      var img = new Image();

      img.onload = function () {
        resolve();
      };
      img.onerror = function () {
        resolve();
      };
      img.src = host + '?cachebreaker=' + Date.now();

      setTimeout(function () {
        reject(Error('Server not available'));
      }, 1500);
    });
  }
});
define('utils/query-obj',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = queryObj;
  function queryObj(obj, queries, defVal) {
    try {
      var query = queries[0];
      var nextQueries = queries.slice(1);

      if (nextQueries.length) {
        return queryObj(obj[query], nextQueries);
      }

      return obj[query];
    } catch (e) {
      return defVal;
    }
  }
});
define('utils/read-json-file',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  exports.default = function (file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.addEventListener('load', function (event) {
        var json = void 0;

        try {
          json = JSON.parse(event.target.result);
        } catch (e) {
          reject(e);
        }

        resolve(json);
      });

      reader.readAsText(file);
    });
  };
});
define('utils/request-animation-frame',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var requestAnimationFrame = exports.requestAnimationFrame = function () {
    var lastTime = 0;

    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }();

  var cancelAnimationFrame = exports.cancelAnimationFrame = function () {
    return window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame || window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame || function (id) {
      window.clearTimeout(id);
    };
  }();

  var nextAnimationFrame = function () {
    var ids = {};

    function requestId() {
      var id = void 0;
      do {
        id = Math.floor(Math.random() * 1E9);
      } while (id in ids);
      return id;
    }

    return {
      request: window.requestNextAnimationFrame || function (callback, element) {
        var id = requestId();

        ids[id] = requestAnimationFrame(function () {
          ids[id] = requestAnimationFrame(function (ts) {
            delete ids[id];
            callback(ts);
          }, element);
        }, element);

        return id;
      },
      cancel: window.cancelNextAnimationFrame || function (id) {
        if (ids[id]) {
          cancelAnimationFrame(ids[id]);
          delete ids[id];
        }
      }
    };
  }();

  var requestNextAnimationFrame = exports.requestNextAnimationFrame = nextAnimationFrame.request;
  var cancelNextAnimationFrame = exports.cancelNextAnimationFrame = nextAnimationFrame.cancel;
});
define('utils/scroll-to-anchor',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var scrollToAnchor = function scrollToAnchor(id) {
    var el = document.getElementById(id);
    if (el) {
      location.href = "#" + id;
    }
  };

  exports.default = scrollToAnchor;
});
define('utils/throttle',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = throttle;
  function throttle(func) {
    var wait = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 250;
    var immediate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    var last = void 0;
    var deferTimer = void 0;

    var throttled = function throttled() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var now = Date.now();

      if (last && now < last + wait) {
        clearTimeout(deferTimer);

        deferTimer = setTimeout(function () {
          last = now;
          func.apply(undefined, args);
        }, wait);
      } else {
        last = now;
        func.apply(undefined, args);
      }
    };

    return throttled;
  }
});
define('utils/validate-config',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = validateConfig;
  function validateConfig(fgm, hgl) {
    try {
      return Object.keys(fgm).length || Object.keys(hgl).length;
    } catch (error) {
      return false;
    }
  }
});
define('views/about',['exports', 'utils/scroll-to-anchor'], function (exports, _scrollToAnchor) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.About = undefined;

  var _scrollToAnchor2 = _interopRequireDefault(_scrollToAnchor);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var About = exports.About = function () {
    function About() {
      _classCallCheck(this, About);
    }

    About.prototype.activate = function activate(urlParams) {
      if (urlParams.anchor) {
        this.anchor = '/about/' + urlParams.anchor;
      }
    };

    About.prototype.attached = function attached() {
      if (this.anchor) {
        (0, _scrollToAnchor2.default)(this.anchor);
      }
    };

    return About;
  }();
});
define('views/docs',['exports', 'aurelia-framework', 'aurelia-event-aggregator', 'text!../../assets/wiki/sidebar.html', 'text!../../assets/wiki/wiki.html', 'utils/debounce', 'utils/scroll-to-anchor'], function (exports, _aureliaFramework, _aureliaEventAggregator, _sidebar, _wiki, _debounce, _scrollToAnchor) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Docs = undefined;

  var _sidebar2 = _interopRequireDefault(_sidebar);

  var _wiki2 = _interopRequireDefault(_wiki);

  var _debounce2 = _interopRequireDefault(_debounce);

  var _scrollToAnchor2 = _interopRequireDefault(_scrollToAnchor);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var Docs = exports.Docs = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator), _dec(_class = function () {
    function Docs(event) {
      _classCallCheck(this, Docs);

      this.event = event;

      this.docs = new _aureliaFramework.InlineViewStrategy(_wiki2.default);

      this.sidebar = new _aureliaFramework.InlineViewStrategy(_sidebar2.default);
      this.sidebarCss = {};

      this.subscriptions = [];
    }

    Docs.prototype.activate = function activate(urlParams) {
      var anchor1 = urlParams.anchor ? urlParams.anchor : '';
      var anchor2 = urlParams.anchor2 ? '/' + urlParams.anchor2 : '';

      if (anchor1) {
        this.anchor = '/docs/' + anchor1 + anchor2;
      }
    };

    Docs.prototype.attached = function attached() {
      this.sidebarOffsetTop = this.sidebarEl.getBoundingClientRect().top - document.body.getBoundingClientRect().top;

      this.initEventListeners();

      if (this.anchor) {
        (0, _scrollToAnchor2.default)(this.anchor);
      }
    };

    Docs.prototype.detached = function detached() {
      this.subscriptions.forEach(function (subscription) {
        subscription.dispose();
      });
      this.subscriptions = [];
    };

    Docs.prototype.adjustSidebarPos = function adjustSidebarPos(event) {
      this.sidebarMarginTop = Math.abs(this.sidebarOffsetTop - this.sidebarEl.getBoundingClientRect().top);

      this.sidebarMarginTop = this.sidebarMarginTop - 48 < 0 ? 0 : this.sidebarMarginTop - 48;

      this.sidebarCss = {
        'padding-top': this.sidebarMarginTop + 'px'
      };
    };

    Docs.prototype.initEventListeners = function initEventListeners() {
      var adjustSidebarPosDb = (0, _debounce2.default)(this.adjustSidebarPos.bind(this), 50);

      this.subscriptions.push(this.event.subscribe('app.scroll', adjustSidebarPosDb));
    };

    return Docs;
  }()) || _class);
});
define('views/explore-actions',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var UPDATE_WIDTH = exports.UPDATE_WIDTH = 'UPDATE_WIDTH';

  var updateWidth = exports.updateWidth = function updateWidth(column, width) {
    return {
      type: UPDATE_WIDTH,
      payload: {
        column: column,
        width: width
      }
    };
  };
});
define('views/explore-defaults',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var COLUMN_NAMES = exports.COLUMN_NAMES = ['matrix', 'stats'];

  var COLUMNS = exports.COLUMNS = {
    matrixWidth: 40,
    matrixWidthUnit: '%',
    statsWidth: 20,
    statsWidthUnit: 'rem'
  };

  exports.default = {
    COLUMN_NAMES: COLUMN_NAMES,
    COLUMNS: COLUMNS
  };
});
define('views/explore-reducers',['exports', 'redux', 'views/explore-actions', 'views/explore-defaults', 'components/fragments/fragments-reducers', 'components/higlass/higlass-reducers'], function (exports, _redux, _exploreActions, _exploreDefaults, _fragmentsReducers, _higlassReducers) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.columns = columns;

  var _fragmentsReducers2 = _interopRequireDefault(_fragmentsReducers);

  var _higlassReducers2 = _interopRequireDefault(_higlassReducers);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  function columns() {
    var _extends2;

    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _extends({}, _exploreDefaults.COLUMNS);
    var action = arguments[1];

    switch (action.type) {
      case _exploreActions.UPDATE_WIDTH:
        return _extends({}, state, (_extends2 = {}, _extends2[action.payload.column + 'Width'] = action.payload.width, _extends2));
      default:
        return state;
    }
  }

  exports.default = (0, _redux.combineReducers)({
    columns: columns,
    fragments: _fragmentsReducers2.default,
    higlass: _higlassReducers2.default
  });
});
define('views/explore',['exports', 'aurelia-framework', 'aurelia-event-aggregator', 'services/font', 'services/states', 'utils/dom-el', 'utils/debounce', 'utils/query-obj', 'configs/app', 'utils/request-animation-frame', 'views/explore-actions', 'views/explore-defaults'], function (exports, _aureliaFramework, _aureliaEventAggregator, _font, _states, _domEl, _debounce, _queryObj, _app, _requestAnimationFrame, _exploreActions, _exploreDefaults) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Explore = undefined;

  var _font2 = _interopRequireDefault(_font);

  var _states2 = _interopRequireDefault(_states);

  var _domEl2 = _interopRequireDefault(_domEl);

  var _debounce2 = _interopRequireDefault(_debounce);

  var _queryObj2 = _interopRequireDefault(_queryObj);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var logger = _aureliaFramework.LogManager.getLogger('explore');

  var Explore = exports.Explore = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator, _font2.default, _states2.default), _dec(_class = function () {
    function Explore(eventAggregator, font, states) {
      _classCallCheck(this, Explore);

      this.event = eventAggregator;
      this.font = font;

      this.css = {};

      this.store = states.store;
      this.store.subscribe(this.update.bind(this));

      this.fragments = {};
      this.stats = {};

      this.init = false;

      this.updateCssDb = (0, _debounce2.default)(this.updateCss.bind(this), 50);

      this.event.subscribe('app.keyUp', this.keyUpHandler.bind(this));

      this.update();
    }

    Explore.prototype.attached = function attached() {
      var _this = this;

      this.$exploreBaseEl = new _domEl2.default(this.exploreBaseEl);
      this.isInitReady = true;
      (0, _requestAnimationFrame.requestNextAnimationFrame)(function () {
        _this.init = true;
        new _domEl2.default(_this.matrixColEl).addClass('is-transitionable');
        new _domEl2.default(_this.fragmentsColEl).addClass('is-transitionable');
        new _domEl2.default(_this.statsColEl).addClass('is-transitionable');
      });
    };

    Explore.prototype.columnDragStartHandler = function columnDragStartHandler(event, target) {
      this.dragging = {
        target: target,
        x: event.clientX
      };

      this.$exploreBaseEl.addClass('is-col-drag-' + this.dragging.target);
      this.$exploreBaseEl.addClass('is-col-drag-' + this.dragging.target + '-highlight');

      this.mouseMoveListener = this.event.subscribe('app.mouseMove', this.columnDragMoveHandler.bind(this));
      this.event.subscribeOnce('app.mouseUp', this.columnDragEndHandler.bind(this));
    };

    Explore.prototype.columnDragMoveHandler = function columnDragMoveHandler(event) {
      var dX = event.clientX - this.dragging.x;

      this[this.dragging.target].dragBtnCss = {
        transform: 'translateX(' + (dX - this.font.size * 0.25) + 'px)'
      };

      this[this.dragging.target].dragIndicatorCss = {
        transform: 'translateX(' + dX + 'px)'
      };
    };

    Explore.prototype.columnDragEndHandler = function columnDragEndHandler(event) {
      var _this2 = this;

      var target = void 0;

      try {
        target = this.dragging.target;
      } catch (e) {
        logger.error(e);
        return;
      }

      this.dragging.dX = event.clientX - this.dragging.x;

      this.mouseMoveListener.dispose();

      var draggerRect = this[target + 'Dragger'].getBoundingClientRect();
      var dragIndicatorRect = this[target + 'DragIndicator'].getBoundingClientRect();

      this[target].dragBtnCss = _extends({}, this[target].dragBtnCss, {
        position: 'fixed',
        top: draggerRect.top + 'px',
        left: draggerRect.left + 'px',
        transform: null
      });

      this[target].dragIndicatorCss = _extends({}, this[target].dragIndicatorCss, {
        position: 'fixed',
        top: dragIndicatorRect.top + 'px',
        left: dragIndicatorRect.left + 'px',
        transform: null
      });

      this.updateColumnWidth(this.dragging);

      setTimeout(function () {
        _this2.$exploreBaseEl.removeClass('is-col-drag-' + target + '-highlight');

        _this2[target].dragBtnCss = _extends({}, _this2[target].dragBtnCss, {
          position: null,
          top: null,
          left: null
        });

        _this2[target].dragIndicatorCss = _extends({}, _this2[target].dragIndicatorCss, {
          position: null,
          top: null,
          left: null
        });

        (0, _requestAnimationFrame.requestNextAnimationFrame)(function () {
          _this2.$exploreBaseEl.removeClass('is-col-drag-' + target);
        });
      }, _app.transition.fast);

      this.dragging = undefined;
    };

    Explore.prototype.keyUpHandler = function keyUpHandler(event) {
      switch (event.keyCode) {
        case 68:
          this.toggleColumnStats();
          break;

        default:
          break;
      }
    };

    Explore.prototype.toggleColumnStats = function toggleColumnStats() {
      var width = (0, _queryObj2.default)(this.store.getState(), ['present', 'explore', 'columns', 'statsWidth'], 0);

      if (width <= 1) {
        this.store.dispatch((0, _exploreActions.updateWidth)('stats', this.columnsLastWidthStats || _exploreDefaults.COLUMNS.statsWidth));
      } else {
        this.minimizeColumn('stats');
      }
    };

    Explore.prototype.maximizeColumn = function maximizeColumn(column) {
      var columnToUpdate = column;
      var width = 99;

      if (column === 'matrix') {
        this.minimizeColumn('fragments');
        this.minimizeColumn('stats');
      }

      if (column === 'fragments') {
        this.minimizeColumn('matrix');
        this.minimizeColumn('stats');
      }

      if (column === 'stats') {
        width = this.exploreBaseEl.getBoundingClientRect().width / 16;
      }

      this.store.dispatch((0, _exploreActions.updateWidth)(columnToUpdate, width));
    };

    Explore.prototype.minimizeColumn = function minimizeColumn(column) {
      var columnToUpdate = column;
      var width = 1;

      if (column === 'fragments') {
        columnToUpdate = 'matrix';
        width = 99;
      }

      if (column === 'stats') {
        this.columnsLastWidthStats = (0, _queryObj2.default)(this.store.getState(), ['present', 'explore', 'columns', 'statsWidth']);
      }

      this.store.dispatch((0, _exploreActions.updateWidth)(columnToUpdate, width));
    };

    Explore.prototype.update = function update() {
      try {
        this.updateCssDb(this.store.getState().present.explore.columns);
      } catch (e) {
        logger.error('State invalid', e);
      }
    };

    Explore.prototype.updateColumnWidth = function updateColumnWidth(dragged) {
      if (dragged.target === 'fragments') {
        var visWidth = this.visEl.getBoundingClientRect().width;
        var matrixWidth = this.matrixColEl.getBoundingClientRect().width;

        this.store.dispatch((0, _exploreActions.updateWidth)('matrix', (matrixWidth + dragged.dX) / visWidth * 100));
      }

      if (dragged.target === 'stats') {
        var statsWidth = this.statsColEl.getBoundingClientRect().width;

        this.store.dispatch((0, _exploreActions.updateWidth)('stats', (statsWidth - dragged.dX) / this.font.size));
      }
    };

    Explore.prototype.updateCss = function updateCss(columns) {
      var _this3 = this;

      _exploreDefaults.COLUMN_NAMES.forEach(function (columnName) {
        _this3.css[columnName] = {
          flexBasis: '' + columns[columnName + 'Width'] + columns[columnName + 'WidthUnit']
        };
      });
    };

    return Explore;
  }()) || _class);
});
define('views/home',['exports', 'aurelia-framework', 'aurelia-router', 'aurelia-event-aggregator', 'd3', 'services/states', 'configs/examples', 'app-actions', 'utils/read-json-file', 'utils/validate-config'], function (exports, _aureliaFramework, _aureliaRouter, _aureliaEventAggregator, _d, _states, _examples, _appActions, _readJsonFile, _validateConfig) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Home = undefined;

  var _states2 = _interopRequireDefault(_states);

  var _examples2 = _interopRequireDefault(_examples);

  var _readJsonFile2 = _interopRequireDefault(_readJsonFile);

  var _validateConfig2 = _interopRequireDefault(_validateConfig);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _dec, _class;

  var logger = _aureliaFramework.LogManager.getLogger('home');

  var Home = exports.Home = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator, _aureliaRouter.Router, _states2.default), _dec(_class = function () {
    function Home(event, router, states) {
      _classCallCheck(this, Home);

      this.event = event;

      this.router = router;

      this.store = states.store;
      this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

      this.examples = _examples2.default;
    }

    Home.prototype.attached = function attached() {
      this.selectConfigButton.addEventListener('click', this.selectConfig.bind(this));
    };

    Home.prototype.detached = function detached() {
      this.unsubscribeStore();
    };

    Home.prototype.loadExample = function loadExample(example) {
      var _this = this;

      (0, _d.json)(example.url, function (error, config) {
        if (error) {
          logger.error(error);
          _this.event.publish('showGlobalError', ['Could not load example config', 30000]);
          return;
        }

        _this.setState(config);
      });
    };

    Home.prototype.selectedConfigChanged = function selectedConfigChanged() {
      var _this2 = this;

      var results = void 0;

      try {
        results = (0, _readJsonFile2.default)(this.selectedConfig[0]);
      } catch (error) {
        logger.error(error);
      }

      results.then(function (resultsJson) {
        return _this2.setState(resultsJson);
      }).catch(function (error) {
        return logger.error(error);
      });
    };

    Home.prototype.selectConfig = function selectConfig(event) {
      if (event.artificial) {
        return;
      }

      var newEvent = new MouseEvent(event.type, event);
      newEvent.artificial = true;

      this.inputConfigFile.dispatchEvent(newEvent);
    };

    Home.prototype.setState = function setState(config) {
      if ((0, _validateConfig2.default)(config.fgm, config.hgl)) {
        this.store.dispatch((0, _appActions.updateConfigs)(config));
        this.router.navigateToRoute('explore');
      } else {
        this.event.publish('showGlobalError', ['Corrupted config file', 3000]);
      }
    };

    Home.prototype.update = function update() {};

    return Home;
  }()) || _class);
});
define('views/not-found',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var NotFound = exports.NotFound = function NotFound() {
    _classCallCheck(this, NotFound);
  };
});
define('components/footer-main/footer-main',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var FooterMain = exports.FooterMain = function FooterMain(event) {
    _classCallCheck(this, FooterMain);

    this.version = window.hipilerConfig.version;
  };
});
define('components/dialog/dialog',['exports', 'aurelia-framework', 'aurelia-event-aggregator'], function (exports, _aureliaFramework, _aureliaEventAggregator) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Dialog = undefined;

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _dec2, _dec3, _dec4, _class, _desc, _value, _class2, _descriptor, _descriptor2, _descriptor3;

  var Dialog = exports.Dialog = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator), _dec2 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec3 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.twoWay }), _dec4 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec(_class = (_class2 = function () {
    function Dialog(event) {
      _classCallCheck(this, Dialog);

      _initDefineProp(this, 'deferred', _descriptor, this);

      _initDefineProp(this, 'isOpen', _descriptor2, this);

      _initDefineProp(this, 'message', _descriptor3, this);

      this.event = event;

      this.subscriptions = [];

      this.initEventListeners();
    }

    Dialog.prototype.detached = function detached() {
      this.subscriptions.forEach(function (subscription) {
        subscription.dispose();
      });
      this.subscriptions = undefined;
    };

    Dialog.prototype.cancel = function cancel() {
      if (this.deferred && this.deferred.reject) {
        this.deferred.reject(Error());
        this.isOpen = false;
      }
    };

    Dialog.prototype.initEventListeners = function initEventListeners() {
      this.subscriptions.push(this.event.subscribe('app.keyUp', this.keyUpHandler.bind(this)));
    };

    Dialog.prototype.keyUpHandler = function keyUpHandler(event) {
      switch (event.keyCode) {
        case 13:
          this.okay();
          break;

        case 27:
          this.cancel();
          break;

        default:
          break;
      }
    };

    Dialog.prototype.okay = function okay() {
      if (this.deferred && this.deferred.resolve) {
        this.deferred.resolve();
        this.isOpen = false;
      }
    };

    return Dialog;
  }(), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'deferred', [_dec2], {
    enumerable: true,
    initializer: function initializer() {
      return {};
    }
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'isOpen', [_dec3], {
    enumerable: true,
    initializer: function initializer() {
      return false;
    }
  }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, 'message', [_dec4], {
    enumerable: true,
    initializer: function initializer() {
      return '';
    }
  })), _class2)) || _class);
});
define('components/multi-select/multi-select-defaults',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var EVENT_BASE_NAME = exports.EVENT_BASE_NAME = 'multiSelect';
});
define('components/multi-select/multi-select',['exports', 'aurelia-framework', 'aurelia-event-aggregator', 'services/states', 'components/multi-select/multi-select-defaults', 'utils/arrays-equal', 'utils/has-parent', 'utils/mod', 'utils/query-obj'], function (exports, _aureliaFramework, _aureliaEventAggregator, _states, _multiSelectDefaults, _arraysEqual, _hasParent, _mod, _queryObj) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MultiSelect = undefined;

  var _states2 = _interopRequireDefault(_states);

  var _arraysEqual2 = _interopRequireDefault(_arraysEqual);

  var _hasParent2 = _interopRequireDefault(_hasParent);

  var _mod2 = _interopRequireDefault(_mod);

  var _queryObj2 = _interopRequireDefault(_queryObj);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _class, _desc, _value, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6;

  var MultiSelect = exports.MultiSelect = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator, _states2.default), _dec2 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec3 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec4 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec5 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec6 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec(_class = (_class2 = function () {
    function MultiSelect(eventAggregator, states) {
      _classCallCheck(this, MultiSelect);

      _initDefineProp(this, 'bottomUp', _descriptor, this);

      _initDefineProp(this, 'eventId', _descriptor2, this);

      _initDefineProp(this, 'options', _descriptor3, this);

      _initDefineProp(this, 'placeholder', _descriptor4, this);

      _initDefineProp(this, 'stateQuery', _descriptor5, this);

      _initDefineProp(this, 'disabled', _descriptor6, this);

      this.event = eventAggregator;
      this.selectedOptions = [];
      this.search = '';
      this.selectedOptionsIdx = {};

      this.store = states.store;
      this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

      this.subscriptions = [];
    }

    MultiSelect.prototype.attached = function attached() {
      var _this = this;

      this.subscriptions.push(this.event.subscribe('app.click', function (event) {
        if (!(0, _hasParent2.default)(event.target, _this.baseEl)) {
          _this.deactivateOptions();
        }
      }));

      this.update();
    };

    MultiSelect.prototype.detached = function detached() {
      this.unsubscribeStore();

      this.subscriptions.forEach(function (subscription) {
        subscription.dispose();
      });
      this.subscriptions = undefined;
    };

    MultiSelect.prototype.optionsChanged = function optionsChanged(newValue, oldValue) {
      this.update();
    };

    MultiSelect.prototype.activateOptions = function activateOptions() {
      if (this.disabled) {
        return;
      }
      this.focusedOptionId = -1;
      this.optionsIsActive = true;
    };

    MultiSelect.prototype.deactivateOptions = function deactivateOptions() {
      this.optionsIsActive = false;
    };

    MultiSelect.prototype.focusOption = function focusOption(id, dir) {
      var next = (dir === 'down' ? 1 : -1) * (this.bottomUp ? 1 : -1);

      if (typeof id === 'undefined') {
        if (this.focusedOptionId < 0) {
          if (this.bottomUp) {
            this.focusedOptionId = this.options.length - 1;
          } else {
            this.focusedOptionId = 0;
          }
        } else {
          this.focusedOptionId = (0, _mod2.default)(this.focusedOptionId + next, this.options.length);
        }
      } else {
        this.focusedOptionId = id % this.options.length;
      }

      if (typeof this.optionIsFocus !== 'undefined') {
        this.optionIsFocus.isFocus = false;
      }

      this.options[this.focusedOptionId].isFocus = true;
      this.optionIsFocus = this.options[this.focusedOptionId];
    };

    MultiSelect.prototype.focusOptionUp = function focusOptionUp() {
      this.focusOption(undefined, 'up');
    };

    MultiSelect.prototype.focusOptionDown = function focusOptionDown() {
      this.focusOption(undefined, 'down');
    };

    MultiSelect.prototype.keyDownHandler = function keyDownHandler(event) {
      switch (event.keyCode) {
        case 13:
          if (this.focusedOptionId >= 0) {
            this.select(this.options[this.focusedOptionId]);
          }
          break;

        case 38:
          this.focusOptionUp();
          break;

        case 40:
          this.focusOptionDown();
          break;

        case 8:
        case 46:
          if (event.target.value.length > 0) {
            return true;
          }
          this.removeLastSelectedOption();
          break;

        default:
          return true;
      }
    };

    MultiSelect.prototype.publish = function publish() {
      if (this.disabled) {
        return;
      }

      if (this.eventId) {
        this.event.publish(_multiSelectDefaults.EVENT_BASE_NAME + '.' + this.eventId, this.selectedOptions);
      }
    };

    MultiSelect.prototype.removeLastSelectedOption = function removeLastSelectedOption() {
      var removedOption = this.selectedOptions.pop();

      if (removedOption) {
        this.options.filter(function (option) {
          return option.id === removedOption.id;
        }).forEach(function (option) {
          option.isSelected = false;
        });
      }

      this.publish();
    };

    MultiSelect.prototype.select = function select(option) {
      if (this.disabled) {
        return;
      }

      if (!option.isSelected) {
        this.selectedOptions.push(option);
        this.focusedOptionId = -1;
        option.isSelected = true;
        option.isFocus = false;

        this.publish();
      } else {
        this.unselect(option);
      }
    };

    MultiSelect.prototype.selectBatch = function selectBatch(options) {
      var _this2 = this;

      options.forEach(function (option) {
        if (!option.isSelected) {
          _this2.selectedOptions.push(option);
          _this2.focusedOptionId = -1;
          option.isSelected = true;
          option.isFocus = false;

          _this2.publish();
        }
      });
    };

    MultiSelect.prototype.unselect = function unselect(optionRemove) {
      if (this.disabled || !optionRemove.isSelected) {
        return;
      }

      this.options.filter(function (option) {
        return option.id === optionRemove.id;
      }).forEach(function (option) {
        option.isSelected = false;
      });

      var index = this.selectedOptions.indexOf(optionRemove);

      if (index >= 0) {
        this.selectedOptions.splice(index, 1);
      }

      this.publish();
    };

    MultiSelect.prototype.update = function update() {
      var _this3 = this;

      var selectedOptionsState = (0, _queryObj2.default)(this.store.getState().present, this.stateQuery);

      var currentSelection = this.selectedOptions.map(function (option) {
        return option.id;
      });

      if (!selectedOptionsState || this.options.length === 0 || this.selectedOptionsState === selectedOptionsState || (0, _arraysEqual2.default)(currentSelection, selectedOptionsState)) {
        return;
      }

      this.selectedOptionsState = selectedOptionsState;

      var newSelection = [];

      selectedOptionsState.forEach(function (selectedOptionId) {
        _this3.options.filter(function (option) {
          return option.id === selectedOptionId;
        }).forEach(function (option) {
          option.isSelected = true;
          option.isFocus = false;
          newSelection.push(option);
        });
      });

      this.selectedOptions = newSelection;
    };

    _createClass(MultiSelect, [{
      key: 'selectableOptions',
      get: function get() {
        var _this4 = this;

        return this.options.filter(function (option) {
          return _this4.inputEl.value.length ? option.name.toLowerCase().indexOf(_this4.inputEl.value.toLowerCase()) >= 0 : true;
        });
      }
    }]);

    return MultiSelect;
  }(), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'bottomUp', [_dec2], {
    enumerable: true,
    initializer: function initializer() {
      return false;
    }
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'eventId', [_dec3], {
    enumerable: true,
    initializer: null
  }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, 'options', [_aureliaFramework.bindable], {
    enumerable: true,
    initializer: function initializer() {
      return [];
    }
  }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, 'placeholder', [_dec4], {
    enumerable: true,
    initializer: null
  }), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, 'stateQuery', [_dec5], {
    enumerable: true,
    initializer: null
  }), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, 'disabled', [_dec6], {
    enumerable: true,
    initializer: function initializer() {
      return false;
    }
  })), _class2)) || _class);
});
define('components/svg-icon/svg-icon',['exports', 'aurelia-framework', 'configs/icons'], function (exports, _aureliaFramework, _icons) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.SvgIcon = undefined;

  var _icons2 = _interopRequireDefault(_icons);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _desc, _value, _class, _descriptor;

  var SvgIcon = exports.SvgIcon = (_dec = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), (_class = function () {
    function SvgIcon() {
      _classCallCheck(this, SvgIcon);

      _initDefineProp(this, 'iconId', _descriptor, this);

      this.icon = {
        viewBox: '0 0 16 16',
        fillRule: '',
        svg: ''
      };
    }

    SvgIcon.prototype.attached = function attached() {
      var id = this.iconId.toUpperCase().replace(/-/g, '_');
      this.icon = _icons2.default[id] ? _icons2.default[id] : _icons2.default.WARNING;
    };

    return SvgIcon;
  }(), (_descriptor = _applyDecoratedDescriptor(_class.prototype, 'iconId', [_dec], {
    enumerable: true,
    initializer: null
  })), _class));
});
define('text!views/../../assets/wiki/sidebar.html',[],function () { return '<template>\n<require from="components/svg-icon/svg-icon"></require>\n<aside class="sidebar">\n<p><strong><a href="#/docs/getting-started">Getting Started</a></strong></p>\n<ul>\n<li><a href="#/docs/getting-started/local-setup">Local Setup</a></li>\n<li><a href="#/docs/getting-started/the-interface">The Interface</a></li>\n<li><a href="#/docs/getting-started/keyboard-shortcuts">Keyboard Shortcuts</a></li>\n</ul>\n<p><strong><a href="#/docs/data">Data</a></strong></p>\n<ul>\n<li><a href="#/docs/data/config-file">Config file</a></li>\n<li><a href="#/docs/data/import">Import</a></li>\n<li><a href="#/docs/data/export">Export</a></li>\n<li><a href="#/docs/data/jupyter-notebook-integration">Jupyter Notebook Integration</a></li>\n</ul>\n<p><strong><a href="#/docs/usage-scenarios">Usage Scenarios</a></strong></p>\n<ul>\n<li><a href="#/docs/usage-scenarios/loops">Loops</a></li>\n<li><a href="#/docs/usage-scenarios/sv">Structural Variations</a></li>\n<li><a href="#/docs/usage-scenarios/telomeres">Telomeres</a></li>\n<li><a href="#/docs/usage-scenarios/enhancer-promotor-units">Enhancer-Promotor Units</a></li>\n</ul>\n<p><strong><a href="#/docs/faq">FAQ</a></strong></p>\n\n</aside>\n</template>';});

define('text!views/../../assets/wiki/wiki.html',[],function () { return '<template>\n<require from="components/svg-icon/svg-icon"></require>\n<div class="wiki-page">\n<h1 id="/docs/getting-started" class="underlined anchored">\n  <a href="#/docs/getting-started" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Getting Started</span>\n</h1>\n  \n<p>This page describes how you can set up HiPiler locally, explains the functionality of the interface, and provides a cheat sheet for nifty keyboard shortcuts that help you to be more productive.</p>\n<p><strong>Demo:</strong> <a href="https://flekschas.github.io/hipiler/">https://flekschas.github.io/hipiler/</a></p>\n<p><strong>Video:</strong> <a href="https://youtu.be/qoLqje5OYKg">https://youtu.be/qoLqje5OYKg</a></p>\n\n<h2 id="/docs/getting-started/local-setup" class="underlined anchored">\n  <a href="#/docs/getting-started/local-setup" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Local setup</span>\n</h2>\n  <p>In order to run HiPiler on your own data all you need is a running instance of the HiPiler or HiGlass server. The server needs to be loaded with a Hi-C contact map and a corresponding chromosome size definition file.</p>\n<p>Having <a href="Data#config-file">configured</a> HiPiler with your local server, you can directly drop the configuration files into the <a href="https://flekschas.github.io/hipiler/">public instance</a> of HiPiler as the interface is executed locally on your browser and only communicates with the server specified in your config file. (For more infos on how to configure HiPiler please go to <a href="Data#config-file">Data &gt; Config File</a></p>\n<p>If you want to compile the frontend application yourself please follow the instructions below:</p>\n<pre><code>git clone https://github.com/flekschas/hipiler &amp;&amp; cd hipiler\nnpm run update\nnpm run build\n</code></pre><p>The first step fetches the source code, the second step loads third-party libraries and the documentation, and the last step compiles HiPiler. The final build is located in <code>/dist</code>. Open <code>index.html</code> to run HiPiler. You need to have a local web server running or start the developmental server with <code>$ npm start</code> and open <a href="http://localhost:9000">localhost:9000</a>.</p>\n\n<h2 id="/docs/getting-started/the-interface" class="underlined anchored">\n  <a href="#/docs/getting-started/the-interface" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>The Interface</span>\n</h2>\n  <p><img src="https://cdn.rawgit.com/flekschas/hipiler/develop/teaser.png?raw=true" alt="HiPiler&#39;s interface"></p>\n<p>HiPiler&#39;s interface consists of two main linked view. On the left side is the matrix view and on the right side is the snippets view. The matrix view uses <a href="https://github.com/hms-dbmi/higlass">HiGlass</a> to visualize the contact map. In theory, any view config that is possible in HiGlass is also possible in HiPiler but in practice HiPiler assumes one row (upper) of overview maps, which are fix in terms of their zooming and panning, and a detailed maps (bottom row) that allow interactive exploration of the contact map. (For more infos on how to configure HiGlass in HiPiler please go to <a href="Data#config-file">Importing Data &gt; Config File</a> The bottom of the matrix view holds a menu for toggling the gray scale color map on and off, hiding the snippets locations, hiding the detail maps, and fading out snippets that are not visible in the detail map.</p>\n<p>The snippets view let&#39;s you order, arrange, filter, group, and aggregate snippets. The upper panel displays the snippets and the bar at the bottom holds controls for some of the functionality. The following table describes all the implicit interactions that are possible in the snippets view:</p>\n<table>\n  <tr>\n    <th>Layout</th>\n    <th>Action</th>\n    <th>Effect</th>\n  </tr>\n  <tr>\n    <td rowspan="5">All</td>\n    <td>Click on snippet.</td>\n    <td>Select snippet.</td>\n  </tr>\n  <tr>\n    <td>Click on white space.</td>\n    <td>Deselect a selected snippet.</td>\n  </tr>\n  <tr>\n    <td>Right click on snippet.</td>\n    <td>Open snippet context menu.</td>\n  </tr>\n  <tr>\n    <td>Click and hold on snippet and moving the cursor.</td>\n    <td>Drag a snippet. If the dragged snippet is released above another snippet the two will be piled up.</td>\n  </tr>\n  <tr>\n    <td>Click and hold on white space and moving the cursor.</td>\n    <td>Selecting multiple snippets or piles.</td>\n  </tr>\n  <tr>\n    <td>1D</td>\n    <td>Scrolling</td>\n    <td>Scroll the snippets view up and down.</td>\n  </tr>\n  <tr>\n    <td rowspan="2">&gt;1D</td>\n    <td>Hover pile</td>\n    <td>Display the hull that shows the location of all snippets on the pile.</td>\n  </tr>\n  <tr>\n    <td>Scroll and pan</td>\n    <td>When in zoom mode, you can zoom into and pan the snippets view.</td>\n  </tr>\n</table>\n\n<p><em>(Note that all interactions that work on a snippet are supported for piles of snippets as well.)</em></p>\n<p>The table below describes the additional functionality that can be triggered with the controls contained in the bar at the bottom:</p>\n<table>\n  <tr>\n    <th>Category</th>\n    <th>Action</th>\n    <th>Effect</th>\n  </tr>\n  <tr>\n    <td rowspan="3">Arrange</td>\n    <td>Arrange by measure</td>\n    <td>Order by one measure in reading direction or arrange snippets in a 2D scatter plot.</td>\n  </tr>\n  <tr>\n    <td>Cluster</td>\n    <td>Visually cluster snippets using t-SNE. t-SNE uses the underlying data to arrange the multidimensional vector in the 2D space such that similar vectors visually cluster together.</td>\n  </tr>\n  <tr>\n    <td>Trash</td>\n    <td>Open or close the trash, which holds dismissed snippets.</td>\n  </tr>\n  <tr>\n    <td rowspan="4">Layout</td>\n    <td>Snippet Size</td>\n    <td>Change the snippet size.</td>\n  </tr>\n  <tr>\n    <td>Link grid size to snippet size</td>\n    <td>When activated the grid size is linked to the snippet size. Deactivating this option allows to adjust the grid size individually, which can be useful for <em>piling by grid</em>.</td>\n  </tr>\n  <tr>\n    <td>Grid Size</td>\n    <td>Change the grid size. The grid is displayed in orange frames while the mouse is hold down.</td>\n  </tr>\n  <tr>\n    <td>Hilbert curve</td>\n    <td>Changes the directionality of the currently assigned ordering and displays snippets by <a href="https://en.wikipedia.org/wiki/Hilbert_curve">Hilbert curves</a>.</td>\n  </tr>\n  <tr>\n    <td rowspan="4">Pile</td>\n    <td>By similarity</td>\n    <td>K-means-like clustering of piles by pair-wise similarity of the underlying matrix snippet. <em>K</em> is the number of available grid size. This action essentially provides a quick way to get an overview of the averages of the <em>k</em> most similar piles and avoids the need for scrolling. <em>(Note that this option is only available for 1D layouts as it&#39;s a means of avoiding the need to scroll.)</em></td>\n  </tr>\n  <tr>\n    <td>By grid</td>\n    <td>This action automatically piles all snippets that are located in the same grid cell. Hovering the button visualizes the current grid. <em>(Note that this option is only available for &gt;1D layouts as it&#39;s a means of avoiding clutter.)</em></td>\n  </tr>\n  <tr>\n    <td>By category</td>\n    <td>After selecting a categorical attribute all snippets with the same categorical value are piled up automatically.</td>\n  </tr>\n  <tr>\n    <td>Disperse all</td>\n    <td>All piles will be dispersed.</td>\n  </tr>\n  <tr>\n    <td rowspan="4">Style</td>\n    <td>Cover mode</td>\n    <td>Change the display mode to average (mean of all snippets on a pile) or variance (standard deviation of all snippets on a pile). The variance cover is visualized in an orange color map to differentiate from the average cover.</td>\n  </tr>\n  <tr>\n    <td>Low quality bins</td>\n    <td>Visualize bins (i.e., pixel of the matrix) that have been filtered out by <a href="https://github.com/mirnylab/cooler">Cooler</a> with a light blue. Normally filtered out bins are displayed in white and not distinguishable from bins without a signal.</td>\n  </tr>\n  <tr>\n    <td>Frame encoding</td>\n    <td>Choose a numerical attribute to be visualized via the frame of snippets. Thicker and darker frames indicate higher values.</td>\n  </tr>\n  <tr>\n    <td>Decolor all</td>\n    <td>Remove the color tags from all snippets.</td>\n  </tr>\n  <tr>\n    <td rowspan="2">Other</td>\n    <td>Orientation</td>\n    <td>Globally set the orientation of the snippets. For example, 5&#39; -&gt; 3&#39;, 3&#39; -&gt; 5&#39;, or the initial orientation given the snippet location.</td>\n  </tr>\n  <tr>\n    <td>Swipe selection</td>\n    <td>When activated the swipe selection is used instead of the traditional rectangular lasso selection.</td>\n  </tr>\n</table>\n\n\n<h2 id="/docs/getting-started/keyboard-shortcuts" class="underlined anchored">\n  <a href="#/docs/getting-started/keyboard-shortcuts" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Keyboard Shortcuts</span>\n</h2>\n  <table>\n<thead>\n<tr>\n<th>Short cut</th>\n<th>Action</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td><em>ESC</em></td>\n<td>Exit / reject dialog, error notification</td>\n</tr>\n<tr>\n<td><em>ENTER</em></td>\n<td>Accept / resolve dialog</td>\n</tr>\n<tr>\n<td><em>CMD</em> + Z</td>\n<td>Undo</td>\n</tr>\n<tr>\n<td><em>CMD</em> + Y</td>\n<td>Redo</td>\n</tr>\n<tr>\n<td>C</td>\n<td>Toggle between the average and variance cover display.</td>\n</tr>\n<tr>\n<td>D</td>\n<td>Toggle the visibility of the details view aside.</td>\n</tr>\n<tr>\n<td>S</td>\n<td>Toggle between the rectangular lasso and the swipe selection.</td>\n</tr>\n<tr>\n<td>X</td>\n<td>Toggle between the collapsed and expanded snippet menu.</td>\n</tr>\n<tr>\n<td>Z</td>\n<td>Enable snippet view navigation (i.e., pan and zoom).</td>\n</tr>\n</tbody>\n</table>\n</div>\n<div class="wiki-page">\n<h1 id="/docs/data" class="underlined anchored">\n  <a href="#/docs/data" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Data</span>\n</h1>\n  \n<p>This pages describes how to load snippets into HiPiler and extract the location of snippets. It also explains how to load HiPiler in a Jupyter notebook.</p>\n\n<h2 id="/docs/data/config-file" class="underlined anchored">\n  <a href="#/docs/data/config-file" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Config file</span>\n</h2>\n  <p>HiPiler&#39;s configuration is specified in JSON and consists of two main parts: one for the snippet location and display and another one for HiGlass. The snippet configuration is stored under <code>fgm</code> and HiGlass is configured under <code>hgl</code>.</p>\n<p>This is an example for the snippet configuration:</p>\n<pre><code>{\n  &quot;fgm&quot;: {\n    &quot;fragmentsServer&quot;: &quot;//34.199.119.21/api/v1/&quot;,\n    &quot;fragmentsPrecision&quot;: 2,\n    &quot;fragmentsDims&quot;: 22,\n    &quot;fragments&quot;: [\n      [&quot;chrom1&quot;, &quot;start1&quot;, &quot;end1&quot;, &quot;strand1&quot;, &quot;chrom2&quot;, &quot;start2&quot;, &quot;end2&quot;, &quot;strand2&quot;, &quot;dataset&quot;, &quot;zoomOutLevel&quot;, &quot;size&quot;, &quot;distance-to-diagonal&quot;, &quot;noise&quot;, &quot;_groupA&quot;, , &quot;_groupB&quot;],\n      [&quot;22&quot;, 17395000, 17400000, &quot;coding&quot;, &quot;22&quot;, 17535000, 17540000, &quot;coding&quot;, &quot;CQMd6V_cRw6iCI_-Unl3PQ&quot;, 3, 25000000, 135000, 0.21559968240959723, 1, 1],\n      [&quot;22&quot;, 17400000, 17410000, &quot;coding&quot;, &quot;22&quot;, 17980000, 17990000, &quot;coding&quot;, &quot;CQMd6V_cRw6iCI_-Unl3PQ&quot;, 3, 100000000, 570000, 0.19905589933149648, 1, 4],\n      [&quot;22&quot;, 17650000, 17655000, &quot;coding&quot;, &quot;22&quot;, 17980000, 17985000, &quot;coding&quot;, &quot;CQMd6V_cRw6iCI_-Unl3PQ&quot;, 3, 25000000, 325000, 0.14815256212601854, 3, 2],\n      ...\n    ]\n  },\n  ...\n}\n</code></pre><p>The parameters are defined as follows:</p>\n<ul>\n<li>fragmentsServer: URL to a <a href="https://github.com/hms-dbmi/higlass-server">HiGlass server</a> or <a href="https://github.com/flekschas/hipiler-server">HiPiler server</a></li>\n<li>fragmentsPrecision: Float precision of the raw matrix snippets to be returned by the server</li>\n<li>fragmentsDims: Pixel dimension of the matrix snippets to be returned by the server. Since HiPiler currently only supports squared snippets only one dimension is needed.</li>\n<li>fragments: <a href="https://bedtools.readthedocs.io/en/latest/content/general-usage.html#bedpe-format">BEDPE</a>-like table of snippet locations. For details see below.</li>\n</ul>\n\n<h4 id="/docs/data/bedpe-like-table" class="underlined anchored">\n  <a href="#/docs/data/bedpe-like-table" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>BEDPE-like table</span>\n</h4>\n  <p>Like a simple spreadsheet, the first row of the BEDPE-like location table contains the header. The following columns are required by HiPiler. Examples are in brackets</p>\n<ul>\n<li>chrom1 [<em>str</em>, e.g.: &#39;chr1&#39;]</li>\n<li>start1 [<em>int</em>, e.g.: 0]</li>\n<li>end1 [<em>int</em>, e.g.: 0]</li>\n<li>strand1 [<em>str</em>, e.g.: &#39;coding&#39; or else]</li>\n<li>chrom2 (like <code>chrom1</code>)</li>\n<li>start2 (like <code>start1</code>)</li>\n<li>end2 (like <code>end1</code>)</li>\n<li>strand2 (like <code>stand1</code>)</li>\n<li>dataset [<em>str</em>, e.g.: &#39;CQMd6V<em>cRw6iCI</em>-Unl3PQ&#39;]</li>\n<li>zoomOutLevel [<em>int</em>, e.g.: 0]</li>\n</ul>\n<p>The <code>dataset</code> is the UUID of the Hi-C map where the locations should be extracted. <code>zoomOutLevel</code> at which zoom level the snippets should be extracted, where 0 means maximally zoomed it.</p>\n<p>Additionally, an unlimited number of extra columns can be appended to load categorical and ordinal attributes for exploration. Ordinal attributes just need to specified by a unique name, e.g., size, distance-to-diagonal, and noise. They appear as measure for arrangement of snippets in HiPiler. Categorical attributes need must be prefixed with an underscore (_), e.g., _groupA and _groupB. They appear as grouping options in HiPiler.</p>\n<p>The local neighborhood (i.e., the Hi-C map) of snippets are shown in HiGlass. The configuration of HiGlass in HiPiler is unrestricted except that one should only configure one row of primary matrices and avoid vertical arrangement of multiple matrices as the vertical space is needed for the detail matrices. For instructions on how to configure HiGlass please visit its <a href="https://github.com/hms-dbmi/higlass/wiki">wiki</a>.</p>\n\n<h4 id="/docs/data/examples" class="underlined anchored">\n  <a href="#/docs/data/examples" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Examples</span>\n</h4>\n  <p>A set of example / demo configurations are <a href="https://gist.github.com/flekschas/8b0163f25fd4ffb067aaba2a595da447">available here</a>.</p>\n\n<h2 id="/docs/data/import" class="underlined anchored">\n  <a href="#/docs/data/import" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Import</span>\n</h2>\n  <p>There are two options to load a configuration:</p>\n<ol>\n<li>Drag and drop JSON onto the browser window of HiPiler.</li>\n<li>Go to the home page and click on <em>Select a config</em>.</li>\n</ol>\n\n<h2 id="/docs/data/export" class="underlined anchored">\n  <a href="#/docs/data/export" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Export</span>\n</h2>\n  <p><em>Coming soon</em></p>\n\n<h2 id="/docs/data/jupyter-notebook-integration" class="underlined anchored">\n  <a href="#/docs/data/jupyter-notebook-integration" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Jupyter notebook integration</span>\n</h2>\n  <p><em>Coming soon</em></p>\n</div>\n<div class="wiki-page">\n<h1 id="/docs/usage-scenarios" class="underlined anchored">\n  <a href="#/docs/usage-scenarios" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Usage Scenarios</span>\n</h1>\n  \n<p>This page describes usage scenarios on how to analyze the following types of features in Hi-C contact maps.</p>\n\n<h2 id="/docs/usage-scenarios/loops" class="underlined anchored">\n  <a href="#/docs/usage-scenarios/loops" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Loops</span>\n</h2>\n  <p><strong>Demo</strong>: Go to the <a href="https://flekschas.github.io/hipiler/">public demo</a> and select <em>Loops in chromosome 22 of GM12878</em> from the list of <em>predefined configs</em>.</p>\n<p><strong>Instructions</strong>: <em>Coming soon</em></p>\n\n<h2 id="/docs/usage-scenarios/structural-variations" class="underlined anchored">\n  <a href="#/docs/usage-scenarios/structural-variations" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Structural Variations</span>\n</h2>\n  <p><em>Coming soon</em></p>\n\n<h2 id="/docs/usage-scenarios/telomeres" class="underlined anchored">\n  <a href="#/docs/usage-scenarios/telomeres" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Telomeres</span>\n</h2>\n  <p><strong>Demo</strong>: Go to the <a href="https://flekschas.github.io/hipiler/">public demo</a> and select <em>Telomere contacts of GM2878</em> or <em>Telomere contacts of GM12878 vs K562</em> from the list of <em>predefined configs</em>.</p>\n<p><strong>Instructions</strong>: <em>Coming soon</em></p>\n\n<h2 id="/docs/usage-scenarios/enhancer-promotor-units" class="underlined anchored">\n  <a href="#/docs/usage-scenarios/enhancer-promotor-units" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>Enhancer-Promotor Units</span>\n</h2>\n  <p><em>Coming soon</em></p>\n</div>\n<div class="wiki-page">\n<h1 id="/docs/faq" class="underlined anchored">\n  <a href="#/docs/faq" class="hidden-anchor">\n    <svg-icon icon-id="link"></svg-icon>\n  </a>\n  <span>FAQ</span>\n</h1>\n  \n<ul>\n<li><p><strong>Is HiPiler the same as HiGlass?</strong></p>\n<p>No. HiPiler is a separate application that integrates HiGlass. Having said that, both might eventually merge in the future.</p>\n</li>\n<li><p><strong>Do you guys prefix every app name with <em>Hi</em>? 🙈</strong></p>\n<p>Oh yes we do!</p>\n</li>\n<li><p><strong>Are these FAQs good for anything? 🤔</strong></p>\n<p>We don&#39;t know. Please tell us!</p>\n</li>\n<li><p><strong>HELP! 😩 I am lost, something keeps on breaking, and nobody wants to talk to me!</strong></p>\n<p>We&#39;re deeply sorry. Whatever it is, shoot us an email. We are here to help you out! HiPiler is not letting you down!</p>\n</li>\n<li><p><strong>What about Easter eggs?! 😮</strong></p>\n<p>You better find them!</p>\n</li>\n<li><p><strong>No, seriously! 😑 How can I find those Easter eggs? You have to help me out.</strong></p>\n<p>Would there be any fun in telling you about them?</p>\n</li>\n</ul>\n</div>\n</template>';});

define('text!app.html', ['module'], function(module) { module.exports = "<template><require from=\"assets/styles/index.css\"></require><require from=\"components/dialog/dialog\"></require><require from=\"components/navigation.html\"></require><require from=\"components/svg-icon/svg-icon\"></require><div class=\"full-wh ${currentRoute === 'matrix' ? 'matrix-full-screen-view' : ''}\" click.delegate=\"clickHandler($event)\" ref=\"baseEl\"><div id=\"drag-drop-notifier\" class=\"full-wh flex-c flex-jc-c flex-a-c\"><div class=\"full-dim\" ref=\"dragDropArea\"></div><span>Drop Config JSON</span></div><div id=\"global-error\" class=\"full-wh flex-c flex-jc-c flex-a-c\"><span>${globalErrorMsg}</span></div><dialog class=\"flex-c flex-a-c flex-jc-c full-dim ${dialogIsOpen ? 'is-active' : ''}\" deferred.bind=\"dialogDeferred\" is-open.bind=\"dialogIsOpen\" message.bind=\"dialogMessage\"></dialog><header id=\"topbar\" class=\"flex-c flex-jc-sb\"><div class=\"flex-c\"><h1 class=\"${currentRoute === 'home' ? 'is-active' : ''}\"><a class=\"flex-c\" route-href=\"route: home\"><svg-icon class=\"icon-inline\" icon-id=\"logo\"></svg-icon>${appName}</a></h1><div class=\"flex-c state state-active btn-like\" if.bind=\"currentRoute === 'explore' || currentRoute === 'matrix'\"><svg-icon class=\"icon-inline play\" icon-id=\"play\"></svg-icon>Running</div><button class=\"flex-c state state-ready\" click.delegate=\"resumeExploration()\" if.bind=\"currentRoute !== 'explore' && currentRoute !== 'matrix' && exploreIsReady\"><svg-icon class=\"icon-inline play-outline\" icon-id=\"play-outline\"></svg-icon>Resume</button> <button class=\"flex-c state\" click.delegate=\"resetHandler()\" if.bind=\"currentRoute !== 'matrix' && exploreIsReady\"><svg-icon class=\"icon-inline reset\" icon-id=\"reset\"></svg-icon>Reset</button></div><navigation class=\"primary-nav\" router.bind=\"router\" external-links.bind=\"externalLinks\" if.bind=\"currentRoute !== 'matrix'\"></navigation></header><main id=\"main\"><router-view></router-view></main></div></template>"; });
define('text!assets/styles/about.css', ['module'], function(module) { module.exports = ".about .bg-video {\n  position: absolute;\n  z-index: 0;\n  top: 0;\n  right: 0;\n  left: 0;\n  height: 80%;\n  background: #fff;\n  overflow: hidden; }\n  .about .bg-video .fade-out {\n    z-index: 1; }\n  .about .bg-video video {\n    z-index: 0;\n    /* Make video to at least 100% wide and tall */\n    min-width: 100%;\n    min-height: 100%;\n    /* Setting width & height to auto prevents the browser from stretching or squishing the video */\n    width: auto;\n    height: auto;\n    /* Center the video */\n    position: absolute;\n    top: 50%;\n    left: 50%;\n    transform: translate(-50%, -50%); }\n\n.about main {\n  position: relative;\n  z-index: 1; }\n  .about main > *:last-child {\n    margin-bottom: 4rem; }\n\n.about main > p:first-child {\n  margin: 4rem 4rem 2rem 4rem;\n  color: #000; }\n\n.about h2 {\n  margin: 2em 0 0.66em 0;\n  border-bottom: 1px solid #e5e5e5; }\n\n.about .hidden-anchor svg-icon svg {\n  width: 100%;\n  height: 100%; }\n\n.about .publication-title,\n.about #author-list h3 {\n  margin-bottom: 0.5rem;\n  font-size: 1em; }\n  .about .publication-title a,\n  .about #author-list h3 a {\n    font-weight: 500; }\n\n.about .publication-authors {\n  margin-bottom: 0.5rem; }\n\n.about .publication-journal,\n.about #author-list ul {\n  color: #999;\n  font-size: 1.125rem; }\n\n.about #author-list h3 + p {\n  margin-bottom: 0.25rem; }\n\n.about #author-list li {\n  margin-right: 1rem; }\n\n.about #youtube {\n  position: relative; }\n  .about #youtube:before {\n    display: block;\n    content: \"\";\n    width: 100%;\n    padding-top: 62.6%; }\n  .about #youtube > .content {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0; }\n\n@media (min-width: 64rem) {\n  .about main > p:first-child {\n    margin-top: 12rem; } }\n"; });
define('text!components/navigation.html', ['module'], function(module) { module.exports = "<template bindable=\"router, externalLinks\"><require from=\"components/svg-icon/svg-icon\"></require><nav><ul class=\"no-list-style flex-c\"><li repeat.for=\"link of router.navigation\" class=\"${link.isActive ? 'is-active' : ''} ${link.config.icon ? 'flex-c' : ''} ${link.config.iconOnly ? 'is-icon-only' : ''}\"><a href.bind=\"link.href\" class=\"flex-c\"><svg-icon class=\"icon-inline icon-${link.config.icon}\" if.bind=\"link.config.icon\" icon-id.bind=\"link.config.icon\"></svg-icon><span>${link.config.navTitle ? link.config.navTitle : link.title}</span></a></li><li repeat.for=\"link of externalLinks\" class=\"${link.icon ? 'is-icon-only' : ''} ${$index === 0 ? 'is-left-separated' : ''}\"><a target=\"_blank\" href.bind=\"link.href\" if.bind=\"link.icon\" title=\"${link.title}\" class=\"rel\"><svg-icon base-path=\"/\" icon-id.bind=\"link.icon\"></svg-icon></a><a target=\"_blank\" href.bind=\"link.href\" if.bind=\"!link.iconOnly\">${link.title}</a></li></ul></nav></template>"; });
define('text!assets/styles/app.css', ['module'], function(module) { module.exports = "#drag-drop-notifier,\n#global-error {\n  position: fixed;\n  z-index: -1;\n  font-size: 2em;\n  font-weight: bold;\n  text-transform: uppercase;\n  height: 0;\n  opacity: 0;\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n#drag-drop-notifier {\n  color: #fff;\n  background: rgba(255, 85, 0, 0.75); }\n\n#global-error {\n  color: #770014;\n  background: rgba(255, 119, 141, 0.9); }\n\n.bottom-bar {\n  position: relative;\n  z-index: 2;\n  height: 2.5rem;\n  color: #999;\n  border-top: 1px solid #e5e5e5;\n  background: #fff;\n  transition: height 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .bottom-bar.is-expanded {\n    box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.1), 0 -1px 3px 0 rgba(0, 0, 0, 0.05); }\n  .bottom-bar.is-expanded,\n  .bottom-bar .settings-container {\n    height: 10rem; }\n  .bottom-bar h4 {\n    margin: 0;\n    color: #444;\n    font-size: 0.85rem;\n    font-weight: 300;\n    text-transform: uppercase;\n    line-height: 2.5rem; }\n    .bottom-bar h4:after {\n      content: ':';\n      margin-right: 0.75rem; }\n  .bottom-bar .settings-row {\n    box-shadow: inset 0 1px 0 0 #e5e5e5; }\n    .bottom-bar .settings-row:first-child {\n      box-shadow: none; }\n  .bottom-bar .settings-list {\n    height: 2.5rem;\n    margin-bottom: 0; }\n    .bottom-bar .settings-list > li {\n      margin-left: 1rem;\n      padding-top: 0.3rem;\n      padding-bottom: 0.3rem; }\n      .bottom-bar .settings-list > li:first-child {\n        margin-left: 0; }\n      .bottom-bar .settings-list > li.is-disabled {\n        position: relative; }\n        .bottom-bar .settings-list > li.is-disabled::before {\n          content: '';\n          position: absolute;\n          display: block;\n          top: 1px;\n          right: 0;\n          left: 0;\n          bottom: 0;\n          background: rgba(255, 255, 255, 0.67); }\n    .bottom-bar .settings-list.settings-list-buttons-only > li {\n      margin-left: 0.5rem; }\n      .bottom-bar .settings-list.settings-list-buttons-only > li:first-child {\n        margin-left: 0.5rem; }\n      .bottom-bar .settings-list.settings-list-buttons-only > li:last-child {\n        margin-right: 0.5rem; }\n    .bottom-bar .settings-list label {\n      font-size: 0.7rem;\n      text-transform: uppercase;\n      margin-bottom: 0.125rem;\n      white-space: nowrap; }\n      .bottom-bar .settings-list label .value.new em {\n        color: #ff5500; }\n      .bottom-bar .settings-list label .value em {\n        font-style: normal; }\n  .bottom-bar .button {\n    height: 1.9rem;\n    margin-top: 1px;\n    padding: 0 0.33rem;\n    color: #666;\n    font-size: 0.8rem;\n    line-height: 1.9rem;\n    background: transparent;\n    box-shadow: inset 0 0 0 1px #e5e5e5; }\n    .bottom-bar .button:hover {\n      color: #ff5500;\n      box-shadow: inset 0 0 0 1px #ffddcc; }\n      .bottom-bar .button:hover.is-filled {\n        box-shadow: none;\n        background: #ffddcc; }\n      .bottom-bar .button:hover .button-info,\n      .bottom-bar .button:hover.is-enabled .button-info {\n        background: #ff5500;\n        box-shadow: -1px 1px 0 0 #fff; }\n      .bottom-bar .button:hover.is-disabled {\n        background: transparent;\n        box-shadow: inset 0 0 0 1px #e5e5e5; }\n        .bottom-bar .button:hover.is-disabled .button-info {\n          background: rgba(153, 153, 153, 0.75);\n          box-shadow: -1px 1px 0 0 rgba(255, 255, 255, 0.75); }\n    .bottom-bar .button.is-enabled .button-info {\n      background: rgba(0, 0, 0, 0.75); }\n    .bottom-bar .button.is-disabled {\n      color: #bfbfbf;\n      cursor: not-allowed; }\n      .bottom-bar .button.is-disabled:hover {\n        background: transparent; }\n    .bottom-bar .button.is-active {\n      color: #ff5500;\n      background: #ffddcc;\n      box-shadow: inset 0 0 0 1px #ffddcc; }\n      .bottom-bar .button.is-active .button-info {\n        background: #ff5500;\n        box-shadow: -1px 1px 0 0 #fff; }\n    .bottom-bar .button.is-filled {\n      background: #e5e5e5;\n      box-shadow: none; }\n    .bottom-bar .button svg-icon {\n      width: 1.125rem;\n      height: 1.9rem; }\n    .bottom-bar .button .button-info {\n      position: absolute;\n      top: -0.125rem;\n      right: -0.125rem;\n      min-width: 1.25em;\n      height: 1.25em;\n      color: #fff;\n      font-size: 0.6rem;\n      line-height: 1.25em;\n      border-radius: 1.25em;\n      background: rgba(153, 153, 153, 0.75);\n      box-shadow: -1px 1px 0 0 rgba(255, 255, 255, 0.75);\n      transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      .bottom-bar .button .button-info.button-info-padded {\n        padding: 0.05rem 0.15rem; }\n  .bottom-bar .button-group .button {\n    box-shadow: inset 0 -1px 0 0 #e5e5e5, inset 0 1px 0 0 #e5e5e5; }\n  .bottom-bar .button-group .button {\n    border-radius: 0; }\n  .bottom-bar .button-group .button:first-child {\n    border-radius: 0.25rem 0 0 0.25rem;\n    box-shadow: inset 0 0 0 1px #e5e5e5; }\n  .bottom-bar .button-group .button:last-child {\n    border-radius: 0 0.25rem 0.25rem 0;\n    box-shadow: inset -1px 0 0 0 #e5e5e5, inset 0 -1px 0 0 #e5e5e5, inset 0 1px 0 0 #e5e5e5; }\n  .bottom-bar .button-group .button:first-child:last-child {\n    border-radius: 0.25rem;\n    box-shadow: inset 0 0 0 1px #e5e5e5; }\n  .bottom-bar .button-group .button.is-active,\n  .bottom-bar .button-group .button.is-active:first-child,\n  .bottom-bar .button-group .button.is-active:last-child,\n  .bottom-bar .button-group .button.is-active:first-child:last-child {\n    box-shadow: inset 0 0 0 1px #ffddcc; }\n  .bottom-bar .toggler {\n    width: 3rem;\n    cursor: pointer;\n    color: #999;\n    text-transform: uppercase;\n    background: #e5e5e5; }\n  .bottom-bar .select-with-button {\n    padding: 1px 0.2rem;\n    font-size: 0.65rem;\n    border-radius: 0.25rem;\n    box-shadow: inset 0 0 0 1px #e5e5e5; }\n    .bottom-bar .select-with-button label {\n      margin-bottom: 0; }\n    .bottom-bar .select-with-button button {\n      margin: 0.2rem 0 0 0.2rem;\n      height: 1.5rem;\n      line-height: 1.5rem; }\n    .bottom-bar .select-with-button svg-icon {\n      width: 0.75rem;\n      height: 1.5rem; }\n  .bottom-bar .logo {\n    margin: 0.375rem 0.375rem 0 0; }\n    .bottom-bar .logo svg {\n      width: 2rem;\n      height: 2rem; }\n  .bottom-bar p {\n    font-size: 0.8rem;\n    line-height: 3rem; }\n  .bottom-bar.footer-main p {\n    margin-top: 0;\n    font-size: 0.9rem;\n    color: #999; }\n  .bottom-bar .logos a {\n    border-bottom: 0; }\n  .bottom-bar .logo-vcg label {\n    margin-right: 0.25rem;\n    font-size: 0.65rem;\n    line-height: 1.125em;\n    cursor: inherit; }\n\n.is-dragging-over #drag-drop-notifier,\n.is-global-error #global-error {\n  z-index: 10;\n  height: 100%;\n  opacity: 1; }\n  .is-dragging-over #drag-drop-notifier span,\n  .is-global-error #global-error span {\n    transform: scale(1); }\n\n.is-dragging-over #drag-drop-notifier {\n  animation: pulsePrimary 1.5s cubic-bezier(0.3, 0.1, 0.6, 1) infinite; }\n  .is-dragging-over #drag-drop-notifier span {\n    animation: pulseText 1.5s cubic-bezier(0.3, 0.1, 0.6, 1) infinite; }\n\n@keyframes pulsePrimary {\n  50% {\n    background: rgba(255, 85, 0, 0.75); }\n  60% {\n    background: rgba(255, 85, 0, 0.95); }\n  100% {\n    background: rgba(255, 85, 0, 0.75); } }\n\n@keyframes pulseText {\n  50% {\n    transform: scale(1); }\n  60% {\n    transform: scale(1.05); }\n  100% {\n    transform: scale(1); } }\n\n#topbar {\n  position: absolute;\n  z-index: 2;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 3rem;\n  padding: 0 0.5rem;\n  border-bottom: 1px solid #d9d9d9;\n  color: #999;\n  background: #fff;\n  line-height: 3rem; }\n  #topbar h1 {\n    position: relative;\n    margin-top: 0;\n    font-weight: normal;\n    font-size: 1.5rem;\n    line-height: inherit; }\n    #topbar h1 a {\n      border-bottom: 0; }\n    #topbar h1.is-active::before {\n      position: absolute;\n      content: '';\n      right: 0;\n      bottom: 0;\n      left: 0;\n      height: 3px;\n      background: #ff5500; }\n    #topbar h1.is-active a {\n      color: #000; }\n    #topbar h1 .icon-inline {\n      margin-right: 0.25rem;\n      width: 2rem;\n      height: 3rem; }\n  #topbar .icon-inline {\n    width: 1em;\n    height: 3rem; }\n    #topbar .icon-inline.icon-help, #topbar .icon-inline.icon-info {\n      margin-right: 0.25rem;\n      width: 1.25em; }\n    #topbar .icon-inline svg {\n      width: 100%;\n      height: 100%; }\n  #topbar .state {\n    margin: 0.5rem 0 0.5rem 0.5rem;\n    padding: 0 0.5rem;\n    cursor: pointer;\n    color: #666;\n    font-size: 0.8em;\n    text-transform: uppercase;\n    line-height: 2rem;\n    border: 0;\n    background: none;\n    transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #topbar .state:hover, #topbar .state.state-active {\n      color: #ff5500; }\n    #topbar .state:hover .reset svg {\n      -webkit-animation: spin 0.75s ease 1;\n      -moz-animation: spin 0.75s ease 1;\n      animation: spin 0.75s ease 1;\n      -webkit-transform-origin: 50% 50%;\n      -moz-transform-origin: 50% 50%;\n      transform-origin: 50% 50%; }\n\n@-moz-keyframes spin {\n  100% {\n    -moz-transform: rotate(360deg); } }\n\n@-webkit-keyframes spin {\n  100% {\n    -webkit-transform: rotate(360deg); } }\n\n@keyframes spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg); } }\n    #topbar .state:hover .play-outline svg {\n      -webkit-animation: slide-out-in 0.66s ease 1;\n      -moz-animation: slide-out-in 0.66s ease 1;\n      animation: slide-out-in 0.66s ease 1;\n      -webkit-transform-origin: 50% 50%;\n      -moz-transform-origin: 50% 50%;\n      transform-origin: 50% 50%; }\n\n@-moz-keyframes slide-out-in {\n  0% {\n    -moz-transform: translateX(0);\n    opacity: 1; }\n  50% {\n    -moz-transform: translateX(75%);\n    opacity: 0; }\n  51% {\n    -moz-transform: translateX(-50%);\n    opacity: 0; }\n  100% {\n    -moz-transform: translateX(0);\n    opacity: 1; } }\n\n@-webkit-keyframes slide-out-in {\n  0% {\n    -webkit-transform: translateX(0);\n    opacity: 1; }\n  50% {\n    -webkit-transform: translateX(75%);\n    opacity: 0; }\n  51% {\n    -webkit-transform: translateX(-50%);\n    opacity: 0; }\n  100% {\n    -webkit-transform: translateX(0);\n    opacity: 1; } }\n\n@keyframes slide-out-in {\n  0% {\n    -webkit-transform: translateX(0);\n    transform: translateX(0);\n    opacity: 1; }\n  50% {\n    -webkit-transform: translateX(75%);\n    transform: translateX(75%);\n    opacity: 0; }\n  51% {\n    -webkit-transform: translateX(-50%);\n    transform: translateX(-50%);\n    opacity: 0; }\n  100% {\n    -webkit-transform: translateX(0);\n    transform: translateX(0);\n    opacity: 1; } }\n    #topbar .state.state-indicator::after {\n      content: '';\n      margin: 0.75rem 0 0 0.25rem;\n      width: 0.5rem;\n      height: 0.5rem;\n      border-radius: 0.5rem;\n      background: #d9d9d9; }\n    #topbar .state .icon-inline {\n      margin-right: 0.25rem; }\n      #topbar .state .icon-inline svg {\n        height: 1.85rem; }\n\n#infobar {\n  position: absolute;\n  top: 3rem;\n  right: 0;\n  left: 0;\n  height: 3rem;\n  line-height: 3rem;\n  color: #666;\n  background: #d9d9d9; }\n  #infobar a {\n    border-bottom-color: #bfbfbf; }\n    #infobar a:hover {\n      border-bottom-color: #ff5500; }\n\n#main {\n  position: absolute;\n  top: 3rem;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  padding: .5rem;\n  background: #fff; }\n\n#infobar + #main {\n  top: 6rem; }\n\n#topbar,\n#main {\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n.sticky {\n  transition: padding-top 0.33s cubic-bezier(0.3, 0, 0, 1); }\n"; });
define('text!components/spinner.html', ['module'], function(module) { module.exports = "<template><svg class=\"spinner\" viewBox=\"0 0 40 40\" xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\"><circle cx=\"20\" cy=\"20\" r=\"18\" stroke-width=\"4\" fill=\"none\" stroke=\"#000\"/><g class=\"correct\" transform=\"translate(20, 20)\"><g class=\"blocks\"><animateTransform attributeName=\"transform\" attributeType=\"XML\" dur=\"1.5s\" from=\"0\" repeatCount=\"indefinite\" to=\"360\" type=\"rotate\"/><path class=\"one\" d=\"M0-20c1.104 0 2 .896 2 2s-.896 2-2 2V0l-4 21h25v-42H0v1z\" fill=\"#fff\"><animateTransform attributeName=\"transform\" attributeType=\"XML\" calcMode=\"spline\" dur=\"1.5s\" from=\"0\" values=\"0; 360\" keyTimes=\"0; 1\" keySplines=\"0.2 0.2 0.15 1\" repeatCount=\"indefinite\" to=\"360\" type=\"rotate\"/></path><path class=\"two\" d=\"M0-20c-1.104 0-2 .896-2 2s.896 2 2 2V0l4 21h-25v-42H0v1z\" fill=\"#fff\"><animateTransform attributeName=\"transform\" attributeType=\"XML\" calcMode=\"spline\" dur=\"1.5s\" from=\"0\" values=\"0; 360\" keyTimes=\"0; 1\" keySplines=\"0.1 0.15 0.8 0.8\" repeatCount=\"indefinite\" to=\"360\" type=\"rotate\"/></path></g></g></svg></template>"; });
define('text!assets/styles/axis.css', ['module'], function(module) { module.exports = ".axis {\n  position: absolute;\n  color: #999;\n  font-size: 0.8rem; }\n  .axis.axis-x {\n    left: 1rem;\n    right: 0;\n    height: 1rem;\n    box-shadow: inset -3px 0 0 0 #d9d9d9; }\n    .axis.axis-x .axis-line {\n      left: 0;\n      width: 100%;\n      height: 1px; }\n    .axis.axis-x .axis-label-min {\n      margin-left: 0.25rem; }\n    .axis.axis-x .axis-label-max {\n      margin-right: 0.25rem; }\n  .axis.axis-y {\n    top: 1rem;\n    bottom: 0.5rem;\n    width: 1rem;\n    box-shadow: inset 0 -3px 0 0 #d9d9d9; }\n    .axis.axis-y .axis-line {\n      top: 0;\n      width: 1px;\n      height: 100%; }\n  .axis.axis-top {\n    top: 0; }\n    .axis.axis-top .axis-line {\n      bottom: 0; }\n  .axis.axis-bottom {\n    bottom: 0; }\n    .axis.axis-bottom .axis-line {\n      top: 0; }\n  .axis.axis-left {\n    left: 0; }\n    .axis.axis-left .axis-line {\n      right: 0; }\n    .axis.axis-left .axis-labels {\n      height: 100%; }\n      .axis.axis-left .axis-labels .axis-label span {\n        position: absolute; }\n      .axis.axis-left .axis-labels .axis-label-min span {\n        bottom: -0.5rem;\n        transform: rotate(-90deg);\n        transform-origin: left top; }\n      .axis.axis-left .axis-labels .axis-label-max span {\n        top: 0.25rem;\n        right: 1rem;\n        transform: rotate(-90deg);\n        transform-origin: right top; }\n      .axis.axis-left .axis-labels .axis-label-name {\n        margin-left: -1px;\n        transform: rotate(-90deg); }\n  .axis.axis-right {\n    right: 0; }\n    .axis.axis-right .axis-line {\n      left: 0; }\n  .axis .axis-label-min,\n  .axis .axis-label-max,\n  .axis .axis-label-name {\n    white-space: nowrap; }\n  .axis .axis-line {\n    position: absolute;\n    background: #d9d9d9; }\n  .axis .axis-arrow {\n    right: 0; }\n\n.axis-switch {\n  position: absolute;\n  z-index: 2;\n  top: 0;\n  left: 0;\n  width: 1rem;\n  height: 1rem;\n  color: #999;\n  background: transparent; }\n  .axis-switch:hover, .axis-switch:active {\n    color: #ff5500;\n    cursor: pointer; }\n"; });
define('text!views/about.html', ['module'], function(module) { module.exports = "<template><require from=\"components/footer-main/footer-main\"></require><require from=\"components/svg-icon/svg-icon\"></require><div class=\"flex-c flex-d-c full-wh about is-increased-font-size\"><div class=\"bg-video\"><div class=\"fade-out full-dim\"></div><video autoplay loop poster=\"assets/images/about-bg.jpg\"><source src=\"assets/videos/about.webm\" type=\"video/webm\"><source src=\"assets/videos/about.mp4\" type=\"video/mp4\"></video></div><main class=\"flex-g-1 wrap\"><p class=\"is-justified is-increased-line-height\"><strong>HiPiler</strong> is an interactive visualization interface for the exploration and visualization of regions-of-interest in large <a href=\"https://en.wikipedia.org/wiki/Chromosome_conformation_capture#Hi-C_.28all-vs-all.29\" target=\"_blank\">genome interaction matrices</a>. Genome interaction matrices approximate the physical distance of pairs of genomic regions to each other and can contain up to 3 million rows and columns with many sparse regions. Traditional matrix aggregation or pan-and-zoom interfaces largely fail in supporting search, inspection, and comparison of local regions-of-interest (ROIs). ROIs can be defined, e.g., by sets of adjacent rows and columns, or by specific visual patterns in the matrix. ROIs are first-class objects in HiPiler, which represents them as thumbnail-like “snippets”. Snippets can be laid out automatically based on their data and meta attributes. They are linked back to the matrix and can be explored interactively. The design of HiPiler is based on a series of semi-structured interviews with 10 domain experts involved in the analysis and interpretation of genome interaction matrices. In <a href=\"#/about/publication\">the paper</a> we describe six exploration tasks that are crucial for analysis of interaction matrices and demonstrate how HiPiler supports these tasks. We report on a user study with a series of data exploration sessions with domain experts to assess the usability of HiPiler as well as to demonstrate respective findings in the data.</p><h2 id=\"/about/publication\" class=\"flex-c iconized anchored\"><a href=\"#/about/publication\" class=\"hidden-anchor\"><svg-icon icon-id=\"link\"></svg-icon></a><svg-icon icon-id=\"document\"></svg-icon>Publication</h2><h3 class=\"publication-title\"><a href=\"https://doi.org/10.1101/123588\" target=\"_blank\">HiPiler: Visual Exploration Of Large Genome Interaction Matrices With Interactive Small Multiples</a></h3><p class=\"publication-authors\">Fritz Lekschas, Benjamin Bach, Peter Kerpedjiev, Nils Gehlenborg, and Hanspeter Pfister.</p><div class=\"publication-journal flex-c iconized\"><p class=\"nm\">Accepted at IEEE InfoVis, 2017. (bioRxiv, doi: <a href=\"https://doi.org/10.1101/123588\" target=\"_blank\">10.1101/123588)</a></p></div><h2 id=\"/about/introduction\" class=\"flex-c iconized anchored\"><a href=\"#/about/introduction\" class=\"hidden-anchor\"><svg-icon icon-id=\"link\"></svg-icon></a><svg-icon icon-id=\"video\"></svg-icon>Introduction</h2><div id=\"youtube\" class=\"video\"><iframe src=\"https://www.youtube.com/embed/qoLqje5OYKg?rel=0&amp;showinfo=0\" frameborder=\"0\" allowfullscreen class=\"full-dim full-wh\"></iframe></div><h2 id=\"/about/source-code\" class=\"flex-c iconized anchored\"><a href=\"#/about/source-code\" class=\"hidden-anchor\"><svg-icon icon-id=\"link\"></svg-icon></a><svg-icon icon-id=\"code\"></svg-icon>Source Code</h2><ul class=\"extra-padding\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/flekschas/hipiler\" target=\"_blank\">https://github.com/flekschas/hipiler</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/flekschas/hipiler-server\" target=\"_blank\">https://github.com/flekschas/hipiler-server</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/hms-dbmi/higlass-server\" target=\"_blank\">https://github.com/hms-dbmi/higlass-server</a></li></ul><h2 id=\"/about/authors\" class=\"flex-c iconized anchored\"><a href=\"#/about/authors\" class=\"hidden-anchor\"><svg-icon icon-id=\"link\"></svg-icon></a><svg-icon icon-id=\"people\"></svg-icon>Authors</h2><ol id=\"author-list\" class=\"extra-padding\"><li><h3>Fritz Lekschas</h3><p>Harvard John A. Paulson School of Engineering and Applied Sciences</p><ul class=\"flex-c\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"globe\"></svg-icon><a href=\"http://lekschas.de\" target=\"_blank\">lekschas.de</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"gezwitscher\"></svg-icon><a href=\"https://twitter.com/flekschas\" target=\"_blank\">flekschas</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/flekschas\" target=\"_blank\">flekschas</a></li></ul></li><li><h3>Benjamin Bach</h3><p>The University of Edinburgh</p><ul class=\"flex-c\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"globe\"></svg-icon><a href=\"http://benjbach.me\" target=\"_blank\">benjbach.me</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"gezwitscher\"></svg-icon><a href=\"https://twitter.com/benjbach\" target=\"_blank\">benjbach</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/benjbach\" target=\"_blank\">benjbach</a></li></ul></li><li><h3>Peter Kerpedjiev</h3><p>Harvard Medical School</p><ul class=\"flex-c\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"globe\"></svg-icon><a href=\"http://www.emptypipes.org\" target=\"_blank\">emptypipes.org</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"gezwitscher\"></svg-icon><a href=\"https://twitter.com/pkerpedjiev\" target=\"_blank\">pkerpedjiev</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/pkerpedjiev\" target=\"_blank\">pkerpedjiev</a></li></ul></li><li><h3>Nils Gehlenborg</h3><p>Harvard Medical School</p><ul class=\"flex-c\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"globe\"></svg-icon><a href=\"http://gehlenborglab.org\" target=\"_blank\">gehlenborglab.org</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"gezwitscher\"></svg-icon><a href=\"https://twitter.com/nils_gehlenborg\" target=\"_blank\">nils_gehlenborg</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/ngehlenborg\" target=\"_blank\">ngehlenborg</a></li></ul></li><li><h3>Hanspeter Pfister</h3><p>Harvard John A. Paulson School of Engineering and Applied Sciences</p><ul class=\"flex-c\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"globe\"></svg-icon><a href=\"http://vcg.seas.harvard.edu\" target=\"_blank\">vcg.seas.harvard.edu</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"gezwitscher\"></svg-icon><a href=\"https://twitter.com/hpfister\" target=\"_blank\">hpfister</a></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"github\"></svg-icon><a href=\"https://github.com/hpfister\" target=\"_blank\">hpfister</a></li></ul></li></ol><h2 id=\"/about/acknowledgements\" class=\"flex-c iconized anchored\"><a href=\"#/about/acknowledgements\" class=\"hidden-anchor\"><svg-icon icon-id=\"link\"></svg-icon></a><svg-icon icon-id=\"people\"></svg-icon>Acknowledgements</h2><p class=\"is-increased-line-height\">We would like to deeply thank all the wonderful people who helped us along the way with many useful insights. You are the best!</p><ul class=\"is-columized extra-padding\"><li>Nezar Abdennur</li><li>Burak Alver</li><li>Houda Belaghzal</li><li>Aafke van den Berg</li><li>Job Dekker</li><li>Geoff Fudenberg</li><li>Joha Gibcus</li><li>Anton Goloborodko</li><li>David Gorkin</li><li>Maxim Imakaev</li><li>Yu Liu</li><li>Leonid Mirny</li><li>Johannes Nubler</li><li>Peter Park</li><li>Hendrik Strobelt</li><li>Su Wang</li></ul><h2 id=\"/about/icons\" class=\"flex-c iconized anchored\"><a href=\"#/about/icons\" class=\"hidden-anchor\"><svg-icon icon-id=\"link\"></svg-icon></a><svg-icon class=\"icon-info\" icon-id=\"info\"></svg-icon>Icons</h2><p class=\"is-increased-line-height\">The following sets of beautiful icons have been slightly adjusted by Fritz Lekschas and are used across the application and the paper. Thanks so much for the fantastic work.</p><ul class=\"extra-padding\"><li class=\"flex-c iconized\"><svg-icon icon-id=\"code\"></svg-icon><p class=\"nm\"><a href=\"https://thenounproject.com/term/code/821469/\" target=\"_blank\">Code</a> by Bernar Novalyi</p></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"dna\"></svg-icon><p class=\"nm\"><a href=\"https://thenounproject.com/term/dna/57372/\" target=\"_blank\">DNA</a> by Irene Hoffman</p></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"globe\"></svg-icon><p class=\"nm\"><a href=\"https://thenounproject.com/term/globe/939093/\" target=\"_blank\">Globe</a> by Storm Icons</p></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"trash\"></svg-icon><p class=\"nm\"><a href=\"https://thenounproject.com/term/trash-can/754572/\" target=\"_blank\">Trash Can</a> by Andrea Nobis</p></li><li class=\"flex-c iconized\"><svg-icon icon-id=\"reset\"></svg-icon><p class=\"nm\"><a href=\"https://thenounproject.com/term/reload/584835/\" target=\"_blank\">Reload</a> by Viktor Vorobyev</p></li></ul></main><footer-main></footer-main></div></template>"; });
define('text!assets/styles/base.css', ['module'], function(module) { module.exports = "/* =====  1 Global Rules & Definitions  ===================================== */\n/* -----  1.1 Body / base definition  --------------------------------------- */\n/* -----  1.2 Reset & Normalization  ---------------------------------------- */\n*, *::before, *::after {\n  font-family: 'Rubik', sans-serif;\n  text-rendering: optimizeLegibility;\n  margin: 0;\n  padding: 0;\n  border: none;\n  box-sizing: border-box;\n  list-style: none; }\n\narticle, aside, details, figcaption, figure,\nfooter, header, main, menu, nav, section, summary {\n  /* Add correct display for IE 9- and some newer browsers */\n  display: block; }\n\n::-moz-selection {\n  background: #ff5500;\n  color: #000; }\n\n::selection {\n  background: #ff5500;\n  color: #000; }\n\n/* -----  1.3 General Typography  ------------------------------------------- */\nh1, h2, h3, h4, h5, h6,\np, ul, ol, figure, pre {\n  /* Reset font-sizes and normalize margins */\n  font-size: inherit;\n  line-height: inherit;\n  margin: 0 0 1em; }\n\nh4, h5, h6, a, p, input, select, option, ul, ol, li, figure, pre, td, th,\nbutton, .text {\n  color: #666;\n  font-weight: 300; }\n\nh1, h2, h3, th, .text-em {\n  color: #000; }\n\n/* Headings */\nh1, h2, h3, b, strong {\n  font-weight: 500; }\n\nh1 {\n  font-size: 2.5rem;\n  line-height: 1.25;\n  margin-bottom: 3rem; }\n\nh2 {\n  font-size: 1.75rem;\n  line-height: 2.2rem; }\n\nh3 {\n  font-size: 1.25em;\n  line-height: 1.2; }\n\nh4 {\n  font-size: 1em; }\n\n/* Links */\na {\n  color: inherit;\n  text-decoration: none !important;\n  border-bottom: 1px solid #d9d9d9;\n  transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), border-bottom-color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\na:hover, a:focus, a:active {\n  color: #ff5500;\n  border-bottom-color: #ff5500; }\n\nbutton:hover\nbutton:active,\nbutton:focus {\n  outline: none; }\n\nimg {\n  border-style: none;\n  width: 100%;\n  height: auto; }\n\nfigcaption {\n  font-size: .75rem;\n  line-height: 1.5rem; }\n\na, p, button, .btn-like {\n  font-weight: 300; }\n\n/* =====  Global Styles  ==================================================== */\n.button {\n  padding: 0.25rem 0.5rem;\n  cursor: pointer;\n  border: 0;\n  border-radius: 0.25rem;\n  background: #e5e5e5;\n  transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .button:hover {\n    border: 0;\n    color: #ff5500;\n    background: #ffddcc; }\n  .button.is-icon-only svg-icon {\n    width: 1em;\n    height: 1em; }\n\n.rel {\n  position: relative; }\n\n.fw,\n.full-wh {\n  width: 100%; }\n\n.fh,\n.full-wh {\n  height: 100%; }\n\n.full-dim {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0; }\n\n.no-list-style {\n  list-style: none;\n  margin: 0;\n  padding: 0; }\n\n.inline-list li {\n  display: inline-block; }\n\n.float-list li {\n  display: block;\n  float: left; }\n\n.draggable:hover {\n  cursor: pointer; }\n\n.icon-inline svg {\n  width: 1em;\n  height: 1em; }\n\n.no-overflow {\n  overflow: hidden; }\n\n.spinner-bg {\n  padding: 1rem;\n  border-radius: 0.25rem;\n  background: #fff;\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 2px 6px 0 rgba(0, 0, 0, 0.05); }\n\nbody.dragging,\n.draggable:active {\n  cursor: move !important; }\n\nbody.dragging-horizontal,\n.draggable.horizontal-only:active {\n  cursor: ew-resize !important; }\n\nbody.dragging-vertical,\n.draggable.vertical-only:active {\n  cursor: ns-resize !important; }\n\n.is-align-center {\n  text-align: center; }\n\n.is-align-right {\n  text-align: right; }\n\n.is-increased-line-height {\n  line-height: 1.66em; }\n\n.is-justified {\n  text-align: justify; }\n\n.wrap {\n  max-width: 60rem;\n  margin: 0 auto; }\n\n.max-50 {\n  max-width: 50%; }\n\n.iconized.iconized-p svg {\n  height: 1em; }\n\n.iconized svg {\n  width: 1em;\n  margin-right: 0.33rem; }\n\n.smaller {\n  font-size: 1rem; }\n\nul.extra-padding li,\nol.extra-padding li {\n  margin: 0.125rem 0;\n  padding: 0.25rem 0; }\n\nul.is-columized li,\nol.is-columized li {\n  display: inline-block;\n  width: 33%; }\n\np.nm {\n  margin-bottom: 0; }\n\n.fade-in {\n  background: #fff;\n  background: -moz-linear-gradient(top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%);\n  /* FF3.6-15 */\n  background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%);\n  /* Chrome10-25,Safari5.1-6 */\n  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%);\n  /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */ }\n\n.fade-out {\n  background: #fff;\n  background: -moz-linear-gradient(top, rgba(255, 255, 255, 0.75) 0%, white 100%);\n  /* FF3.6-15 */\n  background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.75) 0%, white 100%);\n  /* Chrome10-25,Safari5.1-6 */\n  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.75) 0%, white 100%);\n  /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */ }\n\n.anchored {\n  position: relative; }\n\n.hidden-anchor {\n  position: absolute;\n  display: block;\n  top: 0;\n  left: -2rem;\n  bottom: 0;\n  width: 2.5rem;\n  padding: 0 1.5rem 0 0.25rem;\n  opacity: 0.33;\n  transform: scale(0);\n  transition: all 0.2s cubic-bezier(0.3, 0.1, 0.6, 1);\n  border-bottom: 0;\n  box-shadow: none !important;\n  cursor: pointer; }\n  .hidden-anchor svg-icon {\n    width: 1.125rem;\n    height: 100%; }\n\n.anchored:hover .hidden-anchor,\n.anchored:target .hidden-anchor {\n  transform: scale(1); }\n\n.hidden-anchor:hover,\n.anchored:target .hidden-anchor {\n  opacity: 1; }\n\n.anchored:target {\n  color: #000; }\n  .anchored:target.underlined::after {\n    position: absolute;\n    z-index: -1;\n    display: block;\n    top: 0;\n    left: -2rem;\n    border-bottom: 2px solid #ff5500;\n    background: rgba(255, 85, 0, 0.1); }\n  .anchored:target .hidden-anchor {\n    width: 1.5rem;\n    color: #fff;\n    background: #ff5500; }\n\n@media (min-width: 60rem) {\n  .is-increased-font-size {\n    font-size: 1.125em; } }\n\n@media (min-width: 64rem) {\n  .is-slightly-increased-font-size {\n    font-size: 1.125em; }\n  .is-increased-font-size {\n    font-size: 1.25em; } }\n"; });
define('text!assets/styles/colors.css', ['module'], function(module) { module.exports = ""; });
define('text!views/docs.html', ['module'], function(module) { module.exports = "<template><require from=\"components/footer-main/footer-main\"></require><require from=\"components/svg-icon/svg-icon\"></require><div class=\"docs is-increased-line-height\"><main class=\"flex-c wrap\"><compose class=\"column-3-4\" view.bind=\"docs\"></compose><compose class=\"column-1-4 sticky\" ref=\"sidebarEl\" style.bind=\"sidebarCss\" view.bind=\"sidebar\"></compose></main><footer-main></footer-main></div></template>"; });
define('text!assets/styles/columns.css', ['module'], function(module) { module.exports = ".column-1 {\n  width: 100%; }\n\n.column-1-2 {\n  width: 50%; }\n\n.column-1-3 {\n  width: 33.33%; }\n\n.column-2-3 {\n  width: 66.66%; }\n\n.column-1-4 {\n  width: 25%; }\n\n.column-3-4 {\n  width: 75%; }\n\n.column-1-5 {\n  width: 20%; }\n\n.column-2-5 {\n  width: 40%; }\n\n.column-3-5 {\n  width: 60%; }\n\n.column-4-5 {\n  width: 80%; }\n"; });
define('text!views/explore.html', ['module'], function(module) { module.exports = "<template><require from=\"components/fragments/fragments\"></require><require from=\"components/higlass/higlass\"></require><require from=\"components/svg-icon/svg-icon\"></require><div class=\"full-wh flex-c flex-jc-sb flex-a-s\" ref=\"exploreBaseEl\"><div class=\"vis-view flex-c flex-jc-sb flex-a-s flex-g-1\" ref=\"visEl\"><div id=\"view-matrix\" class=\"matrix-view rel\" css.one-way=\"css.matrix\" ref=\"matrixColEl\"><header class=\"column-header rel no-overflow\"><h2>Matrix</h2><ul class=\"flex-c controls\"><li><button class=\"flex-c\" click.delegate=\"maximizeColumn('matrix')\"><svg-icon icon-id=\"max-horizontal\"></svg-icon><span>Max</span></button></li><li><button class=\"flex-c\" click.delegate=\"minimizeColumn('matrix')\"><svg-icon icon-id=\"min-horizontal\"></svg-icon><span>Min</span></button></li></ul></header><higlass class=\"full-wh no-overflow column-content\"></higlass></div><div id=\"view-fragments\" class=\"fragments-view rel\" ref=\"fragmentsColEl\"><button class=\"column-resizer draggable horizontal-only\" ref=\"fragmentsDragger\" mousedown.trigger=\"columnDragStartHandler($event, 'fragments')\" css.one-way=\"fragments.dragBtnCss\"></button><div class=\"drag-indicator\" ref=\"fragmentsDragIndicator\" css.one-way=\"fragments.dragIndicatorCss\"></div><header class=\"column-header rel no-overflow\"><h2>Snippets</h2><ul class=\"flex-c controls\"><li><button class=\"flex-c\" click.delegate=\"maximizeColumn('fragments')\"><svg-icon icon-id=\"max-horizontal\"></svg-icon><span>Max</span></button></li><li><button class=\"flex-c\" click.delegate=\"minimizeColumn('fragments')\"><svg-icon icon-id=\"min-horizontal\"></svg-icon><span>Min</span></button></li></ul></header><fragments class=\"full-wh no-overflow column-content\" base-el-is-init.bind=\"init\"></fragments></div></div><div id=\"view-details\" class=\"stats-view rel\" css.one-way=\"css.stats\" ref=\"statsColEl\"><button class=\"column-resizer draggable horizontal-only\" ref=\"statsDragger\" mousedown.trigger=\"columnDragStartHandler($event, 'stats')\" css.one-way=\"stats.dragBtnCss\"></button><div class=\"drag-indicator\" ref=\"statsDragIndicator\" css.one-way=\"stats.dragIndicatorCss\"></div><header class=\"column-header rel no-overflow\"><h2>Details</h2><ul class=\"flex-c controls\"><li><button class=\"flex-c\" click.delegate=\"maximizeColumn('stats')\"><svg-icon icon-id=\"max-horizontal\"></svg-icon><span>Max</span></button></li><li><button class=\"flex-c\" click.delegate=\"minimizeColumn('stats')\"><svg-icon icon-id=\"min-horizontal\"></svg-icon><span>Min</span></button></li></ul></header><main class=\"column-content\"></main></div></div></template>"; });
define('text!assets/styles/dialog.css', ['module'], function(module) { module.exports = "dialog {\n  z-index: 99;\n  width: auto;\n  height: 0;\n  background: transparent;\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  dialog.full-dim {\n    position: fixed; }\n  dialog.is-active {\n    height: auto;\n    background: rgba(0, 0, 0, 0.5); }\n  dialog .dialog-window {\n    max-width: 75%;\n    height: 0;\n    color: #444;\n    padding: 1rem;\n    border-radius: 0.25rem;\n    background: #fff;\n    opacity: 0;\n    transform: scale(0);\n    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.075), 0 3px 9px 0 rgba(0, 0, 0, 0.075);\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    dialog .dialog-window.is-open {\n      height: auto;\n      opacity: 1;\n      transform: scale(1); }\n  dialog .button {\n    font-size: inherit;\n    color: #666; }\n  dialog .button:first-child {\n    margin-right: 0.5rem; }\n  dialog .button:last-child {\n    margin-left: 0.5rem; }\n"; });
define('text!views/home.html', ['module'], function(module) { module.exports = "<template><require from=\"components/footer-main/footer-main\"></require><require from=\"components/svg-icon/svg-icon\"></require><div class=\"flex-c flex-d-c full-wh home is-increased-font-size\"><main class=\"flex-g-1 wrap\"><h2 class=\"is-justified\">Visual Exploration of<br>Large Genome Interaction Matrices<br>With Interactive Small Multiples.</h2><div class=\"flex-c columns\"><p class=\"flex-g-1 text max-50 intro is-increased-line-height\">HiPiler is an interactive web application for exploring and visualizing many regions-of-interest in large genome interaction matrices. Genome interaction matrices approximate the physical distance of pairs of genomic regions to each other and can contain up to 3 million rows and columns. Traditional matrix aggregation or pan-and-zoom interfaces largely fail in supporting search, inspection, and comparison of local regions-of-interest. HiPiler represents regions-of-interest as thumbnail-like <em>snippets</em>. Snippets can be laid out automatically based on their data and meta attributes. They are linked back to the matrix and can be explored interactively.</p><div class=\"flex-g-1 flex-c flex-d-c wrap-extra max-50\"><p class=\"is-align-center is-increased-line-height\">Try HiPiler using one of the three methods:</p><div class=\"flex-c flex-d-c\"><div class=\"flex-g-1 box box-drop text text-em\">Drag &amp; drop a config</div><div class=\"flex-g-1 flex-c box box-select\" ref=\"selectConfigButton\"><span class=\"flex-g-1 text text-em\">Select a config</span><svg-icon icon-id=\"arrow-bottom\"></svg-icon><input type=\"file\" accept=\".json\" ref=\"inputConfigFile\" files.bind=\"selectedConfig\" change.delegate=\"selectedConfigChanged()\"></div><div class=\"flex-g-1 box box-demo\"><p class=\"text-em\">Choose a predefined config:</p><ul><li repeat.for=\"example of examples\" click.delegate=\"loadExample(example)\"><div class=\"demo-title\">${example.name}</div><div class=\"flex-c demo-data\"><svg-icon icon-id=\"data\"></svg-icon><div class=\"flex-g-1\">${example.data}</div></div></li></ul></div></div></div></div><div class=\"bg full-dim\"><div class=\"fade-in full-dim\"></div></div></main><footer-main></footer-main></div></template>"; });
define('text!views/not-found.html', ['module'], function(module) { module.exports = "<template><require from=\"components/footer-main/footer-main\"></require><div class=\"flex-c flex-d-c full-wh\"><main class=\"flex-g-1\"><p>Ups! The page you are trying to access doesn't exist. May we kindly ask you to check the URL for typos or to send us an angry email complaining about a bug?</p></main><footer-main></footer-main></div></template>"; });
define('text!assets/styles/docs.css', ['module'], function(module) { module.exports = "pre,\ncode {\n  padding: 0 0.125rem;\n  font-family: 'Roboto Mono', monospace;\n  background: #f3f3f3; }\n\ncode {\n  font-size: 0.8em; }\n\npre {\n  max-height: 30em;\n  overflow-x: scroll;\n  padding: 0.25rem;\n  font-size: 0.85em;\n  line-height: 1.5em; }\n\n.wiki-page {\n  position: relative; }\n  .wiki-page:first-child {\n    border-top: 0; }\n  .wiki-page h1 {\n    display: block;\n    margin: 4rem 0 1rem;\n    padding: 0;\n    text-transform: uppercase;\n    border-bottom: 2px solid #f3f3f3; }\n    .wiki-page h1:hover {\n      color: #000; }\n    .wiki-page h1 .hidden-anchor > .icon {\n      height: 3rem; }\n  .wiki-page:first-child h1 {\n    margin-top: 2rem; }\n  .wiki-page h2, .wiki-page h3, .wiki-page h4 {\n    margin: 1em 0 0.5em; }\n  .wiki-page h2 {\n    font-size: 1.5em;\n    line-height: 1.5em; }\n  .wiki-page h3 {\n    font-size: 1.25em; }\n  .wiki-page h4 {\n    font-size: 1em;\n    font-weight: 500;\n    color: #000; }\n  .wiki-page *:last-child {\n    margin-bottom: 1rem; }\n  .wiki-page table {\n    margin-bottom: 0.5rem;\n    font-size: 0.85em;\n    border-collapse: collapse; }\n    .wiki-page table th {\n      font-weight: bold; }\n    .wiki-page table td, .wiki-page table th {\n      padding: 0.25rem;\n      border: 1px solid #e5e5e5; }\n    .wiki-page table tr:nth-child(even) td {\n      background: #f3f3f3; }\n  .wiki-page li {\n    margin-left: 1.5rem;\n    list-style-type: disc; }\n\n.sidebar {\n  margin: 2rem 0 0 2rem;\n  padding: 0.75rem;\n  font-size: 0.95rem;\n  border: 1px solid #e5e5e5;\n  border-radius: 0.25rem; }\n  .sidebar p {\n    margin: 1.5rem 0 0.25rem; }\n    .sidebar p:first-child {\n      margin-top: 0; }\n    .sidebar p:last-child {\n      margin-bottom: 0; }\n  .sidebar strong,\n  .sidebar strong * {\n    font-weight: 500; }\n  .sidebar li {\n    margin-left: 1.5rem;\n    list-style-type: disc; }\n"; });
define('text!components/dialog/dialog.html', ['module'], function(module) { module.exports = "<template><div class=\"dialog-window ${isOpen ? 'is-open' : ''}\"><div class=\"flex-c flex-d-c\"><p innerhtml.bind=\"message\"></p></div><div class=\"flex-c buttons\"><button class=\"flex-g-1 button\" click.delegate=\"cancel()\">Cancel</button> <button class=\"flex-g-1 button\" click.delegate=\"okay()\">Okay</button></div></div></template>"; });
define('text!assets/styles/explore.css', ['module'], function(module) { module.exports = ".matrix-view,\n.fragments-view,\n.stats-view {\n  min-width: 3rem;\n  padding: 0 0.5rem; }\n  .matrix-view.is-transitionable,\n  .fragments-view.is-transitionable,\n  .stats-view.is-transitionable {\n    transition: flex-basis 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n#view-matrix {\n  flex-basis: 40%;\n  min-width: 2.5rem;\n  padding-left: 0; }\n\n#view-fragments {\n  flex-grow: 1;\n  border-left: 1px solid #d9d9d9; }\n\n#view-details {\n  display: none;\n  flex-basis: 20rem;\n  border-left: 1px solid #d9d9d9;\n  min-width: 2.5rem;\n  padding-right: 0; }\n\n.column-resizer {\n  position: absolute;\n  z-index: 5;\n  top: 0;\n  left: -0.25rem;\n  display: block;\n  width: 0.5rem;\n  height: 2rem;\n  background: #d9d9d9;\n  transform: translateX(0);\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), width 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .column-resizer:hover, .column-resizer:active, .column-resizer:focus {\n    transform: translateX(-0.25rem);\n    width: 1rem; }\n\n.is-col-drag-fragments .fragments-view .column-resizer,\n.is-col-drag-stats .stats-view .column-resizer {\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1);\n  width: 1rem; }\n\n.is-col-drag-fragments-highlight .fragments-view .column-resizer,\n.is-col-drag-stats-highlight .stats-view .column-resizer {\n  background: #ff5500;\n  width: 1rem; }\n  .is-col-drag-fragments-highlight .fragments-view .column-resizer:hover, .is-col-drag-fragments-highlight .fragments-view .column-resizer:active, .is-col-drag-fragments-highlight .fragments-view .column-resizer:focus,\n  .is-col-drag-stats-highlight .stats-view .column-resizer:hover,\n  .is-col-drag-stats-highlight .stats-view .column-resizer:active,\n  .is-col-drag-stats-highlight .stats-view .column-resizer:focus {\n    transform: none; }\n\n.drag-indicator {\n  position: absolute;\n  z-index: 4;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 1px;\n  background: #ff5500;\n  opacity: 0;\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n.is-col-drag-fragments .fragments-view .drag-indicator,\n.is-col-drag-stats .stats-view .drag-indicator {\n  opacity: 1; }\n\n.column-content .error-indicator,\n.column-content .loading-indicator {\n  height: 0;\n  overflow: hidden;\n  opacity: 0;\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .column-content .error-indicator.is-active,\n  .column-content .loading-indicator.is-active {\n    height: 100%;\n    opacity: 1; }\n  .column-content .error-indicator svg,\n  .column-content .loading-indicator svg {\n    width: 3rem;\n    height: 3rem; }\n\n.column-content .error-indicator {\n  z-index: 3;\n  color: #770014;\n  background: rgba(255, 119, 141, 0.8); }\n\n.column-content .loading-indicator {\n  z-index: 1;\n  background: rgba(255, 255, 255, 0.67); }\n  .column-content .loading-indicator svg circle {\n    stroke: #bfbfbf; }\n  .column-content .loading-indicator svg .one,\n  .column-content .loading-indicator svg .two {\n    fill: #fff; }\n\n.column-header {\n  z-index: 2;\n  height: 2rem; }\n  .column-header:hover h2 {\n    margin-top: -2rem; }\n  .column-header h2 {\n    margin: 0; }\n  .column-header h2 {\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    position: absolute;\n    z-index: 1;\n    top: 0;\n    right: 0;\n    left: 0;\n    height: 2rem;\n    min-width: 2rem;\n    font-size: 1rem;\n    line-height: 2rem;\n    color: #d9d9d9;\n    font-weight: 300;\n    text-transform: uppercase;\n    background: #fff;\n    transition: margin 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .column-header button {\n    min-width: 2rem;\n    height: 2rem;\n    color: #999;\n    border: none;\n    background: none;\n    transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    .column-header button:hover {\n      color: #000;\n      background: #d9d9d9; }\n  .column-header .controls {\n    position: absolute;\n    top: 0;\n    right: 0;\n    left: 0;\n    height: 2rem;\n    min-width: 2rem;\n    margin: 0; }\n    .column-header .controls li {\n      margin-left: 0.5rem; }\n      .column-header .controls li:first-child {\n        margin-left: 0; }\n    .column-header .controls button svg {\n      width: 1.5rem;\n      height: 1.5rem;\n      padding: 0.25rem; }\n    .column-header .controls button span {\n      font-size: 0.9rem;\n      line-height: 1.5rem; }\n\n.bottom-bar.is-expanded,\n.bottom-bar .settings-container {\n  height: 15rem; }\n\n.bottom-bar multi-select {\n  margin-top: 0.3rem;\n  font-size: 0.9rem; }\n  .bottom-bar multi-select input {\n    padding: 0;\n    font-size: 0.9rem;\n    line-height: 1.9rem; }\n  .bottom-bar multi-select .options.bottom-up {\n    bottom: 2rem;\n    margin-bottom: -1px; }\n\n.bottom-bar .settings-row > button {\n  margin: 0.3rem 0.5rem; }\n"; });
define('text!components/footer-main/footer-main.html', ['module'], function(module) { module.exports = "<template><require from=\"components/svg-icon/svg-icon\"></require><footer class=\"footer-main bottom-bar flex-c flex-jc-sb\"><div class=\"flex-c flex-jc-sb logos\"><a href=\"https://vcg.seas.harvard.edu\" target=\"_blank\" class=\"flex-c logo logo-vcg\"><label class=\"is-align-right\">Visual<br>Computing<br>Group</label><svg-icon icon-id=\"logo-harvard-vcg\"></svg-icon></a><a href=\"https://www.seas.harvard.edu\" target=\"_blank\"><svg-icon icon-id=\"logo-harvard-seas\" class=\"logo\"></svg-icon></a><a href=\"https://hms.harvard.edu\" target=\"_blank\"><svg-icon icon-id=\"logo-harvard-hms\" class=\"logo\"></svg-icon></a></div><p class=\"copyright\">Copyright © 2017 The President and Fellows of Harvard College</p><p class=\"version\">v${version}</p></footer></template>"; });
define('text!assets/styles/flexbox.css', ['module'], function(module) { module.exports = ".flex-c {\n  display: flex; }\n\n.flex-d-c {\n  flex-direction: column; }\n\n.flex-jc-c {\n  justify-content: center; }\n\n.flex-jc-sb {\n  justify-content: space-between; }\n\n.flex-a-c {\n  align-items: center; }\n\n.flex-a-s {\n  align-items: stretch; }\n\n.flex-w {\n  flex-wrap: wrap; }\n\n.flex-g-1 {\n  flex-grow: 1; }\n"; });
define('text!assets/styles/fragments.css', ['module'], function(module) { module.exports = "fragments {\n  display: block;\n  margin-top: -2rem;\n  padding-top: 2rem; }\n  fragments .fragment-plot.is-piles-inspection {\n    box-shadow: inset 0 0 0 0.25rem #ffddcc; }\n"; });
define('text!assets/styles/grid.css', ['module'], function(module) { module.exports = ".grid {\n  position: absolute;\n  z-index: 1;\n  overflow: hidden;\n  display: none;\n  opacity: 0;\n  transition: opacity 0 cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .grid.full-dim {\n    display: block;\n    bottom: 100%; }\n  .grid.is-active {\n    display: block;\n    opacity: 1;\n    transition: opacity 0.2s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    .grid.is-active.full-dim {\n      bottom: 0; }\n  .grid .column {\n    position: relative;\n    border-left: 1px solid #ff5500; }\n    .grid .column:first-child {\n      border-left: 0; }\n  .grid .row {\n    position: relative;\n    border-top: 1px solid #ff5500; }\n    .grid .row:first-child {\n      border-top: 0; }\n"; });
define('text!assets/styles/higlass.css', ['module'], function(module) { module.exports = "higlass {\n  display: block;\n  margin-top: -2rem;\n  padding-top: 2rem; }\n  higlass .genome-position-search .input-group {\n    display: flex; }\n    higlass .genome-position-search .input-group div:first-child {\n      flex-grow: 1; }\n  higlass .genome-position-search .search-bar:focus {\n    outline: 0; }\n  higlass .genome-position-search .btn {\n    width: 30px;\n    height: 30px; }\n    higlass .genome-position-search .btn::before {\n      content: 'Go'; }\n    higlass .genome-position-search .btn.btn-sm {\n      padding: 5px; }\n\n.matrix-full-screen-view higlass {\n  margin-top: 0;\n  padding-top: 0; }\n"; });
define('text!components/multi-select/multi-select.html', ['module'], function(module) { module.exports = "<template><require from=\"components/svg-icon/svg-icon\"></require><div class=\"rel ${disabled ? 'is-disabled' : ''} ${optionsIsActive ? 'is-active' : ''} ${selectedOptions.length ? 'is-in-use' : ''}\" ref=\"baseEl\"><div class=\"flex-c\"><ul class=\"flex-c options-selected\"><li repeat.for=\"option of selectedOptions\" class=\"flex-c\"><span>${option.name}</span> <button class=\"flex-c flex-jc-c flex-a-c\" click.delegate=\"unselect(option)\"><svg-icon icon-id=\"cross\"></svg-icon></button></li></ul><input class=\"flex-g-1\" type=\"text\" placeholder=\"${!selectedOptions.length ? placeholder : ''}\" enter.delegate=\"select($event)\" focus.trigger=\"activateOptions()\" keydown.delegate=\"keyDownHandler($event)\" disabled.bind=\"disabled\" ref=\"inputEl\"></div><ul class=\"options ${bottomUp ? 'bottom-up' : ''} ${optionsIsActive ? 'is-active' : ''}\"><li repeat.for=\"option of options\" class=\"${option.isFocus ? 'is-focus' : ''} ${option.isSelected ? 'is-selected' : ''}\" click.delegate=\"select(option)\">${option.name}</li></ul></div></template>"; });
define('text!assets/styles/home.css', ['module'], function(module) { module.exports = ".home .bg {\n  position: fixed;\n  background-image: url(\"assets/images/home-bg.png\");\n  background-size: cover;\n  z-index: -1; }\n\n.home main,\n.home footer-main {\n  z-index: 1; }\n\n.home footer-main {\n  margin: 0 -0.5rem -0.5rem -0.5rem; }\n  .home footer-main .bottom-bar {\n    height: 3rem;\n    padding: 0 0.5rem 0.5rem 0.5rem;\n    background: rgba(255, 255, 255, 0.75); }\n\n.home .wrap-extra {\n  max-width: 45rem;\n  margin: 0 auto; }\n\n.home h2 {\n  margin-top: 1rem;\n  font-size: 3rem;\n  line-height: 1.25em; }\n\n.home .columns > * {\n  margin: 0 1rem; }\n  .home .columns > *:first-child {\n    margin-left: 0; }\n  .home .columns > *:last-child {\n    margin-right: 0; }\n\n.home p {\n  margin-bottom: 0; }\n\n.home .box {\n  position: relative;\n  margin: 0.5rem 0;\n  padding: 1rem;\n  font-size: 1rem;\n  border-radius: 0.25rem;\n  background: #e5e5e5; }\n  .home .box:first-child {\n    margin-top: 1rem; }\n\n.home .box-drop:after {\n  position: absolute;\n  content: '';\n  top: 0.25rem;\n  right: 0.25rem;\n  bottom: 0.25rem;\n  left: 0.25rem;\n  border: 2px dashed #fff;\n  border-radius: 0.125rem; }\n\n.home .box-select {\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .home .box-select:hover {\n    color: #ff5500;\n    cursor: pointer;\n    background: #ffddcc; }\n  .home .box-select svg,\n  .home .box-select svg-icon {\n    width: 1.25rem;\n    height: 1.25rem;\n    color: #fff; }\n  .home .box-select input {\n    display: none; }\n\n.home .box-demo ul {\n  margin: 0.5rem 0 0 0; }\n\n.home .box-demo li {\n  padding: 0.5rem;\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .home .box-demo li:nth-child(odd) {\n    background: #f2f2f2; }\n    .home .box-demo li:nth-child(odd):hover {\n      background: #ffddcc; }\n  .home .box-demo li:hover {\n    color: #ff5500;\n    cursor: pointer;\n    background: #ffddcc;\n    box-shadow: -2px 0 0 0 #ff5500; }\n  .home .box-demo li:hover,\n  .home .box-demo li:hover .demo-data,\n  .home .box-demo li:hover .demo-title {\n    color: #ff5500; }\n\n.home .box-demo .demo-title {\n  margin-bottom: 0.25em; }\n\n.home .box-demo .demo-data {\n  font-size: 0.85em;\n  color: #999; }\n  .home .box-demo .demo-data svg {\n    width: 1em;\n    height: 1em;\n    margin-right: 0.25em; }\n"; });
define('text!components/svg-icon/svg-icon.html', ['module'], function(module) { module.exports = "<template><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"${icon.viewBox}\" fill-rule=\"${icon.fillRule}\" innerhtml.bind=\"icon.svg\"></svg></template>"; });
define('text!assets/styles/index.css', ['module'], function(module) { module.exports = "@charset \"UTF-8\";\n#hipiler {\n  height: 100vh;\n  margin: 0;\n  padding: 0;\n  background: #fff;\n  /* =====  1 Global Rules & Definitions  ===================================== */\n  /* -----  1.1 Body / base definition  --------------------------------------- */\n  /* -----  1.2 Reset & Normalization  ---------------------------------------- */\n  /* -----  1.3 General Typography  ------------------------------------------- */\n  /* Headings */\n  /* Links */\n  /* =====  Global Styles  ==================================================== */ }\n  #hipiler .flex-c {\n    display: flex; }\n  #hipiler .flex-d-c {\n    flex-direction: column; }\n  #hipiler .flex-jc-c {\n    justify-content: center; }\n  #hipiler .flex-jc-sb {\n    justify-content: space-between; }\n  #hipiler .flex-a-c {\n    align-items: center; }\n  #hipiler .flex-a-s {\n    align-items: stretch; }\n  #hipiler .flex-w {\n    flex-wrap: wrap; }\n  #hipiler .flex-g-1 {\n    flex-grow: 1; }\n  #hipiler input[type=range] {\n    -webkit-appearance: none;\n    margin: 0;\n    width: 100%; }\n  #hipiler input[type=range]:focus {\n    outline: none; }\n  #hipiler input[type=range]::-webkit-slider-runnable-track {\n    width: 100%;\n    height: 1rem;\n    cursor: pointer;\n    background: #d9d9d9;\n    border: 0;\n    box-shadow: inset 0 0.375rem 0 0 #fff, inset 0 -0.375rem 0 0 #fff; }\n  #hipiler input[type=range]::-webkit-slider-thumb {\n    height: 1rem;\n    width: 0.25rem;\n    background: #999;\n    cursor: pointer;\n    -webkit-appearance: none;\n    border: 0;\n    transition: transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler input[type=range]::-webkit-slider-thumb:active, #hipiler input[type=range]::-webkit-slider-thumb:focus, #hipiler input[type=range]::-webkit-slider-thumb:hover {\n      background: #000;\n      transform: scaleX(1.5); }\n  #hipiler input[type=range]:hover::-webkit-slider-thumb {\n    background: #000; }\n  #hipiler input[type=range]:focus::-webkit-slider-runnable-track {\n    background: #d9d9d9; }\n  #hipiler input[type=range]::-moz-range-track {\n    width: 100%;\n    height: 1rem;\n    cursor: pointer;\n    border: 0;\n    background: #d9d9d9;\n    box-shadow: inset 0 0.375rem 0 0 #fff, inset 0 -0.375rem 0 0 #fff; }\n  #hipiler input[type=range]::-moz-range-thumb {\n    border: 0;\n    height: 2rem;\n    width: 0.25rem;\n    background: #999;\n    cursor: pointer; }\n  #hipiler input[type=range]::-ms-track {\n    width: 100%;\n    height: 0.25rem;\n    cursor: pointer;\n    background: transparent;\n    border-color: transparent;\n    color: transparent;\n    border: 0; }\n  #hipiler input[type=range]::-ms-fill-lower {\n    background: #d9d9d9; }\n  #hipiler input[type=range]::-ms-fill-upper {\n    background: #d9d9d9; }\n  #hipiler input[type=range]::-ms-thumb {\n    border: 0;\n    height: 2rem;\n    width: 0.25rem;\n    background: #999;\n    cursor: pointer; }\n  #hipiler input[type=range]:focus::-ms-fill-lower {\n    background: #d9d9d9; }\n  #hipiler input[type=range]:focus::-ms-fill-upper {\n    background: #d9d9d9; }\n  #hipiler multi-select {\n    position: relative;\n    display: block;\n    font-size: 0.8rem; }\n    #hipiler multi-select input {\n      margin-left: 0.25rem;\n      width: 6rem;\n      padding: 0.125rem 0;\n      background: transparent; }\n      #hipiler multi-select input:active, #hipiler multi-select input:focus {\n        outline: none; }\n    #hipiler multi-select > div {\n      border-radius: 0 0 0.125rem 0.125rem;\n      box-shadow: 0 0 0 1px rgba(217, 217, 217, 0);\n      transition: box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      #hipiler multi-select > div.is-active {\n        box-shadow: 0 0 0 1px #d9d9d9; }\n      #hipiler multi-select > div.is-disabled {\n        opacity: 0.5; }\n    #hipiler multi-select > div.is-in-use input {\n      width: 2rem; }\n    #hipiler multi-select .options {\n      position: absolute;\n      left: 0;\n      right: 0;\n      top: 0;\n      margin: 0;\n      height: 0;\n      opacity: 0;\n      background: #fff;\n      overflow: hidden;\n      border-radius: 0.125rem 0.125rem 0 0;\n      box-shadow: 0 0 0 1px rgba(153, 153, 153, 0);\n      transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      #hipiler multi-select .options.bottom-up {\n        top: auto;\n        bottom: 0.3rem; }\n      #hipiler multi-select .options.is-active {\n        height: auto;\n        opacity: 1;\n        overflow: visible; }\n      #hipiler multi-select .options > li {\n        padding-left: 0.25rem;\n        line-height: 1.5rem;\n        border-top: 1px solid #e5e5e5; }\n        #hipiler multi-select .options > li:first-child {\n          border-top: 0; }\n        #hipiler multi-select .options > li:hover {\n          cursor: pointer; }\n        #hipiler multi-select .options > li:hover, #hipiler multi-select .options > li.is-focus, #hipiler multi-select .options > li.is-selected {\n          color: #000;\n          border-top-color: #fff; }\n        #hipiler multi-select .options > li:hover, #hipiler multi-select .options > li.is-focus, #hipiler multi-select .options > li.is-focus.is-selected {\n          background: #ff5500; }\n        #hipiler multi-select .options > li.is-selected {\n          font-weight: bold;\n          background: #e5e5e5; }\n          #hipiler multi-select .options > li.is-selected:after {\n            content: '✓';\n            margin-left: 0.25rem; }\n    #hipiler multi-select > div.is-active .options {\n      box-shadow: 0 0 0 1px #d9d9d9; }\n    #hipiler multi-select .options-selected {\n      margin: 0.2rem 0;\n      line-height: 1.5rem; }\n      #hipiler multi-select .options-selected > li {\n        margin-left: 0.25rem;\n        border-radius: 0.125rem;\n        background: #e5e5e5; }\n      #hipiler multi-select .options-selected span {\n        color: #666;\n        padding-left: 0.25rem; }\n      #hipiler multi-select .options-selected button {\n        width: 1rem;\n        color: #999;\n        font-size: 1rem;\n        background: none; }\n        #hipiler multi-select .options-selected button svg-icon,\n        #hipiler multi-select .options-selected button svg-icon > svg {\n          width: 1rem;\n          height: 1rem; }\n        #hipiler multi-select .options-selected button svg-icon > svg {\n          padding: 0.25rem; }\n  #hipiler svg-icon {\n    display: block; }\n    #hipiler svg-icon svg {\n      width: 100%;\n      height: 100%; }\n  #hipiler .axis {\n    position: absolute;\n    color: #999;\n    font-size: 0.8rem; }\n    #hipiler .axis.axis-x {\n      left: 1rem;\n      right: 0;\n      height: 1rem;\n      box-shadow: inset -3px 0 0 0 #d9d9d9; }\n      #hipiler .axis.axis-x .axis-line {\n        left: 0;\n        width: 100%;\n        height: 1px; }\n      #hipiler .axis.axis-x .axis-label-min {\n        margin-left: 0.25rem; }\n      #hipiler .axis.axis-x .axis-label-max {\n        margin-right: 0.25rem; }\n    #hipiler .axis.axis-y {\n      top: 1rem;\n      bottom: 0.5rem;\n      width: 1rem;\n      box-shadow: inset 0 -3px 0 0 #d9d9d9; }\n      #hipiler .axis.axis-y .axis-line {\n        top: 0;\n        width: 1px;\n        height: 100%; }\n    #hipiler .axis.axis-top {\n      top: 0; }\n      #hipiler .axis.axis-top .axis-line {\n        bottom: 0; }\n    #hipiler .axis.axis-bottom {\n      bottom: 0; }\n      #hipiler .axis.axis-bottom .axis-line {\n        top: 0; }\n    #hipiler .axis.axis-left {\n      left: 0; }\n      #hipiler .axis.axis-left .axis-line {\n        right: 0; }\n      #hipiler .axis.axis-left .axis-labels {\n        height: 100%; }\n        #hipiler .axis.axis-left .axis-labels .axis-label span {\n          position: absolute; }\n        #hipiler .axis.axis-left .axis-labels .axis-label-min span {\n          bottom: -0.5rem;\n          transform: rotate(-90deg);\n          transform-origin: left top; }\n        #hipiler .axis.axis-left .axis-labels .axis-label-max span {\n          top: 0.25rem;\n          right: 1rem;\n          transform: rotate(-90deg);\n          transform-origin: right top; }\n        #hipiler .axis.axis-left .axis-labels .axis-label-name {\n          margin-left: -1px;\n          transform: rotate(-90deg); }\n    #hipiler .axis.axis-right {\n      right: 0; }\n      #hipiler .axis.axis-right .axis-line {\n        left: 0; }\n    #hipiler .axis .axis-label-min,\n    #hipiler .axis .axis-label-max,\n    #hipiler .axis .axis-label-name {\n      white-space: nowrap; }\n    #hipiler .axis .axis-line {\n      position: absolute;\n      background: #d9d9d9; }\n    #hipiler .axis .axis-arrow {\n      right: 0; }\n  #hipiler .axis-switch {\n    position: absolute;\n    z-index: 2;\n    top: 0;\n    left: 0;\n    width: 1rem;\n    height: 1rem;\n    color: #999;\n    background: transparent; }\n    #hipiler .axis-switch:hover, #hipiler .axis-switch:active {\n      color: #ff5500;\n      cursor: pointer; }\n  #hipiler .grid {\n    position: absolute;\n    z-index: 1;\n    overflow: hidden;\n    display: none;\n    opacity: 0;\n    transition: opacity 0 cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .grid.full-dim {\n      display: block;\n      bottom: 100%; }\n    #hipiler .grid.is-active {\n      display: block;\n      opacity: 1;\n      transition: opacity 0.2s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      #hipiler .grid.is-active.full-dim {\n        bottom: 0; }\n    #hipiler .grid .column {\n      position: relative;\n      border-left: 1px solid #ff5500; }\n      #hipiler .grid .column:first-child {\n        border-left: 0; }\n    #hipiler .grid .row {\n      position: relative;\n      border-top: 1px solid #ff5500; }\n      #hipiler .grid .row:first-child {\n        border-top: 0; }\n  #hipiler .pile-context-menu {\n    position: fixed;\n    z-index: 99;\n    opacity: 0;\n    font-family: 'Rubik', sans-serif;\n    font-size: 0.8rem;\n    transform: scale(0);\n    transform-origin: right top;\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .pile-context-menu.is-active {\n      opacity: 1;\n      transform: scale(1); }\n    #hipiler .pile-context-menu.is-align-left button {\n      text-align: left; }\n    #hipiler .pile-context-menu.is-bottom-up {\n      transform-origin: right bottom; }\n      #hipiler .pile-context-menu.is-bottom-up ul {\n        transform: translateY(0); }\n    #hipiler .pile-context-menu .is-multiple {\n      text-align: center; }\n    #hipiler .pile-context-menu ul {\n      padding: 0.125rem;\n      background: rgba(255, 255, 255, 0.95);\n      border-radius: 0.25rem;\n      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 2px 6px 0 rgba(0, 0, 0, 0.05);\n      transform: translateY(-50%); }\n    #hipiler .pile-context-menu button {\n      margin: 1px 0;\n      padding: 0.125rem 0.25rem;\n      font: inherit;\n      text-align: right;\n      background: transparent; }\n      #hipiler .pile-context-menu button:hover {\n        background: #e5e5e5; }\n      #hipiler .pile-context-menu button:active {\n        color: #000;\n        background: #ff5500; }\n    #hipiler .pile-context-menu li.is-active button,\n    #hipiler .pile-context-menu li.is-active button:hover,\n    #hipiler .pile-context-menu li.is-active button:active {\n      color: #ff5500;\n      background: #ffddcc; }\n    #hipiler .pile-context-menu label {\n      color: #999;\n      text-align: right; }\n      #hipiler .pile-context-menu label:after {\n        content: ':'; }\n    #hipiler .pile-context-menu .separator {\n      margin: 0.25rem -0.125rem;\n      height: 1px;\n      background: #e5e5e5; }\n    #hipiler .pile-context-menu li:first-child .separator,\n    #hipiler .pile-context-menu li:last-child .separator {\n      display: none; }\n  #hipiler dialog {\n    z-index: 99;\n    width: auto;\n    height: 0;\n    background: transparent;\n    transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler dialog.full-dim {\n      position: fixed; }\n    #hipiler dialog.is-active {\n      height: auto;\n      background: rgba(0, 0, 0, 0.5); }\n    #hipiler dialog .dialog-window {\n      max-width: 75%;\n      height: 0;\n      color: #444;\n      padding: 1rem;\n      border-radius: 0.25rem;\n      background: #fff;\n      opacity: 0;\n      transform: scale(0);\n      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.075), 0 3px 9px 0 rgba(0, 0, 0, 0.075);\n      transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      #hipiler dialog .dialog-window.is-open {\n        height: auto;\n        opacity: 1;\n        transform: scale(1); }\n    #hipiler dialog .button {\n      font-size: inherit;\n      color: #666; }\n    #hipiler dialog .button:first-child {\n      margin-right: 0.5rem; }\n    #hipiler dialog .button:last-child {\n      margin-left: 0.5rem; }\n  #hipiler .column-1 {\n    width: 100%; }\n  #hipiler .column-1-2 {\n    width: 50%; }\n  #hipiler .column-1-3 {\n    width: 33.33%; }\n  #hipiler .column-2-3 {\n    width: 66.66%; }\n  #hipiler .column-1-4 {\n    width: 25%; }\n  #hipiler .column-3-4 {\n    width: 75%; }\n  #hipiler .column-1-5 {\n    width: 20%; }\n  #hipiler .column-2-5 {\n    width: 40%; }\n  #hipiler .column-3-5 {\n    width: 60%; }\n  #hipiler .column-4-5 {\n    width: 80%; }\n  #hipiler *, #hipiler *::before, #hipiler *::after {\n    font-family: 'Rubik', sans-serif;\n    text-rendering: optimizeLegibility;\n    margin: 0;\n    padding: 0;\n    border: none;\n    box-sizing: border-box;\n    list-style: none; }\n  #hipiler article, #hipiler aside, #hipiler details, #hipiler figcaption, #hipiler figure,\n  #hipiler footer, #hipiler header, #hipiler main, #hipiler menu, #hipiler nav, #hipiler section, #hipiler summary {\n    /* Add correct display for IE 9- and some newer browsers */\n    display: block; }\n  #hipiler ::-moz-selection {\n    background: #ff5500;\n    color: #000; }\n  #hipiler ::selection {\n    background: #ff5500;\n    color: #000; }\n  #hipiler h1, #hipiler h2, #hipiler h3, #hipiler h4, #hipiler h5, #hipiler h6,\n  #hipiler p, #hipiler ul, #hipiler ol, #hipiler figure, #hipiler pre {\n    /* Reset font-sizes and normalize margins */\n    font-size: inherit;\n    line-height: inherit;\n    margin: 0 0 1em; }\n  #hipiler h4, #hipiler h5, #hipiler h6, #hipiler a, #hipiler p, #hipiler input, #hipiler select, #hipiler option, #hipiler ul, #hipiler ol, #hipiler li, #hipiler figure, #hipiler pre, #hipiler td, #hipiler th,\n  #hipiler button, #hipiler .text {\n    color: #666;\n    font-weight: 300; }\n  #hipiler h1, #hipiler h2, #hipiler h3, #hipiler th, #hipiler .text-em {\n    color: #000; }\n  #hipiler h1, #hipiler h2, #hipiler h3, #hipiler b, #hipiler strong {\n    font-weight: 500; }\n  #hipiler h1 {\n    font-size: 2.5rem;\n    line-height: 1.25;\n    margin-bottom: 3rem; }\n  #hipiler h2 {\n    font-size: 1.75rem;\n    line-height: 2.2rem; }\n  #hipiler h3 {\n    font-size: 1.25em;\n    line-height: 1.2; }\n  #hipiler h4 {\n    font-size: 1em; }\n  #hipiler a {\n    color: inherit;\n    text-decoration: none !important;\n    border-bottom: 1px solid #d9d9d9;\n    transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), border-bottom-color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  #hipiler a:hover, #hipiler a:focus, #hipiler a:active {\n    color: #ff5500;\n    border-bottom-color: #ff5500; }\n  #hipiler button:hover\nbutton:active,\n  #hipiler button:focus {\n    outline: none; }\n  #hipiler img {\n    border-style: none;\n    width: 100%;\n    height: auto; }\n  #hipiler figcaption {\n    font-size: .75rem;\n    line-height: 1.5rem; }\n  #hipiler a, #hipiler p, #hipiler button, #hipiler .btn-like {\n    font-weight: 300; }\n  #hipiler .button {\n    padding: 0.25rem 0.5rem;\n    cursor: pointer;\n    border: 0;\n    border-radius: 0.25rem;\n    background: #e5e5e5;\n    transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .button:hover {\n      border: 0;\n      color: #ff5500;\n      background: #ffddcc; }\n    #hipiler .button.is-icon-only svg-icon {\n      width: 1em;\n      height: 1em; }\n  #hipiler .rel {\n    position: relative; }\n  #hipiler .fw,\n  #hipiler .full-wh {\n    width: 100%; }\n  #hipiler .fh,\n  #hipiler .full-wh {\n    height: 100%; }\n  #hipiler .full-dim {\n    position: absolute;\n    top: 0;\n    right: 0;\n    bottom: 0;\n    left: 0; }\n  #hipiler .no-list-style {\n    list-style: none;\n    margin: 0;\n    padding: 0; }\n  #hipiler .inline-list li {\n    display: inline-block; }\n  #hipiler .float-list li {\n    display: block;\n    float: left; }\n  #hipiler .draggable:hover {\n    cursor: pointer; }\n  #hipiler .icon-inline svg {\n    width: 1em;\n    height: 1em; }\n  #hipiler .no-overflow {\n    overflow: hidden; }\n  #hipiler .spinner-bg {\n    padding: 1rem;\n    border-radius: 0.25rem;\n    background: #fff;\n    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 2px 6px 0 rgba(0, 0, 0, 0.05); }\n  #hipiler body.dragging,\n  #hipiler .draggable:active {\n    cursor: move !important; }\n  #hipiler body.dragging-horizontal,\n  #hipiler .draggable.horizontal-only:active {\n    cursor: ew-resize !important; }\n  #hipiler body.dragging-vertical,\n  #hipiler .draggable.vertical-only:active {\n    cursor: ns-resize !important; }\n  #hipiler .is-align-center {\n    text-align: center; }\n  #hipiler .is-align-right {\n    text-align: right; }\n  #hipiler .is-increased-line-height {\n    line-height: 1.66em; }\n  #hipiler .is-justified {\n    text-align: justify; }\n  #hipiler .wrap {\n    max-width: 60rem;\n    margin: 0 auto; }\n  #hipiler .max-50 {\n    max-width: 50%; }\n  #hipiler .iconized.iconized-p svg {\n    height: 1em; }\n  #hipiler .iconized svg {\n    width: 1em;\n    margin-right: 0.33rem; }\n  #hipiler .smaller {\n    font-size: 1rem; }\n  #hipiler ul.extra-padding li,\n  #hipiler ol.extra-padding li {\n    margin: 0.125rem 0;\n    padding: 0.25rem 0; }\n  #hipiler ul.is-columized li,\n  #hipiler ol.is-columized li {\n    display: inline-block;\n    width: 33%; }\n  #hipiler p.nm {\n    margin-bottom: 0; }\n  #hipiler .fade-in {\n    background: #fff;\n    background: -moz-linear-gradient(top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%);\n    /* FF3.6-15 */\n    background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%);\n    /* Chrome10-25,Safari5.1-6 */\n    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%);\n    /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */ }\n  #hipiler .fade-out {\n    background: #fff;\n    background: -moz-linear-gradient(top, rgba(255, 255, 255, 0.75) 0%, white 100%);\n    /* FF3.6-15 */\n    background: -webkit-linear-gradient(top, rgba(255, 255, 255, 0.75) 0%, white 100%);\n    /* Chrome10-25,Safari5.1-6 */\n    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.75) 0%, white 100%);\n    /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */ }\n  #hipiler .anchored {\n    position: relative; }\n  #hipiler .hidden-anchor {\n    position: absolute;\n    display: block;\n    top: 0;\n    left: -2rem;\n    bottom: 0;\n    width: 2.5rem;\n    padding: 0 1.5rem 0 0.25rem;\n    opacity: 0.33;\n    transform: scale(0);\n    transition: all 0.2s cubic-bezier(0.3, 0.1, 0.6, 1);\n    border-bottom: 0;\n    box-shadow: none !important;\n    cursor: pointer; }\n    #hipiler .hidden-anchor svg-icon {\n      width: 1.125rem;\n      height: 100%; }\n  #hipiler .anchored:hover .hidden-anchor,\n  #hipiler .anchored:target .hidden-anchor {\n    transform: scale(1); }\n  #hipiler .hidden-anchor:hover,\n  #hipiler .anchored:target .hidden-anchor {\n    opacity: 1; }\n  #hipiler .anchored:target {\n    color: #000; }\n    #hipiler .anchored:target.underlined::after {\n      position: absolute;\n      z-index: -1;\n      display: block;\n      top: 0;\n      left: -2rem;\n      border-bottom: 2px solid #ff5500;\n      background: rgba(255, 85, 0, 0.1); }\n    #hipiler .anchored:target .hidden-anchor {\n      width: 1.5rem;\n      color: #fff;\n      background: #ff5500; }\n  @media (min-width: 60rem) {\n    #hipiler .is-increased-font-size {\n      font-size: 1.125em; } }\n  @media (min-width: 64rem) {\n    #hipiler .is-slightly-increased-font-size {\n      font-size: 1.125em; }\n    #hipiler .is-increased-font-size {\n      font-size: 1.25em; } }\n  #hipiler #drag-drop-notifier,\n  #hipiler #global-error {\n    position: fixed;\n    z-index: -1;\n    font-size: 2em;\n    font-weight: bold;\n    text-transform: uppercase;\n    height: 0;\n    opacity: 0;\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  #hipiler #drag-drop-notifier {\n    color: #fff;\n    background: rgba(255, 85, 0, 0.75); }\n  #hipiler #global-error {\n    color: #770014;\n    background: rgba(255, 119, 141, 0.9); }\n  #hipiler .bottom-bar {\n    position: relative;\n    z-index: 2;\n    height: 2.5rem;\n    color: #999;\n    border-top: 1px solid #e5e5e5;\n    background: #fff;\n    transition: height 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .bottom-bar.is-expanded {\n      box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.1), 0 -1px 3px 0 rgba(0, 0, 0, 0.05); }\n    #hipiler .bottom-bar.is-expanded,\n    #hipiler .bottom-bar .settings-container {\n      height: 10rem; }\n    #hipiler .bottom-bar h4 {\n      margin: 0;\n      color: #444;\n      font-size: 0.85rem;\n      font-weight: 300;\n      text-transform: uppercase;\n      line-height: 2.5rem; }\n      #hipiler .bottom-bar h4:after {\n        content: ':';\n        margin-right: 0.75rem; }\n    #hipiler .bottom-bar .settings-row {\n      box-shadow: inset 0 1px 0 0 #e5e5e5; }\n      #hipiler .bottom-bar .settings-row:first-child {\n        box-shadow: none; }\n    #hipiler .bottom-bar .settings-list {\n      height: 2.5rem;\n      margin-bottom: 0; }\n      #hipiler .bottom-bar .settings-list > li {\n        margin-left: 1rem;\n        padding-top: 0.3rem;\n        padding-bottom: 0.3rem; }\n        #hipiler .bottom-bar .settings-list > li:first-child {\n          margin-left: 0; }\n        #hipiler .bottom-bar .settings-list > li.is-disabled {\n          position: relative; }\n          #hipiler .bottom-bar .settings-list > li.is-disabled::before {\n            content: '';\n            position: absolute;\n            display: block;\n            top: 1px;\n            right: 0;\n            left: 0;\n            bottom: 0;\n            background: rgba(255, 255, 255, 0.67); }\n      #hipiler .bottom-bar .settings-list.settings-list-buttons-only > li {\n        margin-left: 0.5rem; }\n        #hipiler .bottom-bar .settings-list.settings-list-buttons-only > li:first-child {\n          margin-left: 0.5rem; }\n        #hipiler .bottom-bar .settings-list.settings-list-buttons-only > li:last-child {\n          margin-right: 0.5rem; }\n      #hipiler .bottom-bar .settings-list label {\n        font-size: 0.7rem;\n        text-transform: uppercase;\n        margin-bottom: 0.125rem;\n        white-space: nowrap; }\n        #hipiler .bottom-bar .settings-list label .value.new em {\n          color: #ff5500; }\n        #hipiler .bottom-bar .settings-list label .value em {\n          font-style: normal; }\n    #hipiler .bottom-bar .button {\n      height: 1.9rem;\n      margin-top: 1px;\n      padding: 0 0.33rem;\n      color: #666;\n      font-size: 0.8rem;\n      line-height: 1.9rem;\n      background: transparent;\n      box-shadow: inset 0 0 0 1px #e5e5e5; }\n      #hipiler .bottom-bar .button:hover {\n        color: #ff5500;\n        box-shadow: inset 0 0 0 1px #ffddcc; }\n        #hipiler .bottom-bar .button:hover.is-filled {\n          box-shadow: none;\n          background: #ffddcc; }\n        #hipiler .bottom-bar .button:hover .button-info,\n        #hipiler .bottom-bar .button:hover.is-enabled .button-info {\n          background: #ff5500;\n          box-shadow: -1px 1px 0 0 #fff; }\n        #hipiler .bottom-bar .button:hover.is-disabled {\n          background: transparent;\n          box-shadow: inset 0 0 0 1px #e5e5e5; }\n          #hipiler .bottom-bar .button:hover.is-disabled .button-info {\n            background: rgba(153, 153, 153, 0.75);\n            box-shadow: -1px 1px 0 0 rgba(255, 255, 255, 0.75); }\n      #hipiler .bottom-bar .button.is-enabled .button-info {\n        background: rgba(0, 0, 0, 0.75); }\n      #hipiler .bottom-bar .button.is-disabled {\n        color: #bfbfbf;\n        cursor: not-allowed; }\n        #hipiler .bottom-bar .button.is-disabled:hover {\n          background: transparent; }\n      #hipiler .bottom-bar .button.is-active {\n        color: #ff5500;\n        background: #ffddcc;\n        box-shadow: inset 0 0 0 1px #ffddcc; }\n        #hipiler .bottom-bar .button.is-active .button-info {\n          background: #ff5500;\n          box-shadow: -1px 1px 0 0 #fff; }\n      #hipiler .bottom-bar .button.is-filled {\n        background: #e5e5e5;\n        box-shadow: none; }\n      #hipiler .bottom-bar .button svg-icon {\n        width: 1.125rem;\n        height: 1.9rem; }\n      #hipiler .bottom-bar .button .button-info {\n        position: absolute;\n        top: -0.125rem;\n        right: -0.125rem;\n        min-width: 1.25em;\n        height: 1.25em;\n        color: #fff;\n        font-size: 0.6rem;\n        line-height: 1.25em;\n        border-radius: 1.25em;\n        background: rgba(153, 153, 153, 0.75);\n        box-shadow: -1px 1px 0 0 rgba(255, 255, 255, 0.75);\n        transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n        #hipiler .bottom-bar .button .button-info.button-info-padded {\n          padding: 0.05rem 0.15rem; }\n    #hipiler .bottom-bar .button-group .button {\n      box-shadow: inset 0 -1px 0 0 #e5e5e5, inset 0 1px 0 0 #e5e5e5; }\n    #hipiler .bottom-bar .button-group .button {\n      border-radius: 0; }\n    #hipiler .bottom-bar .button-group .button:first-child {\n      border-radius: 0.25rem 0 0 0.25rem;\n      box-shadow: inset 0 0 0 1px #e5e5e5; }\n    #hipiler .bottom-bar .button-group .button:last-child {\n      border-radius: 0 0.25rem 0.25rem 0;\n      box-shadow: inset -1px 0 0 0 #e5e5e5, inset 0 -1px 0 0 #e5e5e5, inset 0 1px 0 0 #e5e5e5; }\n    #hipiler .bottom-bar .button-group .button:first-child:last-child {\n      border-radius: 0.25rem;\n      box-shadow: inset 0 0 0 1px #e5e5e5; }\n    #hipiler .bottom-bar .button-group .button.is-active,\n    #hipiler .bottom-bar .button-group .button.is-active:first-child,\n    #hipiler .bottom-bar .button-group .button.is-active:last-child,\n    #hipiler .bottom-bar .button-group .button.is-active:first-child:last-child {\n      box-shadow: inset 0 0 0 1px #ffddcc; }\n    #hipiler .bottom-bar .toggler {\n      width: 3rem;\n      cursor: pointer;\n      color: #999;\n      text-transform: uppercase;\n      background: #e5e5e5; }\n    #hipiler .bottom-bar .select-with-button {\n      padding: 1px 0.2rem;\n      font-size: 0.65rem;\n      border-radius: 0.25rem;\n      box-shadow: inset 0 0 0 1px #e5e5e5; }\n      #hipiler .bottom-bar .select-with-button label {\n        margin-bottom: 0; }\n      #hipiler .bottom-bar .select-with-button button {\n        margin: 0.2rem 0 0 0.2rem;\n        height: 1.5rem;\n        line-height: 1.5rem; }\n      #hipiler .bottom-bar .select-with-button svg-icon {\n        width: 0.75rem;\n        height: 1.5rem; }\n    #hipiler .bottom-bar .logo {\n      margin: 0.375rem 0.375rem 0 0; }\n      #hipiler .bottom-bar .logo svg {\n        width: 2rem;\n        height: 2rem; }\n    #hipiler .bottom-bar p {\n      font-size: 0.8rem;\n      line-height: 3rem; }\n    #hipiler .bottom-bar.footer-main p {\n      margin-top: 0;\n      font-size: 0.9rem;\n      color: #999; }\n    #hipiler .bottom-bar .logos a {\n      border-bottom: 0; }\n    #hipiler .bottom-bar .logo-vcg label {\n      margin-right: 0.25rem;\n      font-size: 0.65rem;\n      line-height: 1.125em;\n      cursor: inherit; }\n  #hipiler .is-dragging-over #drag-drop-notifier,\n  #hipiler .is-global-error #global-error {\n    z-index: 10;\n    height: 100%;\n    opacity: 1; }\n    #hipiler .is-dragging-over #drag-drop-notifier span,\n    #hipiler .is-global-error #global-error span {\n      transform: scale(1); }\n  #hipiler .is-dragging-over #drag-drop-notifier {\n    animation: pulsePrimary 1.5s cubic-bezier(0.3, 0.1, 0.6, 1) infinite; }\n    #hipiler .is-dragging-over #drag-drop-notifier span {\n      animation: pulseText 1.5s cubic-bezier(0.3, 0.1, 0.6, 1) infinite; }\n\n@keyframes pulsePrimary {\n  50% {\n    background: rgba(255, 85, 0, 0.75); }\n  60% {\n    background: rgba(255, 85, 0, 0.95); }\n  100% {\n    background: rgba(255, 85, 0, 0.75); } }\n\n@keyframes pulseText {\n  50% {\n    transform: scale(1); }\n  60% {\n    transform: scale(1.05); }\n  100% {\n    transform: scale(1); } }\n  #hipiler #topbar {\n    position: absolute;\n    z-index: 2;\n    top: 0;\n    left: 0;\n    right: 0;\n    height: 3rem;\n    padding: 0 0.5rem;\n    border-bottom: 1px solid #d9d9d9;\n    color: #999;\n    background: #fff;\n    line-height: 3rem; }\n    #hipiler #topbar h1 {\n      position: relative;\n      margin-top: 0;\n      font-weight: normal;\n      font-size: 1.5rem;\n      line-height: inherit; }\n      #hipiler #topbar h1 a {\n        border-bottom: 0; }\n      #hipiler #topbar h1.is-active::before {\n        position: absolute;\n        content: '';\n        right: 0;\n        bottom: 0;\n        left: 0;\n        height: 3px;\n        background: #ff5500; }\n      #hipiler #topbar h1.is-active a {\n        color: #000; }\n      #hipiler #topbar h1 .icon-inline {\n        margin-right: 0.25rem;\n        width: 2rem;\n        height: 3rem; }\n    #hipiler #topbar .icon-inline {\n      width: 1em;\n      height: 3rem; }\n      #hipiler #topbar .icon-inline.icon-help, #hipiler #topbar .icon-inline.icon-info {\n        margin-right: 0.25rem;\n        width: 1.25em; }\n      #hipiler #topbar .icon-inline svg {\n        width: 100%;\n        height: 100%; }\n    #hipiler #topbar .state {\n      margin: 0.5rem 0 0.5rem 0.5rem;\n      padding: 0 0.5rem;\n      cursor: pointer;\n      color: #666;\n      font-size: 0.8em;\n      text-transform: uppercase;\n      line-height: 2rem;\n      border: 0;\n      background: none;\n      transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      #hipiler #topbar .state:hover, #hipiler #topbar .state.state-active {\n        color: #ff5500; }\n      #hipiler #topbar .state:hover .reset svg {\n        -webkit-animation: spin 0.75s ease 1;\n        -moz-animation: spin 0.75s ease 1;\n        animation: spin 0.75s ease 1;\n        -webkit-transform-origin: 50% 50%;\n        -moz-transform-origin: 50% 50%;\n        transform-origin: 50% 50%; }\n\n@-moz-keyframes spin {\n  100% {\n    -moz-transform: rotate(360deg); } }\n\n@-webkit-keyframes spin {\n  100% {\n    -webkit-transform: rotate(360deg); } }\n\n@keyframes spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg); } }\n      #hipiler #topbar .state:hover .play-outline svg {\n        -webkit-animation: slide-out-in 0.66s ease 1;\n        -moz-animation: slide-out-in 0.66s ease 1;\n        animation: slide-out-in 0.66s ease 1;\n        -webkit-transform-origin: 50% 50%;\n        -moz-transform-origin: 50% 50%;\n        transform-origin: 50% 50%; }\n\n@-moz-keyframes slide-out-in {\n  0% {\n    -moz-transform: translateX(0);\n    opacity: 1; }\n  50% {\n    -moz-transform: translateX(75%);\n    opacity: 0; }\n  51% {\n    -moz-transform: translateX(-50%);\n    opacity: 0; }\n  100% {\n    -moz-transform: translateX(0);\n    opacity: 1; } }\n\n@-webkit-keyframes slide-out-in {\n  0% {\n    -webkit-transform: translateX(0);\n    opacity: 1; }\n  50% {\n    -webkit-transform: translateX(75%);\n    opacity: 0; }\n  51% {\n    -webkit-transform: translateX(-50%);\n    opacity: 0; }\n  100% {\n    -webkit-transform: translateX(0);\n    opacity: 1; } }\n\n@keyframes slide-out-in {\n  0% {\n    -webkit-transform: translateX(0);\n    transform: translateX(0);\n    opacity: 1; }\n  50% {\n    -webkit-transform: translateX(75%);\n    transform: translateX(75%);\n    opacity: 0; }\n  51% {\n    -webkit-transform: translateX(-50%);\n    transform: translateX(-50%);\n    opacity: 0; }\n  100% {\n    -webkit-transform: translateX(0);\n    transform: translateX(0);\n    opacity: 1; } }\n      #hipiler #topbar .state.state-indicator::after {\n        content: '';\n        margin: 0.75rem 0 0 0.25rem;\n        width: 0.5rem;\n        height: 0.5rem;\n        border-radius: 0.5rem;\n        background: #d9d9d9; }\n      #hipiler #topbar .state .icon-inline {\n        margin-right: 0.25rem; }\n        #hipiler #topbar .state .icon-inline svg {\n          height: 1.85rem; }\n  #hipiler #infobar {\n    position: absolute;\n    top: 3rem;\n    right: 0;\n    left: 0;\n    height: 3rem;\n    line-height: 3rem;\n    color: #666;\n    background: #d9d9d9; }\n    #hipiler #infobar a {\n      border-bottom-color: #bfbfbf; }\n      #hipiler #infobar a:hover {\n        border-bottom-color: #ff5500; }\n  #hipiler #main {\n    position: absolute;\n    top: 3rem;\n    right: 0;\n    bottom: 0;\n    left: 0;\n    padding: .5rem;\n    background: #fff; }\n  #hipiler #infobar + #main {\n    top: 6rem; }\n  #hipiler #topbar,\n  #hipiler #main {\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  #hipiler .sticky {\n    transition: padding-top 0.33s cubic-bezier(0.3, 0, 0, 1); }\n  #hipiler .primary-nav {\n    text-transform: uppercase;\n    line-height: 3.25rem; }\n    #hipiler .primary-nav li {\n      position: relative;\n      margin: 0 0.25rem; }\n      #hipiler .primary-nav li.is-active::before {\n        position: absolute;\n        content: '';\n        right: 0;\n        bottom: 0;\n        left: 0;\n        height: 3px;\n        background: #ff5500; }\n      #hipiler .primary-nav li.is-active a {\n        color: #000; }\n      #hipiler .primary-nav li:last-child {\n        padding-right: 0;\n        margin-right: 0; }\n    #hipiler .primary-nav a {\n      height: 3rem;\n      padding: 0 0.25rem;\n      border-bottom: 0; }\n    #hipiler .primary-nav svg-icon {\n      height: 100%;\n      padding: 0 0.125rem; }\n    #hipiler .primary-nav svg {\n      width: 100%;\n      height: 100%; }\n    #hipiler .primary-nav .is-icon-only {\n      width: 2.5rem;\n      height: 3rem;\n      padding: 0 0.5rem; }\n      #hipiler .primary-nav .is-icon-only a {\n        display: block; }\n    #hipiler .primary-nav .is-left-separated {\n      position: relative;\n      margin-left: 0.25rem; }\n      #hipiler .primary-nav .is-left-separated::before {\n        position: absolute;\n        content: '';\n        top: 0.25rem;\n        left: 0;\n        bottom: 0.25rem;\n        width: 1px;\n        background: #d9d9d9; }\n  #hipiler .home .bg {\n    position: fixed;\n    background-image: url(\"assets/images/home-bg.png\");\n    background-size: cover;\n    z-index: -1; }\n  #hipiler .home main,\n  #hipiler .home footer-main {\n    z-index: 1; }\n  #hipiler .home footer-main {\n    margin: 0 -0.5rem -0.5rem -0.5rem; }\n    #hipiler .home footer-main .bottom-bar {\n      height: 3rem;\n      padding: 0 0.5rem 0.5rem 0.5rem;\n      background: rgba(255, 255, 255, 0.75); }\n  #hipiler .home .wrap-extra {\n    max-width: 45rem;\n    margin: 0 auto; }\n  #hipiler .home h2 {\n    margin-top: 1rem;\n    font-size: 3rem;\n    line-height: 1.25em; }\n  #hipiler .home .columns > * {\n    margin: 0 1rem; }\n    #hipiler .home .columns > *:first-child {\n      margin-left: 0; }\n    #hipiler .home .columns > *:last-child {\n      margin-right: 0; }\n  #hipiler .home p {\n    margin-bottom: 0; }\n  #hipiler .home .box {\n    position: relative;\n    margin: 0.5rem 0;\n    padding: 1rem;\n    font-size: 1rem;\n    border-radius: 0.25rem;\n    background: #e5e5e5; }\n    #hipiler .home .box:first-child {\n      margin-top: 1rem; }\n  #hipiler .home .box-drop:after {\n    position: absolute;\n    content: '';\n    top: 0.25rem;\n    right: 0.25rem;\n    bottom: 0.25rem;\n    left: 0.25rem;\n    border: 2px dashed #fff;\n    border-radius: 0.125rem; }\n  #hipiler .home .box-select {\n    transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .home .box-select:hover {\n      color: #ff5500;\n      cursor: pointer;\n      background: #ffddcc; }\n    #hipiler .home .box-select svg,\n    #hipiler .home .box-select svg-icon {\n      width: 1.25rem;\n      height: 1.25rem;\n      color: #fff; }\n    #hipiler .home .box-select input {\n      display: none; }\n  #hipiler .home .box-demo ul {\n    margin: 0.5rem 0 0 0; }\n  #hipiler .home .box-demo li {\n    padding: 0.5rem;\n    transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .home .box-demo li:nth-child(odd) {\n      background: #f2f2f2; }\n      #hipiler .home .box-demo li:nth-child(odd):hover {\n        background: #ffddcc; }\n    #hipiler .home .box-demo li:hover {\n      color: #ff5500;\n      cursor: pointer;\n      background: #ffddcc;\n      box-shadow: -2px 0 0 0 #ff5500; }\n    #hipiler .home .box-demo li:hover,\n    #hipiler .home .box-demo li:hover .demo-data,\n    #hipiler .home .box-demo li:hover .demo-title {\n      color: #ff5500; }\n  #hipiler .home .box-demo .demo-title {\n    margin-bottom: 0.25em; }\n  #hipiler .home .box-demo .demo-data {\n    font-size: 0.85em;\n    color: #999; }\n    #hipiler .home .box-demo .demo-data svg {\n      width: 1em;\n      height: 1em;\n      margin-right: 0.25em; }\n  #hipiler .about .bg-video {\n    position: absolute;\n    z-index: 0;\n    top: 0;\n    right: 0;\n    left: 0;\n    height: 80%;\n    background: #fff;\n    overflow: hidden; }\n    #hipiler .about .bg-video .fade-out {\n      z-index: 1; }\n    #hipiler .about .bg-video video {\n      z-index: 0;\n      /* Make video to at least 100% wide and tall */\n      min-width: 100%;\n      min-height: 100%;\n      /* Setting width & height to auto prevents the browser from stretching or squishing the video */\n      width: auto;\n      height: auto;\n      /* Center the video */\n      position: absolute;\n      top: 50%;\n      left: 50%;\n      transform: translate(-50%, -50%); }\n  #hipiler .about main {\n    position: relative;\n    z-index: 1; }\n    #hipiler .about main > *:last-child {\n      margin-bottom: 4rem; }\n  #hipiler .about main > p:first-child {\n    margin: 4rem 4rem 2rem 4rem;\n    color: #000; }\n  #hipiler .about h2 {\n    margin: 2em 0 0.66em 0;\n    border-bottom: 1px solid #e5e5e5; }\n  #hipiler .about .hidden-anchor svg-icon svg {\n    width: 100%;\n    height: 100%; }\n  #hipiler .about .publication-title,\n  #hipiler .about #author-list h3 {\n    margin-bottom: 0.5rem;\n    font-size: 1em; }\n    #hipiler .about .publication-title a,\n    #hipiler .about #author-list h3 a {\n      font-weight: 500; }\n  #hipiler .about .publication-authors {\n    margin-bottom: 0.5rem; }\n  #hipiler .about .publication-journal,\n  #hipiler .about #author-list ul {\n    color: #999;\n    font-size: 1.125rem; }\n  #hipiler .about #author-list h3 + p {\n    margin-bottom: 0.25rem; }\n  #hipiler .about #author-list li {\n    margin-right: 1rem; }\n  #hipiler .about #youtube {\n    position: relative; }\n    #hipiler .about #youtube:before {\n      display: block;\n      content: \"\";\n      width: 100%;\n      padding-top: 62.6%; }\n    #hipiler .about #youtube > .content {\n      position: absolute;\n      top: 0;\n      left: 0;\n      right: 0;\n      bottom: 0; }\n  @media (min-width: 64rem) {\n    #hipiler .about main > p:first-child {\n      margin-top: 12rem; } }\n  #hipiler pre,\n  #hipiler code {\n    padding: 0 0.125rem;\n    font-family: 'Roboto Mono', monospace;\n    background: #f3f3f3; }\n  #hipiler code {\n    font-size: 0.8em; }\n  #hipiler pre {\n    max-height: 30em;\n    overflow-x: scroll;\n    padding: 0.25rem;\n    font-size: 0.85em;\n    line-height: 1.5em; }\n  #hipiler .wiki-page {\n    position: relative; }\n    #hipiler .wiki-page:first-child {\n      border-top: 0; }\n    #hipiler .wiki-page h1 {\n      display: block;\n      margin: 4rem 0 1rem;\n      padding: 0;\n      text-transform: uppercase;\n      border-bottom: 2px solid #f3f3f3; }\n      #hipiler .wiki-page h1:hover {\n        color: #000; }\n      #hipiler .wiki-page h1 .hidden-anchor > .icon {\n        height: 3rem; }\n    #hipiler .wiki-page:first-child h1 {\n      margin-top: 2rem; }\n    #hipiler .wiki-page h2, #hipiler .wiki-page h3, #hipiler .wiki-page h4 {\n      margin: 1em 0 0.5em; }\n    #hipiler .wiki-page h2 {\n      font-size: 1.5em;\n      line-height: 1.5em; }\n    #hipiler .wiki-page h3 {\n      font-size: 1.25em; }\n    #hipiler .wiki-page h4 {\n      font-size: 1em;\n      font-weight: 500;\n      color: #000; }\n    #hipiler .wiki-page *:last-child {\n      margin-bottom: 1rem; }\n    #hipiler .wiki-page table {\n      margin-bottom: 0.5rem;\n      font-size: 0.85em;\n      border-collapse: collapse; }\n      #hipiler .wiki-page table th {\n        font-weight: bold; }\n      #hipiler .wiki-page table td, #hipiler .wiki-page table th {\n        padding: 0.25rem;\n        border: 1px solid #e5e5e5; }\n      #hipiler .wiki-page table tr:nth-child(even) td {\n        background: #f3f3f3; }\n    #hipiler .wiki-page li {\n      margin-left: 1.5rem;\n      list-style-type: disc; }\n  #hipiler .sidebar {\n    margin: 2rem 0 0 2rem;\n    padding: 0.75rem;\n    font-size: 0.95rem;\n    border: 1px solid #e5e5e5;\n    border-radius: 0.25rem; }\n    #hipiler .sidebar p {\n      margin: 1.5rem 0 0.25rem; }\n      #hipiler .sidebar p:first-child {\n        margin-top: 0; }\n      #hipiler .sidebar p:last-child {\n        margin-bottom: 0; }\n    #hipiler .sidebar strong,\n    #hipiler .sidebar strong * {\n      font-weight: 500; }\n    #hipiler .sidebar li {\n      margin-left: 1.5rem;\n      list-style-type: disc; }\n  #hipiler .matrix-view,\n  #hipiler .fragments-view,\n  #hipiler .stats-view {\n    min-width: 3rem;\n    padding: 0 0.5rem; }\n    #hipiler .matrix-view.is-transitionable,\n    #hipiler .fragments-view.is-transitionable,\n    #hipiler .stats-view.is-transitionable {\n      transition: flex-basis 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  #hipiler #view-matrix {\n    flex-basis: 40%;\n    min-width: 2.5rem;\n    padding-left: 0; }\n  #hipiler #view-fragments {\n    flex-grow: 1;\n    border-left: 1px solid #d9d9d9; }\n  #hipiler #view-details {\n    display: none;\n    flex-basis: 20rem;\n    border-left: 1px solid #d9d9d9;\n    min-width: 2.5rem;\n    padding-right: 0; }\n  #hipiler .column-resizer {\n    position: absolute;\n    z-index: 5;\n    top: 0;\n    left: -0.25rem;\n    display: block;\n    width: 0.5rem;\n    height: 2rem;\n    background: #d9d9d9;\n    transform: translateX(0);\n    transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), width 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .column-resizer:hover, #hipiler .column-resizer:active, #hipiler .column-resizer:focus {\n      transform: translateX(-0.25rem);\n      width: 1rem; }\n  #hipiler .is-col-drag-fragments .fragments-view .column-resizer,\n  #hipiler .is-col-drag-stats .stats-view .column-resizer {\n    transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1);\n    width: 1rem; }\n  #hipiler .is-col-drag-fragments-highlight .fragments-view .column-resizer,\n  #hipiler .is-col-drag-stats-highlight .stats-view .column-resizer {\n    background: #ff5500;\n    width: 1rem; }\n    #hipiler .is-col-drag-fragments-highlight .fragments-view .column-resizer:hover, #hipiler .is-col-drag-fragments-highlight .fragments-view .column-resizer:active, #hipiler .is-col-drag-fragments-highlight .fragments-view .column-resizer:focus,\n    #hipiler .is-col-drag-stats-highlight .stats-view .column-resizer:hover,\n    #hipiler .is-col-drag-stats-highlight .stats-view .column-resizer:active,\n    #hipiler .is-col-drag-stats-highlight .stats-view .column-resizer:focus {\n      transform: none; }\n  #hipiler .drag-indicator {\n    position: absolute;\n    z-index: 4;\n    top: 0;\n    left: 0;\n    bottom: 0;\n    width: 1px;\n    background: #ff5500;\n    opacity: 0;\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  #hipiler .is-col-drag-fragments .fragments-view .drag-indicator,\n  #hipiler .is-col-drag-stats .stats-view .drag-indicator {\n    opacity: 1; }\n  #hipiler .column-content .error-indicator,\n  #hipiler .column-content .loading-indicator {\n    height: 0;\n    overflow: hidden;\n    opacity: 0;\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .column-content .error-indicator.is-active,\n    #hipiler .column-content .loading-indicator.is-active {\n      height: 100%;\n      opacity: 1; }\n    #hipiler .column-content .error-indicator svg,\n    #hipiler .column-content .loading-indicator svg {\n      width: 3rem;\n      height: 3rem; }\n  #hipiler .column-content .error-indicator {\n    z-index: 3;\n    color: #770014;\n    background: rgba(255, 119, 141, 0.8); }\n  #hipiler .column-content .loading-indicator {\n    z-index: 1;\n    background: rgba(255, 255, 255, 0.67); }\n    #hipiler .column-content .loading-indicator svg circle {\n      stroke: #bfbfbf; }\n    #hipiler .column-content .loading-indicator svg .one,\n    #hipiler .column-content .loading-indicator svg .two {\n      fill: #fff; }\n  #hipiler .column-header {\n    z-index: 2;\n    height: 2rem; }\n    #hipiler .column-header:hover h2 {\n      margin-top: -2rem; }\n    #hipiler .column-header h2 {\n      margin: 0; }\n    #hipiler .column-header h2 {\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      position: absolute;\n      z-index: 1;\n      top: 0;\n      right: 0;\n      left: 0;\n      height: 2rem;\n      min-width: 2rem;\n      font-size: 1rem;\n      line-height: 2rem;\n      color: #d9d9d9;\n      font-weight: 300;\n      text-transform: uppercase;\n      background: #fff;\n      transition: margin 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    #hipiler .column-header button {\n      min-width: 2rem;\n      height: 2rem;\n      color: #999;\n      border: none;\n      background: none;\n      transition: color 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n      #hipiler .column-header button:hover {\n        color: #000;\n        background: #d9d9d9; }\n    #hipiler .column-header .controls {\n      position: absolute;\n      top: 0;\n      right: 0;\n      left: 0;\n      height: 2rem;\n      min-width: 2rem;\n      margin: 0; }\n      #hipiler .column-header .controls li {\n        margin-left: 0.5rem; }\n        #hipiler .column-header .controls li:first-child {\n          margin-left: 0; }\n      #hipiler .column-header .controls button svg {\n        width: 1.5rem;\n        height: 1.5rem;\n        padding: 0.25rem; }\n      #hipiler .column-header .controls button span {\n        font-size: 0.9rem;\n        line-height: 1.5rem; }\n  #hipiler .bottom-bar.is-expanded,\n  #hipiler .bottom-bar .settings-container {\n    height: 15rem; }\n  #hipiler .bottom-bar multi-select {\n    margin-top: 0.3rem;\n    font-size: 0.9rem; }\n    #hipiler .bottom-bar multi-select input {\n      padding: 0;\n      font-size: 0.9rem;\n      line-height: 1.9rem; }\n    #hipiler .bottom-bar multi-select .options.bottom-up {\n      bottom: 2rem;\n      margin-bottom: -1px; }\n  #hipiler .bottom-bar .settings-row > button {\n    margin: 0.3rem 0.5rem; }\n  #hipiler higlass {\n    display: block;\n    margin-top: -2rem;\n    padding-top: 2rem; }\n    #hipiler higlass .genome-position-search .input-group {\n      display: flex; }\n      #hipiler higlass .genome-position-search .input-group div:first-child {\n        flex-grow: 1; }\n    #hipiler higlass .genome-position-search .search-bar:focus {\n      outline: 0; }\n    #hipiler higlass .genome-position-search .btn {\n      width: 30px;\n      height: 30px; }\n      #hipiler higlass .genome-position-search .btn::before {\n        content: 'Go'; }\n      #hipiler higlass .genome-position-search .btn.btn-sm {\n        padding: 5px; }\n  #hipiler .matrix-full-screen-view higlass {\n    margin-top: 0;\n    padding-top: 0; }\n  #hipiler fragments {\n    display: block;\n    margin-top: -2rem;\n    padding-top: 2rem; }\n    #hipiler fragments .fragment-plot.is-piles-inspection {\n      box-shadow: inset 0 0 0 0.25rem #ffddcc; }\n"; });
define('text!assets/styles/multi-select.css', ['module'], function(module) { module.exports = "@charset \"UTF-8\";\nmulti-select {\n  position: relative;\n  display: block;\n  font-size: 0.8rem; }\n  multi-select input {\n    margin-left: 0.25rem;\n    width: 6rem;\n    padding: 0.125rem 0;\n    background: transparent; }\n    multi-select input:active, multi-select input:focus {\n      outline: none; }\n  multi-select > div {\n    border-radius: 0 0 0.125rem 0.125rem;\n    box-shadow: 0 0 0 1px rgba(217, 217, 217, 0);\n    transition: box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    multi-select > div.is-active {\n      box-shadow: 0 0 0 1px #d9d9d9; }\n    multi-select > div.is-disabled {\n      opacity: 0.5; }\n  multi-select > div.is-in-use input {\n    width: 2rem; }\n  multi-select .options {\n    position: absolute;\n    left: 0;\n    right: 0;\n    top: 0;\n    margin: 0;\n    height: 0;\n    opacity: 0;\n    background: #fff;\n    overflow: hidden;\n    border-radius: 0.125rem 0.125rem 0 0;\n    box-shadow: 0 0 0 1px rgba(153, 153, 153, 0);\n    transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), box-shadow 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n    multi-select .options.bottom-up {\n      top: auto;\n      bottom: 0.3rem; }\n    multi-select .options.is-active {\n      height: auto;\n      opacity: 1;\n      overflow: visible; }\n    multi-select .options > li {\n      padding-left: 0.25rem;\n      line-height: 1.5rem;\n      border-top: 1px solid #e5e5e5; }\n      multi-select .options > li:first-child {\n        border-top: 0; }\n      multi-select .options > li:hover {\n        cursor: pointer; }\n      multi-select .options > li:hover, multi-select .options > li.is-focus, multi-select .options > li.is-selected {\n        color: #000;\n        border-top-color: #fff; }\n      multi-select .options > li:hover, multi-select .options > li.is-focus, multi-select .options > li.is-focus.is-selected {\n        background: #ff5500; }\n      multi-select .options > li.is-selected {\n        font-weight: bold;\n        background: #e5e5e5; }\n        multi-select .options > li.is-selected:after {\n          content: '✓';\n          margin-left: 0.25rem; }\n  multi-select > div.is-active .options {\n    box-shadow: 0 0 0 1px #d9d9d9; }\n  multi-select .options-selected {\n    margin: 0.2rem 0;\n    line-height: 1.5rem; }\n    multi-select .options-selected > li {\n      margin-left: 0.25rem;\n      border-radius: 0.125rem;\n      background: #e5e5e5; }\n    multi-select .options-selected span {\n      color: #666;\n      padding-left: 0.25rem; }\n    multi-select .options-selected button {\n      width: 1rem;\n      color: #999;\n      font-size: 1rem;\n      background: none; }\n      multi-select .options-selected button svg-icon,\n      multi-select .options-selected button svg-icon > svg {\n        width: 1rem;\n        height: 1rem; }\n      multi-select .options-selected button svg-icon > svg {\n        padding: 0.25rem; }\n"; });
define('text!assets/styles/navigation.css', ['module'], function(module) { module.exports = ".primary-nav {\n  text-transform: uppercase;\n  line-height: 3.25rem; }\n  .primary-nav li {\n    position: relative;\n    margin: 0 0.25rem; }\n    .primary-nav li.is-active::before {\n      position: absolute;\n      content: '';\n      right: 0;\n      bottom: 0;\n      left: 0;\n      height: 3px;\n      background: #ff5500; }\n    .primary-nav li.is-active a {\n      color: #000; }\n    .primary-nav li:last-child {\n      padding-right: 0;\n      margin-right: 0; }\n  .primary-nav a {\n    height: 3rem;\n    padding: 0 0.25rem;\n    border-bottom: 0; }\n  .primary-nav svg-icon {\n    height: 100%;\n    padding: 0 0.125rem; }\n  .primary-nav svg {\n    width: 100%;\n    height: 100%; }\n  .primary-nav .is-icon-only {\n    width: 2.5rem;\n    height: 3rem;\n    padding: 0 0.5rem; }\n    .primary-nav .is-icon-only a {\n      display: block; }\n  .primary-nav .is-left-separated {\n    position: relative;\n    margin-left: 0.25rem; }\n    .primary-nav .is-left-separated::before {\n      position: absolute;\n      content: '';\n      top: 0.25rem;\n      left: 0;\n      bottom: 0.25rem;\n      width: 1px;\n      background: #d9d9d9; }\n"; });
define('text!assets/styles/pile-context-menu.css', ['module'], function(module) { module.exports = ".pile-context-menu {\n  position: fixed;\n  z-index: 99;\n  opacity: 0;\n  font-family: 'Rubik', sans-serif;\n  font-size: 0.8rem;\n  transform: scale(0);\n  transform-origin: right top;\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .pile-context-menu.is-active {\n    opacity: 1;\n    transform: scale(1); }\n  .pile-context-menu.is-align-left button {\n    text-align: left; }\n  .pile-context-menu.is-bottom-up {\n    transform-origin: right bottom; }\n    .pile-context-menu.is-bottom-up ul {\n      transform: translateY(0); }\n  .pile-context-menu .is-multiple {\n    text-align: center; }\n  .pile-context-menu ul {\n    padding: 0.125rem;\n    background: rgba(255, 255, 255, 0.95);\n    border-radius: 0.25rem;\n    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 2px 6px 0 rgba(0, 0, 0, 0.05);\n    transform: translateY(-50%); }\n  .pile-context-menu button {\n    margin: 1px 0;\n    padding: 0.125rem 0.25rem;\n    font: inherit;\n    text-align: right;\n    background: transparent; }\n    .pile-context-menu button:hover {\n      background: #e5e5e5; }\n    .pile-context-menu button:active {\n      color: #000;\n      background: #ff5500; }\n  .pile-context-menu li.is-active button,\n  .pile-context-menu li.is-active button:hover,\n  .pile-context-menu li.is-active button:active {\n    color: #ff5500;\n    background: #ffddcc; }\n  .pile-context-menu label {\n    color: #999;\n    text-align: right; }\n    .pile-context-menu label:after {\n      content: ':'; }\n  .pile-context-menu .separator {\n    margin: 0.25rem -0.125rem;\n    height: 1px;\n    background: #e5e5e5; }\n  .pile-context-menu li:first-child .separator,\n  .pile-context-menu li:last-child .separator {\n    display: none; }\n"; });
define('text!assets/styles/range.css', ['module'], function(module) { module.exports = "input[type=range] {\n  -webkit-appearance: none;\n  margin: 0;\n  width: 100%; }\n\ninput[type=range]:focus {\n  outline: none; }\n\ninput[type=range]::-webkit-slider-runnable-track {\n  width: 100%;\n  height: 1rem;\n  cursor: pointer;\n  background: #d9d9d9;\n  border: 0;\n  box-shadow: inset 0 0.375rem 0 0 #fff, inset 0 -0.375rem 0 0 #fff; }\n\ninput[type=range]::-webkit-slider-thumb {\n  height: 1rem;\n  width: 0.25rem;\n  background: #999;\n  cursor: pointer;\n  -webkit-appearance: none;\n  border: 0;\n  transition: transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  input[type=range]::-webkit-slider-thumb:active, input[type=range]::-webkit-slider-thumb:focus, input[type=range]::-webkit-slider-thumb:hover {\n    background: #000;\n    transform: scaleX(1.5); }\n\ninput[type=range]:hover::-webkit-slider-thumb {\n  background: #000; }\n\ninput[type=range]:focus::-webkit-slider-runnable-track {\n  background: #d9d9d9; }\n\ninput[type=range]::-moz-range-track {\n  width: 100%;\n  height: 1rem;\n  cursor: pointer;\n  border: 0;\n  background: #d9d9d9;\n  box-shadow: inset 0 0.375rem 0 0 #fff, inset 0 -0.375rem 0 0 #fff; }\n\ninput[type=range]::-moz-range-thumb {\n  border: 0;\n  height: 2rem;\n  width: 0.25rem;\n  background: #999;\n  cursor: pointer; }\n\ninput[type=range]::-ms-track {\n  width: 100%;\n  height: 0.25rem;\n  cursor: pointer;\n  background: transparent;\n  border-color: transparent;\n  color: transparent;\n  border: 0; }\n\ninput[type=range]::-ms-fill-lower {\n  background: #d9d9d9; }\n\ninput[type=range]::-ms-fill-upper {\n  background: #d9d9d9; }\n\ninput[type=range]::-ms-thumb {\n  border: 0;\n  height: 2rem;\n  width: 0.25rem;\n  background: #999;\n  cursor: pointer; }\n\ninput[type=range]:focus::-ms-fill-lower {\n  background: #d9d9d9; }\n\ninput[type=range]:focus::-ms-fill-upper {\n  background: #d9d9d9; }\n"; });
define('text!assets/styles/svg-icon.css', ['module'], function(module) { module.exports = "svg-icon {\n  display: block; }\n  svg-icon svg {\n    width: 100%;\n    height: 100%; }\n"; });
define('text!assets/styles/transitions.css', ['module'], function(module) { module.exports = ""; });
define('text!assets/styles/mixins/ratio.css', ['module'], function(module) { module.exports = ""; });
define('text!assets/styles/mixins/rotate.css', ['module'], function(module) { module.exports = ""; });
define('text!assets/styles/mixins/slide-out-in.css', ['module'], function(module) { module.exports = ""; });
define('text!assets/styles/mixins/truncate.css', ['module'], function(module) { module.exports = ""; });
//# sourceMappingURL=app-bundle.js.map