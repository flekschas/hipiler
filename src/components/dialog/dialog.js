// Aurelia
import {
  bindable,
  bindingMode,
  inject  // eslint-disable-line
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

@inject(EventAggregator)
export class Dialog {
  @bindable({ defaultBindingMode: bindingMode.twoWay }) deferred = {};  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.twoWay }) isOpen = false;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) message = '';  // eslint-disable-line

  constructor (event) {
    this.event = event;

    this.subscriptions = [];

    this.initEventListeners();
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  /**
   * Called once the component is detached.
   */
  detached () {
    // Unsubscribe from Aurelia events
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = undefined;
  }

  /* ---------------------------- Class methods ----------------------------- */

  /**
   * Cancel dialog. This will reject the promise and clode the dialog window.
   */
  cancel () {
    if (this.deferred && this.deferred.reject) {
      this.deferred.reject(Error());
      this.isOpen = false;
    }
  }

  /**
   * Initializae event listeners.
   */
  initEventListeners () {
    this.subscriptions.push(
      this.event.subscribe('app.keyUp', this.keyUpHandler.bind(this))
    );
  }

  /**
   * Handle key up events and delegate the tasks.
   *
   * @param {object} event - Event object.
   */
  keyUpHandler (event) {
    switch (event.keyCode) {
      case 13:  // Enter
        this.okay();
        break;

      case 27:  // ESC
        this.cancel();
        break;

      default:
        // Nothing
        break;
    }
  }

  /**
   * Accept dialog. This will resolve the promise and close the dialog.
   */
  okay () {
    if (this.deferred && this.deferred.resolve) {
      this.deferred.resolve();
      this.isOpen = false;
    }
  }
}
