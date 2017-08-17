const logger = store => next => (action) => {
  console.group(action.type);  // eslint-disable-line no-console
  console.info('%c dispatching', 'color: #7fbcff', action);  // eslint-disable-line no-console
  let result = next(action);
  console.log('%c next state', 'color: #8eff80', store.getState());  // eslint-disable-line no-console
  console.groupEnd(action.type);  // eslint-disable-line no-console
  return result;
};

export default logger;
