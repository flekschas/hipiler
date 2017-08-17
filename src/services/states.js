// Aurelia
import { LogManager } from 'aurelia-framework';

// Third party
import localforage from 'localForage';
import { applyMiddleware, compose, createStore } from 'redux';
import { autoRehydrate, persistStore, purgeStoredState } from 'redux-persist';
import thunk from 'redux-thunk';
// import freeze from 'redux-freeze';
import undoable, { ActionCreators, groupByActionTypes } from 'redux-undo';
import { enableBatching } from 'redux-batched-actions';

import { resetState } from 'app-actions';
import appReducer from 'app-reducer';

import {
  ANNOTATE_PILE,
  SELECT_PILE
} from 'components/fragments/fragments-actions';

import logger from 'utils/redux-logger';

const config = {
  storage: localforage,
  debounce: 25,
  keyPrefix: 'hipiler.'
};

const debug = LogManager.getLevel() === LogManager.logLevel.debug;

const middlewares = [autoRehydrate(), applyMiddleware(thunk)];

if (debug) {
  middlewares.push(applyMiddleware(logger));
  // middleware.push(applyMiddleware(freeze));
}

export default class States {
  constructor () {
    this.store = createStore(
      undoable(enableBatching(appReducer), {
        groupBy: groupByActionTypes([ANNOTATE_PILE, SELECT_PILE]),
        limit: 25
      }),
      undefined,
      compose(...middlewares)
    );

    persistStore(this.store, config, (err, state) => {
      // Rehydration is done
      this.isRehydrated = Object.keys(true).length > 0;
    });
  }

  undo () {
    this.store.dispatch(ActionCreators.undo());
  }

  redo () {
    this.store.dispatch(ActionCreators.redo());
  }

  reset () {
    // Reset state to default values
    this.store.dispatch(resetState());

    // Clear history
    this.store.dispatch(ActionCreators.clearHistory());

    // Purge persistent store
    return purgeStoredState(config);
  }
}
