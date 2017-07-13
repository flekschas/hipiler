// Utils etc.
import scrollToAnchor from 'utils/scroll-to-anchor';

export class About {
  /* ----------------------- Aurelia-specific methods ----------------------- */

  activate (urlParams) {
    if (urlParams.anchor) {
      this.anchor = `/about/${urlParams.anchor}`;
    }
  }

  attached () {
    if (this.anchor) {
      scrollToAnchor(this.anchor);
    }
  }
}
