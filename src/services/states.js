// Third party
import localForage from 'localForage';
import { applyMiddleware, compose, createStore } from 'redux';
import { persistStore, autoRehydrate, getStoredState } from 'redux-persist';
import thunk from 'redux-thunk';
import undoable from 'redux-undo';
import { ActionCreators } from 'redux-undo';

import appReducer from 'app.reducer';

const CONFIG = {
  storage: localForage,
  debounce: 75,
  keyPrefix: 'matrixDecompositionMethods.'
};

let STORE;

export default class States {
  constructor () {
    this.store = getStoredState(CONFIG)
      .then((err, state) => {
        STORE = createStore(
          undoable(appReducer),
          state,
          compose(
            autoRehydrate(),
            applyMiddleware(thunk)
          )
        );

        persistStore(STORE, CONFIG);

        return STORE;
      });
  }

  undo () {
    this.store.dispatch(ActionCreators.undo());
  }

  redo () {
    this.store.dispatch(ActionCreators.redo());
  }
}
