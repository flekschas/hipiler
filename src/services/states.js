// Third party
import localForage from 'localForage';
import { createStore } from 'redux';
import { persistStore, autoRehydrate, getStoredState } from 'redux-persist';
import undoable from 'redux-undo';
import { ActionCreators } from 'redux-undo';

import appReducer from 'app.reducer';

const CONFIG = {
  storage: localForage,
  debounce: 75,
  keyPrefix: 'matrixDecompositionMethods.'
};

export default class States {
  constructor () {
    getStoredState(CONFIG, (err, state) => {
      this.store = createStore(undoable(appReducer), state, autoRehydrate());

      persistStore(this.store, CONFIG);
    });
  }

  undo () {
    this.store.dispatch(ActionCreators.undo());
  }

  redo () {
    this.store.dispatch(ActionCreators.redo());
  }
}
