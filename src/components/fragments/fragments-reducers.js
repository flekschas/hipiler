import { combineReducers } from 'redux';

import {
  ADD_PILES,
  CLOSE_PILES_INSPECTION,
  DISPERSE_PILES,
  DISPERSE_PILES_INSPECTION,
  INSPECT_PILES,
  RECOVER_PILES,
  REMOVE_PILES_INSPECTION,
  SELECT_PILE,
  SET_ANIMATION,
  SET_ARRANGE_MEASURES,
  SET_CELL_SIZE,
  SET_COVER_DISP_MODE,
  SET_GRID_CELL_SIZE_LOCK,
  SET_GRID_SIZE,
  SET_HILBERT_CURVE,
  SET_HIGLASS_SUB_SELECTION,
  SET_LASSO_IS_ROUND,
  SET_LOG_TRANSFORM,
  SET_MATRICES_COLORS,
  SET_MATRIX_FRAME_ENCODING,
  SET_MATRIX_ORIENTATION,
  SET_PILES,
  SET_SHOW_SPECIAL_CELLS,
  SET_TSNE_EARLY_EXAGGERATION,
  SET_TSNE_ITERATIONS,
  SET_TSNE_LEARNING_RATE,
  SET_TSNE_PERPLEXITY,
  SPLIT_PILES,
  STACK_PILES,
  STACK_PILES_INSPECTION,
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
  LOG_TRANSFORM,
  MATRICES_COLORS,
  MATRIX_FRAME_ENCODING,
  MATRIX_ORIENTATION_INITIAL,
  MODE_AVERAGE,
  PILES_INSPECTION,
  PILES,
  SELECTED_PILE,
  SHOW_SPECIAL_CELLS,
  TSNE_EARLY_EXAGGERATION,
  TSNE_ITERATIONS,
  TSNE_LEARNING_RATE,
  TSNE_PERPLEXITY
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

function disperse (pilesFromAction, pilesConfig) {
  // Disperse matrices
  pilesFromAction
    .map(pileId => pilesConfig[pileId].slice(1))  // Always keep one matrix
    .reduce((a, b) => a.concat(b), [])
    .forEach((pileId) => {
      pilesConfig[pileId] = [pileId];
    });

  // Update original pile
  pilesFromAction
    .forEach((pileId) => {
      pilesConfig[pileId] = pilesConfig[pileId].slice(0, 1);
    });

  return pilesConfig;
}

function stack (pileStacks, pilesConfig) {
  // Adust new state
  Object.keys(pileStacks).forEach((targetPile) => {
    const sourcePiles = pileStacks[targetPile];

    // Do not pile up snippets on themselves
    if (sourcePiles.indexOf(targetPile) !== -1) { return; }

    // Add piles of source piles onto the target pile
    pilesConfig[targetPile]
      .push(
        ...sourcePiles
          .map(pileId => pilesConfig[pileId])
          .reduce((a, b) => a.concat(b), [])
      );

    // Reset the source piles
    sourcePiles.forEach(
      (pileId) => { pilesConfig[pileId] = []; }
    );
  });

  return pilesConfig;
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

export function coverDispMode (state = MODE_AVERAGE, action) {
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

export function logTransform (state = LOG_TRANSFORM, action) {
  switch (action.type) {
    case SET_LOG_TRANSFORM:
      return action.payload.logTransform;

    default:
      return state;
  }
}

export function matricesColors (state = MATRICES_COLORS, action) {
  switch (action.type) {
    case SET_MATRICES_COLORS: {
      const newState = { ...state };

      Object.keys(action.payload.matricesColors).forEach((pileId) => {
        const colorId = action.payload.matricesColors[pileId];

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

export function pilesInspection (state = PILES_INSPECTION, action) {
  switch (action.type) {
    case DISPERSE_PILES_INSPECTION: {
      const newState = [...state];
      const pilesConfig = copyPilesState(newState[newState.length - 1]);

      // Replace last pile pilesConfig
      newState.splice(-1, 1, disperse(action.payload.piles, pilesConfig));

      return newState;
    }

    case CLOSE_PILES_INSPECTION:
      return state.slice(0, -1);

    case INSPECT_PILES: {
      const newState = [...state];

      const newPilesConfig = {};

      Object.keys(action.payload.piles)
        .map((pileId) => {
          if (!newPilesConfig.__source) {
            newPilesConfig.__source = [];
          }

          newPilesConfig.__source.push(pileId);

          return action.payload.piles[pileId];
        })
        .filter(matrices => matrices.length)
        .reduce((acc, value) => acc.concat(value), [])
        .forEach((matrixId) => {
          newPilesConfig[matrixId] = [matrixId];
        });

      if (Object.keys(newPilesConfig).length < 2) { return state; }

      newState.push(newPilesConfig);

      return newState;
    }

    case REMOVE_PILES_INSPECTION: {
      // Create copy of old state
      const newState = [...state];
      const times = action.payload.recursive ? newState.length : 1;

      for (let i = 0; i < times; i++) {
        const pilesConfig = copyPilesState(newState[newState.length - (i + 1)]);

        Object.keys(action.payload.piles)
          .forEach((pileId) => {
            pilesConfig[pileId] = [];
          });

        newState[newState.length - (i + 1)] = pilesConfig;
      }

      return newState;
    }

    case STACK_PILES_INSPECTION: {
      const newState = [...state];
      const pilesConfig = copyPilesState(newState[newState.length - 1]);

      // Replace last pile pilesConfig
      newState.splice(-1, 1, stack(action.payload.pileStacks, pilesConfig));

      return newState;
    }

    default:
      return state;
  }
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

    case DISPERSE_PILES:
      return disperse(action.payload.piles, copyPilesState(state));

    case SPLIT_PILES: {
      // Create copy of old state
      const newState = copyPilesState(state);

      Object.keys(action.payload.piles)
        .forEach((sourcePileId) => {
          const pile = newState[sourcePileId];
          const newPileIds = action.payload.piles[sourcePileId];

          if (pile.length > 1) {
            newPileIds.forEach((pileId) => {
              const idx = pile.indexOf(pileId);

              // If the index is zero we need to "rename" the pile since the
              // first matrix of a pile defines the pile's ID.
              if (idx === 0) {
                sourcePileId = pile[1];
                newState[sourcePileId] = pile.slice(1);
                newState[pileId] = [pileId];
              }

              if (idx > 0) {
                pile.splice(idx, 1);
                newState[pileId] = [pileId];
              }
            });
          }
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

    case STACK_PILES:
      return stack(action.payload.pileStacks, copyPilesState(state));

    case TRASH_PILES: {
      // Create copy of old state
      const newState = copyPilesState(state);

      action.payload.piles
        .filter(pileId => pileId.length > 0 && pileId[0] !== '_')
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

export function pileSelected (state = SELECTED_PILE, action) {
  switch (action.type) {
    case SELECT_PILE:
      return action.payload.pile;

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

export function tsneEarlyExaggeration (
  state = TSNE_EARLY_EXAGGERATION, action
) {
  switch (action.type) {
    case SET_TSNE_EARLY_EXAGGERATION:
      return action.payload.earlyExaggeration;

    default:
      return state;
  }
}

export function tsneIterations (state = TSNE_ITERATIONS, action) {
  switch (action.type) {
    case SET_TSNE_ITERATIONS:
      return action.payload.iterations;

    default:
      return state;
  }
}

export function tsneLearningRate (state = TSNE_LEARNING_RATE, action) {
  switch (action.type) {
    case SET_TSNE_LEARNING_RATE:
      return action.payload.learningRate;

    default:
      return state;
  }
}

export function tsnePerplexity (state = TSNE_PERPLEXITY, action) {
  switch (action.type) {
    case SET_TSNE_PERPLEXITY:
      return action.payload.perplexity;

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
  logTransform,
  matricesColors,
  matrixFrameEncoding,
  matrixOrientation,
  piles,
  pilesInspection,
  pileSelected,
  showSpecialCells,
  tsneEarlyExaggeration,
  tsneIterations,
  tsneLearningRate,
  tsnePerplexity
});
