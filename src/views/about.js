// Aurelia
import { inject } from 'aurelia-framework';

// Injectable
import States from 'services/states';


@inject(States)
export class About {
  constructor (states) {
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.update();
  }

  update () {}
}
