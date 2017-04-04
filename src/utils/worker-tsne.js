/* eslint no-var:0, prefer-arrow-callback:0, no-undef:0 */

self.onmessage = function (event) {
  var msg = event.data;
  var currcost = 100;
  var results;

  var model = new TSNE({
    dim: msg.dim || 2,
    perplexity: msg.perplexity || 25.0,
    earlyExaggeration: msg.earlyExaggeration || 4.0,
    learningRate: msg.learningRate || 25.0,
    nIter: msg.nIter || 1000,
    metric: msg.metric || 'euclidean'
  });

  model.init({
    data: msg.data,
    type: 'dense'
  });

  model.on('progressData', function (pos) {
    self.postMessage({ pos: model.getOutputScaled() });
  });

  model.on('progressIter', function (iter) {
    currcost = (currcost * 0.9) + iter[1];
    self.postMessage({
      iterations: iter[0],
      cost: iter[1],
      stop: currcost < 20
    });
  });

  results = model.run();

  self.postMessage({
    err: results[0],
    iterations: results[1],
    stop: true
  });
};
