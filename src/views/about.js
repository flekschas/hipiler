// Utils etc.
import anchorLink, { getAnchor } from 'utils/anchor-link';
import scrollToAnchor from 'utils/scroll-to-anchor';


export class About {
  constructor () {
    this.anchorLink = anchorLink;
    this.getAnchor = getAnchor;
  }

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
