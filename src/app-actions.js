import {
  updateConfig as updateHglConfig
} from 'components/higlass/higlass-actions';

import {
  updateConfig as updateFgmConfig
} from 'components/fragments/fragments-actions';

export const UPDATE_CONFIG = 'UPDATE_CONFIG';

export const updateConfigs = config => (dispath) => {
  dispath(updateHglConfig(config.hgl));
  dispath(updateFgmConfig(config.fgm));
};


export const RESET_STATE = 'RESET_STATE';

export const resetState = () => ({
  type: RESET_STATE,
  payload: undefined
});
