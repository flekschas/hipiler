export const UPDATE_WIDTH = 'UPDATE';

export const updateWidth = (column, width) => {
  return {
    type: UPDATE_WIDTH,
    payload: {
      column,
      width
    }
  };
};
