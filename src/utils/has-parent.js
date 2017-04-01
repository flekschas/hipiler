export default function hasParent (el, target) {
  let _el = el;

  while (_el !== target && _el.tagName !== 'HTML') {
    _el = _el.parentNode;
  }

  if (_el === target) {
    return true;
  }

  return false;
}
