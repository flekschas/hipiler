define('app',['exports', 'aurelia-framework', 'aurelia-event-aggregator', 'services/font', 'services/states', 'configs/app', 'utils/drag-drop', 'utils/read-json-file'], function (exports, _aureliaFramework, _aureliaEventAggregator, _font, _states, _app, _dragDrop, _readJsonFile) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.App = undefined;

  var _font2 = _interopRequireDefault(_font);

  var _states2 = _interopRequireDefault(_states);

  var _dragDrop2 = _interopRequireDefault(_dragDrop);

  var _readJsonFile2 = _interopRequireDefault(_readJsonFile);

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

  var logger = _aureliaFramework.LogManager.getLogger('decompose');

  var App = exports.App = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator, _font2.default, _states2.default), _dec(_class = function () {
    function App(eventAggregator, font, states) {
      _classCallCheck(this, App);

      this.events = eventAggregator;
      this.font = font;
      this.states = states;
      this.undo = states.undo.bind(states);
      this.redo = states.redo.bind(states);
    }

    App.prototype.attached = function attached() {
      var _this = this;

      this.font.size = parseInt(window.getComputedStyle(document.body, null).getPropertyValue('font-size').slice(0, -2), 10);

      (0, _dragDrop2.default)(document.body, function (event) {
        var results = void 0;

        try {
          results = (0, _readJsonFile2.default)(event.dataTransfer.files[0]);
        } catch (e) {
          logger.error(e);
        }

        results.then(function (json) {
          return _this.updateState(json);
        }).catch(function (error) {
          return logger.error(error);
        });
      });

      document.addEventListener('keydown', this.keyDownHandler.bind(this));
    };

    App.prototype.configureRouter = function configureRouter(config, router) {
      this.router = router;

      config.map(_app.routes);
    };

    App.prototype.keyDownHandler = function keyDownHandler(event) {
      if (event.keyCode === 90 && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.undo();
      }

      if (event.keyCode === 89 && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.redo();
      }
    };

    App.prototype.mouseUpHandler = function mouseUpHandler(event) {
      this.events.publish('app.mouseUp', event);
    };

    App.prototype.mouseMoveHandler = function mouseMoveHandler(event) {
      this.events.publish('app.mouseMove', event);
    };

    App.prototype.updateState = function updateState(json) {
      logger.debug('ass', json);
    };

    return App;
  }()) || _class);
});
define('app.reducer',['exports', 'redux', 'views/decompose.reducers'], function (exports, _redux, _decompose) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _decompose2 = _interopRequireDefault(_decompose);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  exports.default = (0, _redux.combineReducers)({
    decompose: _decompose2.default
  });
});
define('config',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = {
    env: 'dev'
  };
});
define('environment',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = {
    debug: true,
    testing: true
  };
});
define('main',['exports', 'configs/app', 'config'], function (exports, _app, _config) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.configure = configure;

  var _config2 = _interopRequireDefault(_config);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  Promise.config({
    warnings: {
      wForgottenReturn: false
    }
  });

  function configure(aurelia) {
    aurelia.use.standardConfiguration().feature('resources');

    if (_app.environments[_config2.default.env].debug) {
      aurelia.use.developmentLogging();
    }

    if (_app.environments[_config2.default.env].testing) {
      aurelia.use.plugin('aurelia-testing');
    }

    aurelia.start().then(function () {
      return aurelia.setRoot();
    });
  }
});
define('components/dragable-button',['exports', 'aurelia-framework'], function (exports, _aureliaFramework) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DraggableButton = undefined;

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

  var _dec, _dec2, _desc, _value, _class, _descriptor, _descriptor2;

  var DraggableButton = exports.DraggableButton = (_dec = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), _dec2 = (0, _aureliaFramework.bindable)({ defaultBindingMode: _aureliaFramework.bindingMode.oneWay }), (_class = function () {
    function DraggableButton() {
      _classCallCheck(this, DraggableButton);

      _initDefineProp(this, 'horizontalOnly', _descriptor, this);

      _initDefineProp(this, 'verticalOnly', _descriptor2, this);

      console.log('Oh yes girl', horizontalOnly, verticalOnly);
    }

    DraggableButton.prototype.mouseDownHandler = function mouseDownHandler(el) {
      console.log('mouse down', el);
    };

    DraggableButton.prototype.mouseUpHandler = function mouseUpHandler(el) {
      console.log('mouse up', el);
    };

    DraggableButton.prototype.mouseMoveHandler = function mouseMoveHandler(el) {
      console.log('mouse move', el);
    };

    return DraggableButton;
  }(), (_descriptor = _applyDecoratedDescriptor(_class.prototype, 'horizontalOnly', [_dec], {
    enumerable: true,
    initializer: function initializer() {
      return false;
    }
  }), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, 'verticalOnly', [_dec2], {
    enumerable: true,
    initializer: function initializer() {
      return false;
    }
  })), _class));
});
define('configs/app',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var environments = exports.environments = {
    dev: {
      debug: true,
      testing: true
    },
    prod: {
      debug: false,
      testing: false
    }
  };

  var routes = exports.routes = [{
    route: ['', 'home'],
    name: 'home',
    title: 'Home',
    moduleId: 'views/home',
    nav: true,
    showIcon: true,
    iconId: 'home'
  }, {
    route: 'about',
    name: 'about',
    title: 'About',
    moduleId: 'views/about',
    nav: true
  }, {
    route: 'decompose',
    name: 'decompose',
    title: 'Decompose',
    moduleId: 'views/decompose',
    nav: true
  }];
});
define('configs/decompose',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var views = exports.views = {
    matrix: {
      flexGrow: 1
    },
    pattern: {
      flexGrow: 2
    },
    stats: {
      width: 20
    }
  };
});
define('models/column',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

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

  var DEFAULT = {
    width: 1,
    widthUnit: '',
    isFlexGrow: true
  };

  var Column = exports.Column = function Column() {
    _classCallCheck(this, Column);

    Object.assign(this, DEFAULT);
  };

  var UPDATE_WIDTH = 'UPDATE';

  var updateText = function updateText(number) {
    return {
      type: UPDATE_WIDTH,
      number: number
    };
  };

  function textUpdater() {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _extends({}, DEFAULT);
    var action = arguments[1];

    switch (action.type) {
      case UPDATE_WIDTH:
        return {
          raw: action.text,
          html: marked(action.text)
        };
      default:
        return state;
    }
  }
});
define('resources/index',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.configure = configure;
  function configure(config) {}
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
define('services/states',['exports', 'redux', 'redux-undo', 'app.reducer'], function (exports, _redux, _reduxUndo, _app) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;

  var _reduxUndo2 = _interopRequireDefault(_reduxUndo);

  var _app2 = _interopRequireDefault(_app);

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

  var States = function () {
    function States() {
      _classCallCheck(this, States);

      this.store = (0, _redux.createStore)((0, _reduxUndo2.default)(_app2.default));
    }

    States.prototype.undo = function undo() {
      this.store.dispatch(_reduxUndo.ActionCreators.undo());
    };

    States.prototype.redo = function redo() {
      this.store.dispatch(_reduxUndo.ActionCreators.redo());
    };

    return States;
  }();

  exports.default = States;
});
define('utils/dom-el',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var DomEl = function () {
    function DomEl(el) {
      _classCallCheck(this, DomEl);

      this.node = el;
    }

    DomEl.prototype.addClass = function addClass(className) {
      if (this.hasClass(className) >= 0) {
        var space = this.node.className.length > 0 ? ' ' : '';

        this.node.className += '' + space + className;
      }
    };

    DomEl.prototype.hasClass = function hasClass(className, pos) {
      var re = new RegExp('\\s?' + className + '\\s?');

      var results = this.node.className.match(re);

      if (results) {
        return pos ? { index: results.index, match: results[0] } : true;
      }

      return pos ? -1 : false;
    };

    DomEl.prototype.removeClass = function removeClass(className) {
      var re = this.hasClass(className, true);

      if (re.index >= 0) {
        this.node.className = this.node.className.substr(0, re.index) + ' ' + this.node.className.substr(re.index + re.match.length);
      }
    };

    return DomEl;
  }();

  exports.default = DomEl;
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

  function dragDrop(el, dropCallback) {
    var $el = new _domEl2.default(el);

    document.addEventListener('dragenter', function (event) {
      if ((0, _hasParent2.default)(event.target, el)) {
        $el.addClass('is-dragging-over');
      }
    });

    document.addEventListener('dragover', function (event) {
      event.preventDefault();
    });

    document.addEventListener('dragleave', function () {
      $el.removeClass('is-dragging-over');
    });

    document.addEventListener('drop', function (event) {
      event.preventDefault();

      if ((0, _hasParent2.default)(event.target, el)) {
        dropCallback(event);
      }

      $el.removeClass('is-dragging-over');
    }, false);
  }
});
define('utils/has-parent',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  exports.default = function (el, target) {
    var _el = el;

    while (_el !== target && _el.tagname !== 'HTML') {
      _el = _el.parentNode;
    }

    if (_el === target) {
      return true;
    }

    return false;
  };
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
define('views/about',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var About = exports.About = function About() {
    _classCallCheck(this, About);

    this.message = 'About!';
  };
});
define('views/decompose.actions',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var UPDATE_WIDTH = exports.UPDATE_WIDTH = 'UPDATE';

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
define('views/decompose.defaults',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = {
    columns: {
      matrix: {
        width: 40,
        widthUnit: '%'
      },
      stats: {
        width: 20,
        widthUnit: 'rem'
      }
    }
  };
});
define('views/decompose',['exports', 'aurelia-framework', 'aurelia-event-aggregator', 'services/font', 'services/states', 'views/decompose.actions', 'utils/dom-el', 'utils/request-animation-frame'], function (exports, _aureliaFramework, _aureliaEventAggregator, _font, _states, _decompose, _domEl, _requestAnimationFrame) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Decompose = undefined;

  var _font2 = _interopRequireDefault(_font);

  var _states2 = _interopRequireDefault(_states);

  var _domEl2 = _interopRequireDefault(_domEl);

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

  var logger = _aureliaFramework.LogManager.getLogger('decompose');

  var Decompose = exports.Decompose = (_dec = (0, _aureliaFramework.inject)(_aureliaEventAggregator.EventAggregator, _font2.default, _states2.default), _dec(_class = function () {
    function Decompose(eventAggregator, font, states) {
      _classCallCheck(this, Decompose);

      this.events = eventAggregator;
      this.font = font;

      this.css = {};

      this.store = states.store;
      this.store.subscribe(this.update.bind(this));
      this.undo = states.undo.bind(states);
      this.redo = states.redo.bind(states);

      this.pattern = {};
      this.stats = {};
    }

    Decompose.prototype.attached = function attached() {
      this.$baseEl = new _domEl2.default(this.baseEl);
      this.updateCss();
    };

    Decompose.prototype.update = function update() {
      logger.debug('update');
      this.updateCss();
    };

    Decompose.prototype.updateCss = function updateCss() {
      var columns = void 0;

      try {
        columns = this.store.getState().present.decompose.columns;
      } catch (e) {
        logger.error('State invalid', e);
      }

      var columnNames = Object.keys(columns);

      for (var _iterator = columnNames, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var columnName = _ref;

        this.css[columnName] = {
          flexBasis: '' + columns[columnName].width + columns[columnName].widthUnit
        };
      }
    };

    Decompose.prototype.columnDragStartHandler = function columnDragStartHandler(event, target) {
      this.dragging = {
        target: target,
        x: event.clientX
      };

      this.$baseEl.addClass('is-col-drag-' + this.dragging.target);
      this.$baseEl.addClass('is-col-drag-' + this.dragging.target + '-highlight');

      this.mouseMoveListener = this.events.subscribe('app.mouseMove', this.columnDragMoveHandler.bind(this));
      this.events.subscribeOnce('app.mouseUp', this.columnDragEndHandler.bind(this));
    };

    Decompose.prototype.columnDragMoveHandler = function columnDragMoveHandler(event) {
      var dX = event.clientX - this.dragging.x;

      this[this.dragging.target].dragBtnCss = {
        transform: 'translateX(' + (dX - this.font.size * 0.25) + 'px)'
      };

      this[this.dragging.target].dragIndicatorCss = {
        transform: 'translateX(' + dX + 'px)'
      };
    };

    Decompose.prototype.columnDragEndHandler = function columnDragEndHandler(event) {
      var _this = this;

      var target = this.dragging.target;

      this.dragging.dX = event.clientX - this.dragging.x;

      this.updateColumnWidth(this.dragging);

      this.$baseEl.removeClass('is-col-drag-' + target + '-highlight');

      (0, _requestAnimationFrame.requestNextAnimationFrame)(function () {
        _this.$baseEl.removeClass('is-col-drag-' + target);
      });

      this.mouseMoveListener.dispose();

      this[this.dragging.target].dragBtnCss = {
        transform: null
      };

      this[this.dragging.target].dragIndicatorCss = {
        transform: null
      };

      this.dragging = undefined;
    };

    Decompose.prototype.updateColumnWidth = function updateColumnWidth(dragged) {
      if (dragged.target === 'pattern') {
        var visWidth = this.visEl.getBoundingClientRect().width;
        var matrixWidth = this.matrixColEl.getBoundingClientRect().width;

        this.store.dispatch((0, _decompose.updateWidth)('matrix', (matrixWidth + dragged.dX) / visWidth * 100));
      }

      if (dragged.target === 'stats') {
        var statsWidth = this.statsColEl.getBoundingClientRect().width;

        this.store.dispatch((0, _decompose.updateWidth)('stats', (statsWidth - dragged.dX) / this.font.size));
      }
    };

    return Decompose;
  }()) || _class);
});
define('views/decompose.reducers',['exports', 'redux', 'views/decompose.actions', 'views/decompose.defaults'], function (exports, _redux, _decompose, _decompose2) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.columns = columns;

  var _decompose3 = _interopRequireDefault(_decompose2);

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
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _extends({}, _decompose3.default.columns);
    var action = arguments[1];

    switch (action.type) {
      case _decompose.UPDATE_WIDTH:
        if (state[action.payload.column]) {
          var newState = _extends({}, state);

          newState[action.payload.column] = _extends({}, newState[action.payload.column], {
            width: action.payload.width
          });

          return newState;
        }
        return state;
      default:
        return state;
    }
  }

  exports.default = (0, _redux.combineReducers)({
    columns: columns
  });
});
define('views/home',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var Home = exports.Home = function Home() {
    _classCallCheck(this, Home);

    this.message = 'Home!';
  };
});
define('redux-undo/actions',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var ActionTypes = exports.ActionTypes = {
  UNDO: '@@redux-undo/UNDO',
  REDO: '@@redux-undo/REDO',
  JUMP_TO_FUTURE: '@@redux-undo/JUMP_TO_FUTURE',
  JUMP_TO_PAST: '@@redux-undo/JUMP_TO_PAST',
  JUMP: '@@redux-undo/JUMP',
  CLEAR_HISTORY: '@@redux-undo/CLEAR_HISTORY'
};

var ActionCreators = exports.ActionCreators = {
  undo: function undo() {
    return { type: ActionTypes.UNDO };
  },
  redo: function redo() {
    return { type: ActionTypes.REDO };
  },
  jumpToFuture: function jumpToFuture(index) {
    return { type: ActionTypes.JUMP_TO_FUTURE, index: index };
  },
  jumpToPast: function jumpToPast(index) {
    return { type: ActionTypes.JUMP_TO_PAST, index: index };
  },
  jump: function jump(index) {
    return { type: ActionTypes.JUMP, index: index };
  },
  clearHistory: function clearHistory() {
    return { type: ActionTypes.CLEAR_HISTORY };
  }
};
});

