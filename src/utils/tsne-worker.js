const TSNE = function () {};

export default function tsneWorker (self) {
  self.onmessage = function (e) {
    let msg = e.data;
    let currcost = 100;

    let model = new TSNE({
      dim: msg.dim || 2,
      perplexity: msg.perplexity || 100.0,
      earlyExaggeration: msg.earlyExaggeration || 4.0,
      learningRate: msg.learningRate || 100.0,
      nIter: msg.nIter || 500,
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

    let run = model.run();

    self.postMessage({
      err: run[0],
      iterations: run[1],
      stop: true
    });
  };
}
