/* eslint clusterfck:false */

self.onmessage = function (event) {
  let error;
  let clusters;

  const kmeans = new clusterfck.Kmeans(event.data.centroids || []);

  try {
    clusters = kmeans.cluster(event.data.data, event.data.numClusters || 3);
  } catch (e) {
    error = e.message;
  }

  self.postMessage({
    clusters,
    error
  });
};
