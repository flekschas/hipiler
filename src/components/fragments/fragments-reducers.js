import { combineReducers } from 'redux';

import {
  ADD_PILES,
  DISPERSE_PILES,
  RECOVER_PILES,
  REMOVE_PILES,
  STACK_PILES,
  SET_ANIMATION,
  SET_ARRANGE_MEASURES,
  SET_CELL_SIZE,
  SET_COVER_DISP_MODE,
  SET_GRID_CELL_SIZE_LOCK,
  SET_GRID_SIZE,
  SET_HILBERT_CURVE,
  SET_HIGLASS_SUB_SELECTION,
  SET_LASSO_IS_ROUND,
  SET_MATRIX_FRAME_ENCODING,
  SET_MATRIX_ORIENTATION,
  SET_PILES,
  SET_PILES_COLORS,
  SET_SHOW_SPECIAL_CELLS,
  TRASH_PILES,
  UPDATE_FGM_CONFIG
} from 'components/fragments/fragments-actions';

import {
  ANIMATION,
  ARRANGE_MEASURES,
  CELL_SIZE,
  CONFIG,
  GRID_CELL_SIZE_LOCK,
  GRID_SIZE,
  HILBERT_CURVE,
  HIGLASS_SUB_SELECTION,
  LASSO_IS_ROUND,
  MATRIX_FRAME_ENCODING,
  MATRIX_ORIENTATION_INITIAL,
  MODE_MEAN,
  PILES,
  PILES_COLORS,
  SHOW_SPECIAL_CELLS
} from 'components/fragments/fragments-defaults';

import deepClone from 'utils/deep-clone';


function copyPilesState (state) {
  // Create copy of old state
  const newState = {};

  Object.keys(state).forEach((prop) => {
    newState[prop] = state[prop].slice();
  });

  return newState;
}


export function piles (state = PILES, action) {
  switch (action.type) {
    case ADD_PILES: {
      // Create copy of old state
      const newState = copyPilesState(state);

      Object.keys(action.payload.piles).forEach((pileId) => {
        newState[pileId] = action.payload.piles[pileId];
      });
      return newState;
    }

    case DISPERSE_PILES: {
      // Create copy of old state
      const newState = copyPilesState(state);

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
      // Create copy of old state
      const newState = copyPilesState(state);

      action.payload.piles
        .forEach((pileId) => {
          newState[`__${pileId}`] = [...newState[pileId]];
          newState[pileId] = [];
        });

      return newState;
    }

    case RECOVER_PILES: {
      // Create copy of old state
      const newState = copyPilesState(state);

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
      // Create copy of old state
      const newState = copyPilesState(state);

      // Adust new state
      Object.keys(action.payload.pileStacks).forEach((targetPile) => {
        const sourcePiles = action.payload.pileStacks[targetPile];

        // Add piles of source piles onto the target pile
        newState[targetPile]
          .push(
            ...sourcePiles
              .map(pileId => newState[pileId])
              .reduce((a, b) => a.concat(b), [])
          );

        // Reset the source piles
        sourcePiles.forEach(
          (pileId) => { newState[pileId] = []; }
        );
      });

      return newState;
    }

    case TRASH_PILES: {
      // Create copy of old state
      const newState = copyPilesState(state);

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

export function arrangeMeasures (state = ARRANGE_MEASURES, action) {
  switch (action.type) {
    case SET_ARRANGE_MEASURES:
      return action.payload.arrangeMeasures.slice();

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

export function gridCellSizeLock (state = GRID_CELL_SIZE_LOCK, action) {
  switch (action.type) {
    case SET_GRID_CELL_SIZE_LOCK:
      return action.payload.gridCellSizeLock;

    default:
      return state;
  }
}

export function gridSize (state = GRID_SIZE, action) {
  switch (action.type) {
    case SET_GRID_SIZE:
      return action.payload.gridSize;

    default:
      return state;
  }
}

export function hilbertCurve (state = HILBERT_CURVE, action) {
  switch (action.type) {
    case SET_HILBERT_CURVE:
      return action.payload.hilbertCurve;

    default:
      return state;
  }
}

export function higlassSubSelection (state = HIGLASS_SUB_SELECTION, action) {
  switch (action.type) {
    case SET_HIGLASS_SUB_SELECTION:
      return action.payload.higlassSubSelection;

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

export function matrixFrameEncoding (state = MATRIX_FRAME_ENCODING, action) {
  switch (action.type) {
    case SET_MATRIX_FRAME_ENCODING:
      return action.payload.frameEncoding;

    default:
      return state;
  }
}

export function matrixOrientation (state = MATRIX_ORIENTATION_INITIAL, action) {
  switch (action.type) {
    case SET_MATRIX_ORIENTATION:
      return action.payload.orientation;

    default:
      return state;
  }
}

export function pilesColors (state = PILES_COLORS, action) {
  switch (action.type) {
    case SET_PILES_COLORS: {
      const newState = { ...state };

      Object.keys(action.payload.pilesColors).forEach((pileId) => {
        const colorId = action.payload.pilesColors[pileId];

        if (colorId === -1) {
          newState[pileId] = undefined;
          delete newState[pileId];
        } else {
          newState[pileId] = colorId;
        }
      });

      return newState;
    }

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
  arrangeMeasures,
  cellSize,
  config,
  coverDispMode,
  gridCellSizeLock,
  gridSize,
  hilbertCurve,
  higlassSubSelection,
  lassoIsRound,
  matrixFrameEncoding,
  matrixOrientation,
  piles,
  pilesColors,
  showSpecialCells
});
