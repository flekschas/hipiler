// Aurelia
import { inject, InlineViewStrategy } from 'aurelia-framework';

// Injectable
import States from 'services/states';

// Docs
import wiki from 'text!../../assets/wiki/wiki.html';  // eslint-disable-line import/no-webpack-loader-syntax


@inject(States)
export class Docs {
  constructor (states) {
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.docs = new InlineViewStrategy(wiki);

    this.update();
  }

  update () {}
}
