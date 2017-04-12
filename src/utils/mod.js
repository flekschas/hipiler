/**
 * Java-inspired Modulo method for negative numbers
 *
 * @description
 * JS: -13 % 64 === -13
 * Java (this method): -13 % 64 === 51
 *
 * @param {number} n - Number to be taken modulo.
 * @param {number} m - The modulo.
 * @return {number} Result.
 */
export default function mod (n, m) {
  return ((n % m) + m) % m;
}