define('redux-undo/helpers',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseActions = parseActions;
exports.isHistory = isHistory;
exports.distinctState = distinctState;
exports.includeAction = includeAction;
exports.excludeAction = excludeAction;
exports.combineFilters = combineFilters;
// parseActions helper: takes a string (or array)
//                      and makes it an array if it isn't yet
function parseActions(rawActions) {
  var defaultValue = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

  if (Array.isArray(rawActions)) {
    return rawActions;
  } else if (typeof rawActions === 'string') {
    return [rawActions];
  }
  return defaultValue;
}

// isHistory helper: check for a valid history object
function isHistory(history) {
  return typeof history.present !== 'undefined' && typeof history.future !== 'undefined' && typeof history.past !== 'undefined' && Array.isArray(history.future) && Array.isArray(history.past);
}

// distinctState helper: deprecated, does nothing in latest beta
/* istanbul ignore next */
function distinctState() {
  console.warn('distinctState is deprecated in beta4 and newer. ' + 'The distinctState behavior is now default, which means only ' + 'actions resulting in a new state are recorded. ' + 'See https://github.com/omnidan/redux-undo#filtering-actions ' + 'for more details.');
  return function () {
    return true;
  };
}

// includeAction helper: whitelist actions to be added to the history
function includeAction(rawActions) {
  var actions = parseActions(rawActions);
  return function (action) {
    return actions.indexOf(action.type) >= 0;
  };
}

// excludeAction helper: blacklist actions from being added to the history
function excludeAction(rawActions) {
  var actions = parseActions(rawActions);
  return function (action) {
    return actions.indexOf(action.type) < 0;
  };
}

// combineFilters helper: combine multiple filters to one
function combineFilters() {
  for (var _len = arguments.length, filters = Array(_len), _key = 0; _key < _len; _key++) {
    filters[_key] = arguments[_key];
  }

  return filters.reduce(function (prev, curr) {
    return function (action, currentState, previousHistory) {
      return prev(action, currentState, previousHistory) && curr(action, currentState, previousHistory);
    };
  }, function () {
    return true;
  });
}
});

