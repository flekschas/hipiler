/* eslint no-var:0, prefer-arrow-callback:0, object-shorthand:0, no-undef:0 */

self.onmessage = function (event) {
  var error;
  var clusters = [];
  var kmeans = new clusterfck.Kmeans(event.data.centroids || []);

  try {
    clusters = kmeans.cluster(event.data.data, event.data.numClusters || 3);
  } catch (e) {
    error = e.message;
  }

  clusters = clusters.map(function (cluster) {
    return cluster.map(function (entry) {
      return entry.id;
    });
  });

  self.postMessage({
    clusters: clusters,
    error: error
  });
};
