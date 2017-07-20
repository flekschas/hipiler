// Third party
import localforage from 'localForage';
import { applyMiddleware, compose, createStore } from 'redux';
import { autoRehydrate, persistStore, purgeStoredState } from 'redux-persist';
import thunk from 'redux-thunk';
// import freeze from 'redux-freeze';
import undoable, { ActionCreators } from 'redux-undo';
import { enableBatching } from 'redux-batched-actions';

import { resetState } from 'app-actions';
import appReducer from 'app-reducer';

const CONFIG = {
  storage: localforage,
  debounce: 25,
  keyPrefix: 'hipiler.'
};

export default class States {
  constructor () {
    this.store = createStore(
      undoable(enableBatching(appReducer), {
        limit: 25
      }),
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
    // Reset state to default values
    this.store.dispatch(resetState());

    // Clear history
    this.store.dispatch(ActionCreators.clearHistory());

    // Purge persistent store
    return purgeStoredState(CONFIG);
  }
}
