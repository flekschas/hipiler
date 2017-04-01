/**
 * Throttle a function call.
 *
 * @description
 * Function calls are delayed by `wait` milliseconds but at least every `wait`
 * milliseconds a call is triggered.
 *
 * @param {functiom} func - Function to be debounced
 * @param {number} wait - Number of milliseconds to debounce the function call.
 * @param {boolean} immediate - If `true` function is not debounced.
 * @return {functiomn} Throttled function.
 */
export default function throttle (func, wait = 250, immediate = false) {
  let last;
  let deferTimer;

  const throttled = (...args) => {
    const now = Date.now();

    if (last && now < last + wait) {
      clearTimeout(deferTimer);

      deferTimer = setTimeout(() => {
        last = now;
        func(...args);
      }, wait);
    } else {
      last = now;
      func(...args);
    }
  };

  return throttled;
}
