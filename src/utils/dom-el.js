/**
 * Simple jQuery-like DOM library
 *
 * @type  {Object}
 */
const DomEl = {
  /**
   * Add a class to the wrapped DOM element.
   *
   * @param {string} className - Class name to be added.
   * @return {object} Self.
   */
  addClass (className) {
    if (!this.hasClass(className)) {
      const space = this.node.className.length > 0 ? ' ' : '';

      this.node.className += `${space}${className}`;
    }

    return this;
  },

  /**
   * Dispatch a manuel DOM event from the wrapper DOM element.
   *
   * @param {string} eventName - Name of the event.
   * @param {string} eventType - Event type.
   * @param {boolean} blubbles - If `true` the event bubbles up the DOM tree.
   * @param {boolean} cancelable - If `true` the event is cancelable.
   * @return {object} Self.
   */
  dispatch (eventName, eventType, blubbles, cancelable) {
    const event = document.createEvent(eventType || 'Event');

    event.initEvent(eventName, blubbles || true, cancelable);

    this.node.dispatchEvent(event);

    return this;
  },

  /**
   * Check of the wrapped DOM element has a class.
   *
   * @param {string} className - Class name to be checked.
   * @return {boolean} If `true` DOM element has `className`.
   */
  hasClass (className, pos) {
    const re = new RegExp(`\\s?${className}\\s?`);

    const results = this.node.className.match(re);

    if (results) {
      return pos ? { index: results.index, match: results[0] } : true;
    }

    return pos ? -1 : false;
  },

  node: undefined,

  /**
   * Remove a class from the wrapped DOM element.
   *
   * @param {string} className - Class name to be removed.
   * @return {object} Self.
   */
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
