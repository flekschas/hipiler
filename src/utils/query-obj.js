/**
 * Simple object query function
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