define('redux-undo/reducer',['require','exports','module','./debug','./actions','./helpers'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = undoable;

var _debug = require('./debug');

var debug = _interopRequireWildcard(_debug);

var _actions = require('./actions');

var _helpers = require('./helpers');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// lengthWithoutFuture: get length of history
function lengthWithoutFuture(history) {
  return history.past.length + 1;
}

// insert: insert `state` into history, which means adding the current state
//         into `past`, setting the new `state` as `present` and erasing
//         the `future`.
function insert(history, state, limit) {
  debug.log('inserting', state);
  debug.log('new free: ', limit - lengthWithoutFuture(history));

  var past = history.past;
  var _latestUnfiltered = history._latestUnfiltered;

  var historyOverflow = limit && lengthWithoutFuture(history) >= limit;

  var pastSliced = past.slice(historyOverflow ? 1 : 0);
  var newPast = _latestUnfiltered != null ? [].concat(_toConsumableArray(pastSliced), [_latestUnfiltered]) : pastSliced;

  return {
    past: newPast,
    present: state,
    _latestUnfiltered: state,
    future: []
  };
}

// undo: go back to the previous point in history
function undo(history) {
  var past = history.past;
  var future = history.future;
  var _latestUnfiltered = history._latestUnfiltered;


  if (past.length <= 0) return history;

  var newFuture = _latestUnfiltered != null ? [_latestUnfiltered].concat(_toConsumableArray(future)) : future;

  var newPresent = past[past.length - 1];
  return {
    past: past.slice(0, past.length - 1), // remove last element from past
    present: newPresent, // set element as new present
    _latestUnfiltered: newPresent,
    future: newFuture
  };
}

// redo: go to the next point in history
function redo(history) {
  var past = history.past;
  var future = history.future;
  var _latestUnfiltered = history._latestUnfiltered;


  if (future.length <= 0) return history;

  var newPast = _latestUnfiltered != null ? [].concat(_toConsumableArray(past), [_latestUnfiltered]) : past;

  var newPresent = future[0];
  return {
    future: future.slice(1, future.length), // remove element from future
    present: newPresent, // set element as new present
    _latestUnfiltered: newPresent,
    past: newPast
  };
}

// jumpToFuture: jump to requested index in future history
function jumpToFuture(history, index) {
  if (index === 0) return redo(history);
  if (index < 0 || index >= history.future.length) return history;

  var past = history.past;
  var future = history.future;
  var _latestUnfiltered = history._latestUnfiltered;


  var newPresent = future[index];

  return {
    future: future.slice(index + 1),
    present: newPresent,
    _latestUnfiltered: newPresent,
    past: past.concat([_latestUnfiltered]).concat(future.slice(0, index))
  };
}

// jumpToPast: jump to requested index in past history
function jumpToPast(history, index) {
  if (index === history.past.length - 1) return undo(history);
  if (index < 0 || index >= history.past.length) return history;

  var past = history.past;
  var future = history.future;
  var _latestUnfiltered = history._latestUnfiltered;


  var newPresent = past[index];

  return {
    future: past.slice(index + 1).concat([_latestUnfiltered]).concat(future),
    present: newPresent,
    _latestUnfiltered: newPresent,
    past: past.slice(0, index)
  };
}

// jump: jump n steps in the past or forward
function jump(history, n) {
  if (n > 0) return jumpToFuture(history, n - 1);
  if (n < 0) return jumpToPast(history, history.past.length + n);
  return history;
}

// createHistory
function createHistory(state, ignoreInitialState) {
  // ignoreInitialState essentially prevents the user from undoing to the
  // beginning, in the case that the undoable reducer handles initialization
  // in a way that can't be redone simply
  return ignoreInitialState ? {
    past: [],
    present: state,
    future: []
  } : {
    past: [],
    present: state,
    _latestUnfiltered: state,
    future: []
  };
}

// helper to dynamically match in the reducer's switch-case
function actionTypeAmongClearHistoryType(actionType, clearHistoryType) {
  return clearHistoryType.indexOf(actionType) > -1 ? actionType : !actionType;
}

// redux-undo higher order reducer
function undoable(reducer) {
  var rawConfig = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  debug.set(rawConfig.debug);

  var config = {
    initTypes: (0, _helpers.parseActions)(rawConfig.initTypes, ['@@redux-undo/INIT']),
    limit: rawConfig.limit,
    filter: rawConfig.filter || function () {
      return true;
    },
    undoType: rawConfig.undoType || _actions.ActionTypes.UNDO,
    redoType: rawConfig.redoType || _actions.ActionTypes.REDO,
    jumpToPastType: rawConfig.jumpToPastType || _actions.ActionTypes.JUMP_TO_PAST,
    jumpToFutureType: rawConfig.jumpToFutureType || _actions.ActionTypes.JUMP_TO_FUTURE,
    jumpType: rawConfig.jumpType || _actions.ActionTypes.JUMP,
    clearHistoryType: Array.isArray(rawConfig.clearHistoryType) ? rawConfig.clearHistoryType : [rawConfig.clearHistoryType || _actions.ActionTypes.CLEAR_HISTORY],
    neverSkipReducer: rawConfig.neverSkipReducer || false,
    ignoreInitialState: rawConfig.ignoreInitialState || false
  };

  return function () {
    var state = arguments.length <= 0 || arguments[0] === undefined ? config.history : arguments[0];
    var action = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    debug.start(action, state);

    var history = state;
    if (!config.history) {
      debug.log('history is uninitialized');

      if (state === undefined) {
        history = createHistory(reducer(state, { type: '@@redux-undo/CREATE_HISTORY' }), config.ignoreInitialState);
        debug.log('do not initialize on probe actions');
      } else if ((0, _helpers.isHistory)(state)) {
        history = config.history = config.ignoreInitialState ? state : _extends({}, state, {
          _latestUnfiltered: state.present
        });
        debug.log('initialHistory initialized: initialState is a history', config.history);
      } else {
        history = config.history = createHistory(state);
        debug.log('initialHistory initialized: initialState is not a history', config.history);
      }
    }

    var skipReducer = function skipReducer(res) {
      return config.neverSkipReducer ? _extends({}, res, { present: reducer(res.present, action) }) : res;
    };

    var res = void 0;
    switch (action.type) {
      case undefined:
        return history;

      case config.undoType:
        res = undo(history);
        debug.log('perform undo');
        debug.end(res);
        return skipReducer(res);

      case config.redoType:
        res = redo(history);
        debug.log('perform redo');
        debug.end(res);
        return skipReducer(res);

      case config.jumpToPastType:
        res = jumpToPast(history, action.index);
        debug.log('perform jumpToPast to ' + action.index);
        debug.end(res);
        return skipReducer(res);

      case config.jumpToFutureType:
        res = jumpToFuture(history, action.index);
        debug.log('perform jumpToFuture to ' + action.index);
        debug.end(res);
        return skipReducer(res);

      case config.jumpType:
        res = jump(history, action.index);
        debug.log('perform jump to ' + action.index);
        debug.end(res);
        return skipReducer(res);

      case actionTypeAmongClearHistoryType(action.type, config.clearHistoryType):
        res = createHistory(history.present);
        debug.log('perform clearHistory');
        debug.end(res);
        return skipReducer(res);

      default:
        res = reducer(history.present, action);

        if (config.initTypes.some(function (actionType) {
          return actionType === action.type;
        })) {
          debug.log('reset history due to init action');
          debug.end(config.history);
          return config.history;
        }

        if (history.present === res) {
          // Don't handle this action. Do not call debug.end here,
          // because this action should not produce side effects to the console
          return history;
        }

        if (typeof config.filter === 'function' && !config.filter(action, res, history)) {
          // if filtering an action, merely update the present
          var nextState = _extends({}, history, {
            present: res
          });
          debug.log('filter prevented action, not storing it');
          debug.end(nextState);
          return nextState;
        } else {
          // If the action wasn't filtered, insert normally
          history = insert(history, res, config.limit);

          debug.log('inserted new state into history');
          debug.end(history);
          return history;
        }
    }
  };
}
});

