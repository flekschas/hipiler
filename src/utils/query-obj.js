/**
 * Simple object query function.
 *
 * @description
 * Assuming that you have a deeply nested object o:
 * ```
 * const o = {
 *   a: {
 *     b: {
 *       c: 'HiPiler rocks!'
 *     }
 *   }
 * }
 * ```
 * This object can be safely queried as follows:
 * ```
 * queryObj(o, ['a', 'b', 'c'])  // 'HiPiler rocks!'
 * queryObj(o, ['a', 'b', 'd'], 'Oh no!')  // 'Oh no!'
 * ```
 *
 * @param {object} obj - Object to be queried.
 * @param {array} queries - Array of queries.
 * @param {*} defVal - Default value to be returned when query fails.
 * @return {*} Value of the queried property or `undefined`.
 */
export default function queryObj (obj, queries, defVal) {
  try {
    const query = queries[0];
    const nextQueries = queries.slice(1);

    if (nextQueries.length) {
      return queryObj(obj[query], nextQueries);
    }

    return obj[query];
  } catch (e) {
    return defVal;
  }
}
