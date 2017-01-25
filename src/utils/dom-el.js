export default class DomEl {
  constructor (el) {
    this.node = el;
  }

  addClass (className) {
    if (this.hasClass(className) >= 0) {
      const space = this.node.className.length > 0 ? ' ' : '';

      this.node.className += `${space}${className}`;
    }
  }

  hasClass (className, pos) {
    const re = new RegExp(`\\s?${className}\\s?`);

    const results = this.node.className.match(re);

    if (results) {
      return pos ? { index: results.index, match: results[0] } : true;
    }

    return pos ? -1 : false;
  }

  removeClass (className) {
    const re = this.hasClass(className, true);

    if (re.index >= 0) {
      this.node.className = `${this.node.className.substr(0, re.index)} ${this.node.className.substr(re.index + re.match.length)}`;
    }
  }
}
