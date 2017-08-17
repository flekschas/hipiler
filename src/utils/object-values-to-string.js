const objValsToStr = obj => Object
  .keys(obj)
  .map(key => obj[key])
  .reduce((str, value) => str.concat(value), '');

export default objValsToStr;
