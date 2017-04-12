// Third party
import localforage from 'localForage';
import { applyMiddleware, compose, createStore } from 'redux';
import { autoRehydrate, persistStore, purgeStoredState } from 'redux-persist';
import createCompressor from 'redux-persist-transform-compress';
import thunk from 'redux-thunk';
// import freeze from 'redux-freeze';
import undoable, { ActionCreators } from 'redux-undo';

import appReducer from 'app-reducer';

const compressor = createCompressor();

const CONFIG = {
  storage: localforage,
  debounce: 75,
  keyPrefix: 'hipiler.',
  transforms: [compressor]
};

export default class States {
  constructor () {
    this.store = createStore(
      undoable(appReducer),
      undefined,
      compose(
        autoRehydrate(),
        applyMiddleware(thunk),
        // applyMiddleware(freeze)
      )
    );

    persistStore(this.store, CONFIG, (err, state) => {
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
    return purgeStoredState(CONFIG);
  }
}
