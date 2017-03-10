let isReady;

const ready = new Promise((resolve) => {
  isReady = resolve;
});

let chromInfo;

export default class ChromInfo {
  get ready () {
    return ready;
  }

  get () {
    return chromInfo;
  }

  set (newChromInfo) {
    if (!chromInfo && newChromInfo) {
      chromInfo = newChromInfo;
      isReady(chromInfo);
    }
  }
}
