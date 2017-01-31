export const UPDATE_FGM_CONFIG = 'UPDATE_FGM_CONFIG';

export const updateConfig = (config) => {
  return {
    type: UPDATE_FGM_CONFIG,
    payload: {
      config
    }
  };
};
