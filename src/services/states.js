// Third party
import localForage from 'localForage';
import { applyMiddleware, compose, createStore } from 'redux';
import { autoRehydrate, persistStore, purgeStoredState } from 'redux-persist';
import thunk from 'redux-thunk';
import undoable from 'redux-undo';
import { ActionCreators } from 'redux-undo';

import appReducer from 'app.reducer';

const CONFIG = {
  storage: localForage,
  debounce: 75,
  keyPrefix: 'matrixDecompositionMethods.'
};

// let STORE;

export default class States {
  constructor () {
    this.store = createStore(
      undoable(appReducer),
      undefined,
      compose(
        autoRehydrate(),
        applyMiddleware(thunk)
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
    return purgeStoredState(CONFIG)
      .then(() => {
        console.log('alles gelöscht dude');
      })
      .catch(() => {
        console.error('WOOOT löschen fehlgeschlagen');
      });
  }
}
