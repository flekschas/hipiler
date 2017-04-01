/* eslint clusterfck:false */

self.onmessage = function (event) {
  let error;
  let clusters = [];

  const kmeans = new clusterfck.Kmeans(event.data.centroids || []);

  try {
    clusters = kmeans.cluster(event.data.data, event.data.numClusters || 3);
  } catch (e) {
    error = e.message;
  }

  clusters = clusters.map(cluster => cluster.map(entry => entry.id));

  self.postMessage({
    clusters,
    error
  });
};