define('redux-undo/debug',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var __DEBUG__ = void 0;
var displayBuffer = void 0;

var colors = {
  prevState: '#9E9E9E',
  action: '#03A9F4',
  nextState: '#4CAF50'
};

/* istanbul ignore next: debug messaging is not tested */
function initBuffer() {
  displayBuffer = {
    header: [],
    prev: [],
    action: [],
    next: [],
    msgs: []
  };
}

/* istanbul ignore next: debug messaging is not tested */
function printBuffer() {
  var _displayBuffer = displayBuffer;
  var header = _displayBuffer.header;
  var prev = _displayBuffer.prev;
  var next = _displayBuffer.next;
  var action = _displayBuffer.action;
  var msgs = _displayBuffer.msgs;

  if (console.group) {
    var _console, _console2, _console3, _console4, _console5;

    (_console = console).groupCollapsed.apply(_console, _toConsumableArray(header));
    (_console2 = console).log.apply(_console2, _toConsumableArray(prev));
    (_console3 = console).log.apply(_console3, _toConsumableArray(action));
    (_console4 = console).log.apply(_console4, _toConsumableArray(next));
    (_console5 = console).log.apply(_console5, _toConsumableArray(msgs));
    console.groupEnd();
  } else {
    var _console6, _console7, _console8, _console9, _console10;

    (_console6 = console).log.apply(_console6, _toConsumableArray(header));
    (_console7 = console).log.apply(_console7, _toConsumableArray(prev));
    (_console8 = console).log.apply(_console8, _toConsumableArray(action));
    (_console9 = console).log.apply(_console9, _toConsumableArray(next));
    (_console10 = console).log.apply(_console10, _toConsumableArray(msgs));
  }
}

/* istanbul ignore next: debug messaging is not tested */
function colorFormat(text, color, obj) {
  return ['%c' + text, 'color: ' + color + '; font-weight: bold', obj];
}

/* istanbul ignore next: debug messaging is not tested */
function start(action, state) {
  initBuffer();
  if (__DEBUG__) {
    if (console.group) {
      displayBuffer.header = ['%credux-undo', 'font-style: italic', 'action', action.type];
      displayBuffer.action = colorFormat('action', colors.action, action);
      displayBuffer.prev = colorFormat('prev history', colors.prevState, state);
    } else {
      displayBuffer.header = ['redux-undo action', action.type];
      displayBuffer.action = ['action', action];
      displayBuffer.prev = ['prev history', state];
    }
  }
}

/* istanbul ignore next: debug messaging is not tested */
function end(nextState) {
  if (__DEBUG__) {
    if (console.group) {
      displayBuffer.next = colorFormat('next history', colors.nextState, nextState);
    } else {
      displayBuffer.next = ['next history', nextState];
    }
    printBuffer();
  }
}

/* istanbul ignore next: debug messaging is not tested */
function log() {
  if (__DEBUG__) {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    displayBuffer.msgs = displayBuffer.msgs.concat([].concat(args, ['\n']));
  }
}

/* istanbul ignore next: debug messaging is not tested */
function set(debug) {
  __DEBUG__ = debug;
}

exports.set = set;
exports.start = start;
exports.end = end;
exports.log = log;
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
define('text!app.html', ['module'], function(module) { module.exports = "<template><div class=\"full-wh\" mousemove.trigger=\"mouseMoveHandler($event)\" mouseup.trigger=\"mouseUpHandler($event)\"><require from=\"assets/styles/index.css\"></require><require from=\"components/navigation.html\"></require><div id=\"drag-drop-notifier\" class=\"full-wh flex-c flex-jc-c flex-a-c\"><span>Drop JSON state</span></div><header id=\"toolbar\" class=\"flex-c flex-jc-sb\"><h1>Matrix Decomposition Methods</h1><navigation class=\"primary-nav\" router.bind=\"router\"></navigation></header><main id=\"main\"><router-view></router-view></main></div></template>"; });
define('text!assets/styles/app.css', ['module'], function(module) { module.exports = "html {\n  font-family: 'Rubik', sans-serif;\n  font-size: 16px;\n  background: #fff; }\n\n#drag-drop-notifier {\n  position: fixed;\n  z-index: -1;\n  font-size: 2em;\n  font-weight: bold;\n  text-transform: uppercase;\n  color: #666;\n  background: #bfbfbf; }\n\n#toolbar {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 3rem;\n  padding: 0 0.5rem;\n  border-bottom: 1px solid #d9d9d9;\n  color: #999;\n  background: #fff;\n  line-height: 3rem; }\n  #toolbar h1 {\n    font-weight: normal;\n    font-size: 1.5rem;\n    line-height: inherit; }\n\n#main {\n  position: absolute;\n  top: 3rem;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  padding: .5rem;\n  background: #fff; }\n\n#toolbar,\n#main {\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\nbody.is-dragging-over #toolbar,\nbody.is-dragging-over #main {\n  opacity: 0.33; }\n"; });
define('text!components/dragable-button.html', ['module'], function(module) { module.exports = "<template role=\"button\"><div class=\"draggable\" mousedown.trigger=\"mouseDownHandler($event.target)\" mousemove.trigger=\"mouseMoveHandler($event.target)\" mouseup.trigger=\"mouseUpHandler($event.target)\">Oh yes girl</div></template>"; });
define('text!assets/styles/base.css', ['module'], function(module) { module.exports = "/* =====  1 Global Rules & Definitions  ===================================== */\n/* -----  1.1 Font Definitions  --------------------------------------------- */\n/* We're using Google Fonts for performance reasons */\n/* -----  1.2 Reset & Normalization  ---------------------------------------- */\n*, *::before, *::after {\n  margin: 0;\n  padding: 0;\n  border: none;\n  box-sizing: border-box;\n  list-style: none; }\n\narticle, aside, details, figcaption, figure,\nfooter, header, main, menu, nav, section, summary {\n  /* Add correct display for IE 9- and some newer browsers */\n  display: block; }\n\n::-moz-selection {\n  background: #ff5500;\n  color: #000; }\n\n::selection {\n  background: #ff5500;\n  color: #000; }\n\nbody {\n  text-rendering: optimizeLegibility; }\n\n/* -----  1.3 General Typography  ------------------------------------------- */\nh1, h2, h3, h4, h5, h6,\np, ul, ol, figure, pre {\n  /* Reset font-sizes and normalize margins */\n  font-size: inherit;\n  line-height: inherit;\n  margin: 0 0 1em; }\n\n/* Headings */\nh1, h2, h3 {\n  font-weight: 700; }\n\nh1 {\n  font-weight: 700;\n  font-size: 2.5rem;\n  line-height: 1.25;\n  margin-bottom: 3rem; }\n\nh2 {\n  font-size: 1.75rem;\n  line-height: 2.2rem; }\n\nh3 {\n  font-size: 1.25em;\n  line-height: 1.2; }\n\nh4 {\n  font-size: 1em; }\n\n/* Links */\na {\n  color: inherit;\n  text-decoration: none;\n  border-bottom: 1px solid #ff5500; }\n\na:hover, a:focus, a:active {\n  color: #ff5500; }\n\nb, strong {\n  font-weight: 700; }\n\n/* -----  1.4 Images & Figures  --------------------------------------------- */\nimg {\n  border-style: none;\n  width: 100%;\n  height: auto; }\n\nfigcaption {\n  font-size: .75rem;\n  line-height: 1.5rem; }\n\n/* =====  2 Global Styles  ================================================== */\n.rel {\n  position: relative; }\n\n.fw,\n.full-wh {\n  width: 100%; }\n\n.fh,\n.full-wh {\n  height: 100%; }\n\n.flex-c {\n  display: flex; }\n\n.flex-jc-c {\n  justify-content: center; }\n\n.flex-jc-sb {\n  justify-content: space-between; }\n\n.flex-a-c {\n  align-items: center; }\n\n.flex-a-s {\n  align-items: stretch; }\n\n.flex-i-g-1 {\n  flex-grow: 1; }\n\n.no-list-style {\n  list-style: none;\n  margin: 0;\n  padding: 0; }\n\n.inline-list li {\n  display: inline-block; }\n\n.float-list li {\n  display: block;\n  float: left; }\n\n.draggable:hover {\n  cursor: pointer; }\n\nbody.dragging,\n.draggable:active {\n  cursor: move !important; }\n\nbody.dragging-horizontal,\n.draggable.horizontal-only:active {\n  cursor: ew-resize !important; }\n\nbody.dragging-vertical,\n.draggable.vertical-only:active {\n  cursor: ns-resize !important; }\n"; });
define('text!components/navigation.html', ['module'], function(module) { module.exports = "<template bindable=\"router\"><require from=\"components/svg-icon.html\"></require><nav><ul class=\"no-list-style flex-c\"><li repeat.for=\"row of router.navigation\" class=\"${row.isActive ? 'is-active' : ''} ${row.config.showIcon ? 'is-icon-only' : ''}\"><a href.bind=\"row.href\" if.bind=\"row.config.showIcon\"><svg-icon icon-id.bind=\"row.config.iconId\"></svg-icon></a><a href.bind=\"row.href\" if.bind=\"!row.config.showIcon\">${row.title}</a></li></ul></nav></template>"; });
define('text!assets/styles/colors.css', ['module'], function(module) { module.exports = ""; });
define('text!components/svg-icon.html', ['module'], function(module) { module.exports = "<template bindable=\"basePath, iconId\"><svg xmlns=\"http://www.w3.org/2000/svg\"><use xlink:href=\"${basePath}src/assets/images/icons.svg#${iconId}\"></use></svg></template>"; });
define('text!assets/styles/decompose.css', ['module'], function(module) { module.exports = ".matrix-view,\n.pattern-view,\n.stats-view {\n  padding: 0 0.5rem; }\n\n.matrix-view {\n  flex-basis: 40%;\n  padding-left: 0; }\n\n.pattern-view {\n  flex-grow: 1;\n  border-left: 1px solid #d9d9d9; }\n\n.stats-view {\n  flex-basis: 20rem;\n  border-left: 1px solid #d9d9d9;\n  padding-right: 0; }\n\n.matrix-view h2.small,\n.pattern-view h2.small,\n.stats-view h2.small {\n  font-size: 1rem;\n  line-height: 2rem;\n  color: #d9d9d9;\n  font-weight: normal;\n  text-transform: uppercase; }\n\n.column-resizer {\n  position: absolute;\n  z-index: 2;\n  top: 0;\n  left: -0.25rem;\n  display: block;\n  width: 0.5rem;\n  height: 2rem;\n  background: #d9d9d9;\n  transform: translateX(0);\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), width 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .column-resizer:hover, .column-resizer:active, .column-resizer:focus {\n    transform: translateX(-0.25rem);\n    width: 1rem; }\n\n.is-col-drag-pattern .pattern-view .column-resizer,\n.is-col-drag-stats .stats-view .column-resizer {\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), width 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n.is-col-drag-pattern-highlight .pattern-view .column-resizer,\n.is-col-drag-stats-highlight .stats-view .column-resizer {\n  background: #ff5500; }\n\n.drag-indicator {\n  position: absolute;\n  z-index: 1;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 1px;\n  background: #ff5500;\n  opacity: 0;\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n.is-col-drag-pattern .pattern-view .drag-indicator,\n.is-col-drag-stats .stats-view .drag-indicator {\n  opacity: 1; }\n"; });
define('text!views/about.html', ['module'], function(module) { module.exports = "<template><p>${message}</p></template>"; });
define('text!views/decompose.html', ['module'], function(module) { module.exports = "<template><div class=\"full-wh flex-c flex-jc-sb flex-a-s\" ref=\"baseEl\"><div class=\"vis-view flex-c flex-jc-sb flex-a-s flex-i-g-1\" ref=\"visEl\"><div class=\"matrix-view rel\" css.one-way=\"css.matrix\" ref=\"matrixColEl\"><h2 class=\"small\">Matrix</h2></div><div class=\"pattern-view rel\" ref=\"patternColEl\"><button class=\"column-resizer draggable horizontal-only\" mousedown.trigger=\"columnDragStartHandler($event, 'pattern')\" css.one-way=\"pattern.dragBtnCss\"></button><div class=\"drag-indicator\" ref=\"patternDragIndicator\" css.one-way=\"pattern.dragIndicatorCss\"></div><h2 class=\"small\">Pattern</h2></div></div><div class=\"stats-view rel\" css.one-way=\"css.stats\" ref=\"statsColEl\"><button class=\"column-resizer draggable horizontal-only\" mousedown.trigger=\"columnDragStartHandler($event, 'stats')\" css.one-way=\"stats.dragBtnCss\"></button><div class=\"drag-indicator\" ref=\"statsDragIndicator\" css.one-way=\"stats.dragIndicatorCss\"></div><h2 class=\"small\">Statistics</h2></div></div></template>"; });
define('text!assets/styles/index.css', ['module'], function(module) { module.exports = "/* =====  1 Global Rules & Definitions  ===================================== */\n/* -----  1.1 Font Definitions  --------------------------------------------- */\n/* We're using Google Fonts for performance reasons */\n/* -----  1.2 Reset & Normalization  ---------------------------------------- */\n*, *::before, *::after {\n  margin: 0;\n  padding: 0;\n  border: none;\n  box-sizing: border-box;\n  list-style: none; }\n\narticle, aside, details, figcaption, figure,\nfooter, header, main, menu, nav, section, summary {\n  /* Add correct display for IE 9- and some newer browsers */\n  display: block; }\n\n::-moz-selection {\n  background: #ff5500;\n  color: #000; }\n\n::selection {\n  background: #ff5500;\n  color: #000; }\n\nbody {\n  text-rendering: optimizeLegibility; }\n\n/* -----  1.3 General Typography  ------------------------------------------- */\nh1, h2, h3, h4, h5, h6,\np, ul, ol, figure, pre {\n  /* Reset font-sizes and normalize margins */\n  font-size: inherit;\n  line-height: inherit;\n  margin: 0 0 1em; }\n\n/* Headings */\nh1, h2, h3 {\n  font-weight: 700; }\n\nh1 {\n  font-weight: 700;\n  font-size: 2.5rem;\n  line-height: 1.25;\n  margin-bottom: 3rem; }\n\nh2 {\n  font-size: 1.75rem;\n  line-height: 2.2rem; }\n\nh3 {\n  font-size: 1.25em;\n  line-height: 1.2; }\n\nh4 {\n  font-size: 1em; }\n\n/* Links */\na {\n  color: inherit;\n  text-decoration: none;\n  border-bottom: 1px solid #ff5500; }\n\na:hover, a:focus, a:active {\n  color: #ff5500; }\n\nb, strong {\n  font-weight: 700; }\n\n/* -----  1.4 Images & Figures  --------------------------------------------- */\nimg {\n  border-style: none;\n  width: 100%;\n  height: auto; }\n\nfigcaption {\n  font-size: .75rem;\n  line-height: 1.5rem; }\n\n/* =====  2 Global Styles  ================================================== */\n.rel {\n  position: relative; }\n\n.fw,\n.full-wh {\n  width: 100%; }\n\n.fh,\n.full-wh {\n  height: 100%; }\n\n.flex-c {\n  display: flex; }\n\n.flex-jc-c {\n  justify-content: center; }\n\n.flex-jc-sb {\n  justify-content: space-between; }\n\n.flex-a-c {\n  align-items: center; }\n\n.flex-a-s {\n  align-items: stretch; }\n\n.flex-i-g-1 {\n  flex-grow: 1; }\n\n.no-list-style {\n  list-style: none;\n  margin: 0;\n  padding: 0; }\n\n.inline-list li {\n  display: inline-block; }\n\n.float-list li {\n  display: block;\n  float: left; }\n\n.draggable:hover {\n  cursor: pointer; }\n\nbody.dragging,\n.draggable:active {\n  cursor: move !important; }\n\nbody.dragging-horizontal,\n.draggable.horizontal-only:active {\n  cursor: ew-resize !important; }\n\nbody.dragging-vertical,\n.draggable.vertical-only:active {\n  cursor: ns-resize !important; }\n\nhtml {\n  font-family: 'Rubik', sans-serif;\n  font-size: 16px;\n  background: #fff; }\n\n#drag-drop-notifier {\n  position: fixed;\n  z-index: -1;\n  font-size: 2em;\n  font-weight: bold;\n  text-transform: uppercase;\n  color: #666;\n  background: #bfbfbf; }\n\n#toolbar {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 3rem;\n  padding: 0 0.5rem;\n  border-bottom: 1px solid #d9d9d9;\n  color: #999;\n  background: #fff;\n  line-height: 3rem; }\n  #toolbar h1 {\n    font-weight: normal;\n    font-size: 1.5rem;\n    line-height: inherit; }\n\n#main {\n  position: absolute;\n  top: 3rem;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  padding: .5rem;\n  background: #fff; }\n\n#toolbar,\n#main {\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\nbody.is-dragging-over #toolbar,\nbody.is-dragging-over #main {\n  opacity: 0.33; }\n\n.primary-nav {\n  text-transform: uppercase;\n  line-height: 3.25rem; }\n  .primary-nav li {\n    position: relative;\n    margin: 0 0.25rem; }\n    .primary-nav li.is-active::before {\n      position: absolute;\n      content: '';\n      right: 0;\n      bottom: 0;\n      left: 0;\n      height: 3px;\n      background: #ff5500; }\n    .primary-nav li.is-active a {\n      color: #000; }\n  .primary-nav a {\n    display: block;\n    height: 3rem;\n    padding: 0 0.25rem;\n    border-bottom: 0; }\n  .primary-nav .is-icon-only {\n    width: 1.7rem;\n    height: 3rem; }\n  .primary-nav svg {\n    width: 100%;\n    height: 100%; }\n\n.matrix-view,\n.pattern-view,\n.stats-view {\n  padding: 0 0.5rem; }\n\n.matrix-view {\n  flex-basis: 40%;\n  padding-left: 0; }\n\n.pattern-view {\n  flex-grow: 1;\n  border-left: 1px solid #d9d9d9; }\n\n.stats-view {\n  flex-basis: 20rem;\n  border-left: 1px solid #d9d9d9;\n  padding-right: 0; }\n\n.matrix-view h2.small,\n.pattern-view h2.small,\n.stats-view h2.small {\n  font-size: 1rem;\n  line-height: 2rem;\n  color: #d9d9d9;\n  font-weight: normal;\n  text-transform: uppercase; }\n\n.column-resizer {\n  position: absolute;\n  z-index: 2;\n  top: 0;\n  left: -0.25rem;\n  display: block;\n  width: 0.5rem;\n  height: 2rem;\n  background: #d9d9d9;\n  transform: translateX(0);\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), transform 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), width 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n  .column-resizer:hover, .column-resizer:active, .column-resizer:focus {\n    transform: translateX(-0.25rem);\n    width: 1rem; }\n\n.is-col-drag-pattern .pattern-view .column-resizer,\n.is-col-drag-stats .stats-view .column-resizer {\n  transition: background 0.15s cubic-bezier(0.3, 0.1, 0.6, 1), width 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n.is-col-drag-pattern-highlight .pattern-view .column-resizer,\n.is-col-drag-stats-highlight .stats-view .column-resizer {\n  background: #ff5500; }\n\n.drag-indicator {\n  position: absolute;\n  z-index: 1;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 1px;\n  background: #ff5500;\n  opacity: 0;\n  transition: opacity 0.15s cubic-bezier(0.3, 0.1, 0.6, 1); }\n\n.is-col-drag-pattern .pattern-view .drag-indicator,\n.is-col-drag-stats .stats-view .drag-indicator {\n  opacity: 1; }\n"; });
define('text!views/home.html', ['module'], function(module) { module.exports = "<template><p>${message}</p></template>"; });
define('text!assets/styles/navigation.css', ['module'], function(module) { module.exports = ".primary-nav {\n  text-transform: uppercase;\n  line-height: 3.25rem; }\n  .primary-nav li {\n    position: relative;\n    margin: 0 0.25rem; }\n    .primary-nav li.is-active::before {\n      position: absolute;\n      content: '';\n      right: 0;\n      bottom: 0;\n      left: 0;\n      height: 3px;\n      background: #ff5500; }\n    .primary-nav li.is-active a {\n      color: #000; }\n  .primary-nav a {\n    display: block;\n    height: 3rem;\n    padding: 0 0.25rem;\n    border-bottom: 0; }\n  .primary-nav .is-icon-only {\n    width: 1.7rem;\n    height: 3rem; }\n  .primary-nav svg {\n    width: 100%;\n    height: 100%; }\n"; });
define('text!assets/styles/transitions.css', ['module'], function(module) { module.exports = ""; });
//# sourceMappingURL=app-bundle.js.map