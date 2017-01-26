export const UPDATE_CONFIG = 'UPDATE_CONFIG';

export const updateConfig = (config) => {
  return {
    type: UPDATE_CONFIG,
    payload: {
      config
    }
  };
};
