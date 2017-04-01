export default function queryObj (obj, queries) {
  try {
    const query = queries[0];
    const nextQueries = queries.slice(1);

    if (nextQueries.length) {
      return queryObj(obj[query], nextQueries);
    }

    return obj[query];
  } catch (e) {
    return undefined;
  }
}
