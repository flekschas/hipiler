/* eslint TSNE:false */

self.onmessage = function (e) {
  let msg = e.data;
  let currcost = 100;

  let model = new TSNE({
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

  model.on('progressData', (pos) => {
    self.postMessage({ pos: model.getOutputScaled() });
  });

  model.on('progressIter', (iter) => {
    currcost = (currcost * 0.9) + iter[1];
    self.postMessage({
      iterations: iter[0],
      cost: iter[1],
      stop: currcost < 20
    });
  });

  let [error, iter] = model.run();

  self.postMessage({
    err: error,
    iterations: iter,
    stop: true
  });
};
