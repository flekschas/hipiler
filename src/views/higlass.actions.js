export const UPDATE_HGL_CONFIG = 'UPDATE_HGL_CONFIG';

export const updateConfig = (config) => {
  return {
    type: UPDATE_HGL_CONFIG,
    payload: {
      config
    }
  };
};
