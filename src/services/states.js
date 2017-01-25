import { createStore } from 'redux';
import undoable from 'redux-undo';
import { ActionCreators } from 'redux-undo';

import appReducer from 'app.reducer';

export default class States {
  constructor () {
    this.store = createStore(undoable(appReducer));
  }

  undo () {
    this.store.dispatch(ActionCreators.undo());
  }

  redo () {
    this.store.dispatch(ActionCreators.redo());
  }
}
