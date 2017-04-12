/**
 * Check if two arrays are shallowly equal in terms of their values.
 *
 * @description
 * This methid assumes that arrays of primitives are compared.
 *
 * @param {array} a - First array.
 * @param {array} b - Second array,
 * @return {boolean} If `true` arrays are equal.
 */
export default function arraysEqual (a, b) {
  if (!a || !b) { return false; }

  if (a.length !== b.length) { return false; }

  return a.every((element, index) => element === b[index]);
}
