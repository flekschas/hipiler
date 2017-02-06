export const UPDATE_WIDTH = 'UPDATE_WIDTH';

export const updateWidth = (column, width) => ({
  type: UPDATE_WIDTH,
  payload: {
    column,
    width
  }
});
