export const UPDATE_CONFIG = 'UPDATE_CONFIG';

import { updateConfig as updateHglConfig } from 'components/higlass/actions';
import { updateConfig as updateFgmConfig } from 'components/fragments/actions';

export const updateConfigs = (config) => {
  return function (dispath) {
    dispath(updateHglConfig(config.hgl));
    dispath(updateFgmConfig(config.fgm));
  };
};
