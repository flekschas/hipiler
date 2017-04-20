// Aurelia
import { inject, InlineViewStrategy } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Docs
import sidebar from 'text!../../assets/wiki/sidebar.html';  // eslint-disable-line import/no-webpack-loader-syntax
import wiki from 'text!../../assets/wiki/wiki.html';  // eslint-disable-line import/no-webpack-loader-syntax


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

  attached () {
    this.sidebarOffsetTop = this.sidebarEl.getBoundingClientRect().top -
      document.body.getBoundingClientRect().top;

    this.initEventListeners();
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
    this.subscriptions.push(
      this.event.subscribe('app.scroll', this.adjustSidebarPos.bind(this))
    );
  }
}
