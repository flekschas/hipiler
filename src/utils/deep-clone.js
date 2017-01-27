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

  for (let name in source) {
    target[name] = typeof target[name] === 'undefined' ?
      extend(undefined, source[name]) : target[name];
  }

  return target;
}

export default function (source) {
  let target;
  return extend(target, source);
}
