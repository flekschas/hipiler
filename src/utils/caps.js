/**
 * Capitalize string
 *
 * @param {string} string - String to be capitalized.
 * @param {boolean} force - If `true` force lower casing.
 * @return {string} Capitalized string
 */
export default function caps (string, force) {
  if (force) {
    string = string.toLowerCase();
  }

  return string.charAt(0).toUpperCase() + string.slice(1);
}
