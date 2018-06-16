import {
  updateConfig as updateHglConfig
} from 'components/higlass/higlass-actions';

import {
  setDataDims,
  setDataPadding,
  setDataPercentile,
  setDataIgnoreDiags,
  selectPile,
  updateConfig as updateFgmConfig
} from 'components/fragments/fragments-actions';

import FgmState from 'components/fragments/fragments-state';

export const UPDATE_CONFIG = 'UPDATE_CONFIG';

export const updateConfigs = config => (dispatch) => {
  // Reset entire fgm state
  FgmState.reset();

  dispatch(selectPile(null));
  dispatch(updateHglConfig(config.hgl));
  dispatch(updateFgmConfig(config.fgm));

  if (config.fgm.fragmentsDims) {
    dispatch(setDataDims(config.fgm.fragmentsDims));
  }
  if (config.fgm.fragmentsPadding) {
    dispatch(setDataPadding(config.fgm.fragmentsPadding));
  }
  if (config.fgm.fragmentsPercentile) {
    dispatch(setDataPercentile(config.fgm.fragmentsPercentile));
  }
  if (config.fgm.fragmentsIgnoreDiags) {
    dispatch(setDataIgnoreDiags(config.fgm.fragmentsIgnoreDiags));
  }
};


export const RESET_STATE = 'RESET_STATE';

export const resetState = () => ({
  type: RESET_STATE,
  payload: undefined
});
