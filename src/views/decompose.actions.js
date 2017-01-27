export const UPDATE_WIDTH = 'UPDATE_WIDTH';

export const updateWidth = (column, width) => {
  return {
    type: UPDATE_WIDTH,
    payload: {
      column,
      width
    }
  };
};

export const UPDATE_MDM_CONFIG = 'UPDATE_MDM_CONFIG';

export const updateConfig = (config) => {
  return {
    type: UPDATE_MDM_CONFIG,
    payload: {
      config
    }
  };
};
