export const UPDATE_CONFIG = 'UPDATE_CONFIG';

import { updateConfig as updateHglConfig } from 'views/higlass.actions';
import { updateConfig as updateMdmConfig } from 'views/decompose.actions';

export const updateConfigs = (config) => {
  return function (dispath) {
    dispath(updateHglConfig(config.hgl));
    dispath(updateMdmConfig(config.mdm));
  };
};
