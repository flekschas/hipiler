export default function (el, target) {
  let _el = el;

  while (_el !== target && _el.tagname !== 'HTML') {
    _el = _el.parentNode;
  }

  if (_el === target) {
    return true;
  }

  return false;
}
