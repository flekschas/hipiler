const getters = {};

export default class Export {
  get (data) {
    if (typeof getters[data] === 'function') {
      return getters[data]();
    }
  }

  register (data, getter) {
    getters[data] = getter;
  }
}
