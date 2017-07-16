// Aurelia
import {
  inject,  // eslint-disable-line
  InlineViewStrategy
} from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

// Docs
import sidebar from 'text!../../assets/wiki/sidebar.html';  // eslint-disable-line import/no-webpack-loader-syntax
import wiki from 'text!../../assets/wiki/wiki.html';  // eslint-disable-line import/no-webpack-loader-syntax

// Utils etc.
import debounce from 'utils/debounce';
import scrollToAnchor from 'utils/scroll-to-anchor';


@inject(EventAggregator)
export class Docs {
  constructor (event) {
    this.event = event;

    this.docs = new InlineViewStrategy(wiki);

    this.sidebar = new InlineViewStrategy(sidebar);
    this.sidebarCss = {};

    this.subscriptions = [];
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  activate (urlParams) {
    const anchor1 = urlParams.anchor ? urlParams.anchor : '';
    const anchor2 = urlParams.anchor2 ? `/${urlParams.anchor2}` : '';

    if (anchor1) {
      this.anchor = `/docs/${anchor1}${anchor2}`;
    }
  }

  attached () {
    this.sidebarOffsetTop = this.sidebarEl.getBoundingClientRect().top -
      document.body.getBoundingClientRect().top;

    this.initEventListeners();

    if (this.anchor) {
      scrollToAnchor(this.anchor);
    }
  }

  detached () {
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = [];
  }

  /* ---------------------------- Class methods ----------------------------- */

  adjustSidebarPos (event) {
    this.sidebarMarginTop = Math.abs(
      this.sidebarOffsetTop - this.sidebarEl.getBoundingClientRect().top
    );

    this.sidebarMarginTop = (this.sidebarMarginTop - 48) < 0 ? 0 : this.sidebarMarginTop - 48;

    this.sidebarCss = {
      'padding-top': `${this.sidebarMarginTop}px`
    };
  }

  initEventListeners () {
    const adjustSidebarPosDb = debounce(this.adjustSidebarPos.bind(this), 50);

    this.subscriptions.push(
      this.event.subscribe('app.scroll', adjustSidebarPosDb)
    );
  }
}
