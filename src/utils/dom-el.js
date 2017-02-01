const DomEl = {
  addClass (className) {
    if (!this.hasClass(className)) {
      const space = this.node.className.length > 0 ? ' ' : '';

      this.node.className += `${space}${className}`;
    }

    return this;
  },

  dispatch (eventName, eventType, blubbles, cancelable) {
    const event = document.createEvent(eventType || 'Event');

    event.initEvent(eventName, blubbles || true, cancelable);

    this.node.dispatchEvent(event);

    return this;
  },

  hasClass (className, pos) {
    const re = new RegExp(`\\s?${className}\\s?`);

    const results = this.node.className.match(re);

    if (results) {
      return pos ? { index: results.index, match: results[0] } : true;
    }

    return pos ? -1 : false;
  },

  node: undefined,

  removeClass (className) {
    const re = this.hasClass(className, true);

    if (re.index >= 0) {
      this.node.className = `${this.node.className.substr(0, re.index)} ${this.node.className.substr(re.index + re.match.length)}`.trim();
    }

    return this;
  }
};

export default function DomElFactory (el) {
  // This is the factory function's _constructor_ if you will

  const inst = Object.create(DomEl);
  inst.node = el;

  return inst;
}
