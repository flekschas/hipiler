/**
 * Deep clone an object
 *
 * @param {object} target - Target object or undefined to create a new object.
 * @param {object} source - Object to be cloned.
 * @return {object} Cloned `source` object
 */
function extend (target, source) {
  if (source === null || typeof source !== 'object') {
    return source;
  }

  if (source.constructor !== Object && source.constructor !== Array) {
    return source;
  }

  if (
    source.constructor === Date ||
    source.constructor === RegExp ||
    source.constructor === Function ||
    source.constructor === String ||
    source.constructor === Number ||
    source.constructor === Boolean
  ) {
    return new source.constructor(source);
  }

  target = target || new source.constructor();

  Object.keys(source).forEach((attr) => {
    target[attr] = typeof target[attr] === 'undefined' ?
      extend(undefined, source[attr]) : target[attr];
  });

  return target;
}

export default function (source) {
  let target;
  return extend(target, source);
}
