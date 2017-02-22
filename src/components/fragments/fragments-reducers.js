import { combineReducers } from 'redux';

import {
  ADD_PILES,
  DISPERSE_PILES,
  RECOVER_PILES,
  REMOVE_PILES,
  STACK_PILES,
  SET_ANIMATION,
  SET_ARRANGE_METRICS,
  SET_CELL_SIZE,
  SET_COVER_DISP_MODE,
  SET_LASSO_IS_ROUND,
  SET_PILES,
  SET_SHOW_SPECIAL_CELLS,
  TRASH_PILES,
  UPDATE_FGM_CONFIG
} from 'components/fragments/fragments-actions';

import {
  ANIMATION,
  ARRANGE_METRICS,
  CELL_SIZE,
  CONFIG,
  LASSO_IS_ROUND,
  MODE_MEAN,
  PILES,
  SHOW_SPECIAL_CELLS
} from 'components/fragments/fragments-defaults';

import deepClone from 'utils/deep-clone';


export function piles (state = PILES, action) {
  switch (action.type) {
    case ADD_PILES: {
      const newState = { ...state };

      Object.keys(action.payload.piles).forEach((pileId) => {
        newState[pileId] = action.payload.piles[pileId];
      });
      return newState;
    }

    case DISPERSE_PILES: {
      const newState = { ...state };

      // Disperse matrices
      action.payload.piles
        .map(pileId => newState[pileId].slice(1))  // Always keep one matrix
        .reduce((a, b) => a.concat(b), [])
        .forEach((pileId) => {
          newState[pileId] = [pileId];
        });

      // Update original pile
      action.payload.piles
        .forEach((pileId) => {
          newState[pileId] = newState[pileId].slice(0, 1);
        });

      return newState;
    }

    case REMOVE_PILES: {
      const newState = { ...state };

      action.payload.piles
        .forEach((pileId) => {
          newState[`__${pileId}`] = [...newState[pileId]];
          newState[pileId] = [];
        });

      return newState;
    }

    case RECOVER_PILES: {
      const newState = { ...state };

      action.payload.piles
        .forEach((pileId) => {
          newState[pileId.slice(1)] = [...newState[pileId]];
          newState[pileId] = undefined;
          delete newState[pileId];
        });

      return newState;
    }

    case SET_PILES: {
      return action.payload.piles;
    }

    case STACK_PILES: {
      const newState = { ...state };

      // Add piles of source piles onto the target pile
      newState[action.payload.targetPile]
        .push(...action.payload.sourcePiles
          .map(pileId => newState[pileId])
          .reduce((a, b) => a.concat(b), [])
        );

      // Reset the source piles
      action.payload.sourcePiles.forEach(
        (pileId) => { newState[pileId] = []; }
      );

      return newState;
    }

    case TRASH_PILES: {
      const newState = { ...state };

      action.payload.piles
        .forEach((pileId) => {
          newState[`_${pileId}`] = [...newState[pileId]];
          newState[pileId] = undefined;
          delete newState[pileId];
        });

      return newState;
    }

    default:
      return state;
  }
}

export function animation (state = ANIMATION, action) {
  switch (action.type) {
    case SET_ANIMATION:
      return action.payload.animation;

    default:
      return state;
  }
}

export function arrangeMetrics (state = ARRANGE_METRICS, action) {
  switch (action.type) {
    case SET_ARRANGE_METRICS:
      return action.payload.arrangeMetrics.slice();

    default:
      return state;
  }
}

export function cellSize (state = CELL_SIZE, action) {
  switch (action.type) {
    case SET_CELL_SIZE:
      return action.payload.cellSize;

    default:
      return state;
  }
}

export function config (state = { ...CONFIG }, action) {
  switch (action.type) {
    case UPDATE_FGM_CONFIG:
      return { ...state, ...deepClone(action.payload.config) };

    default:
      return state;
  }
}

export function coverDispMode (state = MODE_MEAN, action) {
  switch (action.type) {
    case SET_COVER_DISP_MODE:
      return action.payload.coverDispMode;

    default:
      return state;
  }
}

export function lassoIsRound (state = LASSO_IS_ROUND, action) {
  switch (action.type) {
    case SET_LASSO_IS_ROUND:
      return action.payload.lassoIsRound;

    default:
      return state;
  }
}

export function showSpecialCells (state = SHOW_SPECIAL_CELLS, action) {
  switch (action.type) {
    case SET_SHOW_SPECIAL_CELLS:
      return action.payload.showSpecialCells;

    default:
      return state;
  }
}

export default combineReducers({
  animation,
  arrangeMetrics,
  cellSize,
  config,
  coverDispMode,
  lassoIsRound,
  piles,
  showSpecialCells
});
