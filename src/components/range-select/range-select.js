// Aurelia
import {
  bindable,
  bindingMode,
  inject  // eslint-disable-line
} from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

// Injectables
import States from 'services/states';  // eslint-disable-line

import { EVENT_BASE_NAME } from 'components/range-select/range-select-defaults';


@inject(EventAggregator, States)
export class RangeSelect {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) eventId;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) from = 0;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) to = 1;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) selectFrom = 0;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) selectTo = 1;  // eslint-disable-line

  constructor (eventAggregator, states) {
    this.event = eventAggregator;

    this.store = states.store;
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    this.subscriptions = [];

    this.update();
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  /**
   * Called once the component is detached.
   */
  detached () {
    // Unsubscribe from redux store
    this.unsubscribeStore();

    // Unsubscribe from Aurelia events
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = undefined;
  }

  /* ---------------------------- Class methods ----------------------------- */

  mouseDownHandler (event, selector) {
    console.log('mousedown', event);
    this.mouseX = event.clientX;
    this.activeSelector = selector;
    this.range = this.baseEl.getBoundingClientRect();

    this.mouseMoveListener = this.event.subscribe(
      'app.mouseMove', this.mouseMoveHandler.bind(this)
    );
    this.event.subscribeOnce(
      'app.mouseUp', this.mouseUpHandler.bind(this)
    );
  }

  mouseUpHandler (event) {
    this.mouseX = undefined;
    console.log('mouseup', event);

    this.mouseMoveListener.dispose();
    this.mouseMoveListener = undefined;
    this.activeSelector = undefined;
  }

  mouseMoveHandler (event) {
    if (this.mouseX) {
      const isLeft = this.activeSelector === 'left';
      const newX = Math.min(
        isLeft ? this.selectTo - 0.01 : 1,
        Math.max(
          isLeft ? 0 : this.selectFrom + 0.01,
          (event.clientX - this.range.left) / this.range.width
        )
      );

      if (this.activeSelector === 'left') {
        this.selectFrom = newX;
      } else {
        this.selectTo = newX;
      }

      this.update();
    }
  }

  publish () {
    if (this.eventId) {
      this.event.publish(
        `${EVENT_BASE_NAME}.${this.eventId}`,
        {
          from: this.selectFrom,
          to: this.selectTo
        }
      );
    }
  }

  update () {
    this.rangeSelectorLeftCss = {
      left: `${this.selectFrom * 100}%`
    };
    this.rangeSelectorRightCss = {
      left: `${this.selectTo * 100}%`
    };
    this.selectedRangeCss = {
      left: `${this.selectFrom * 100}%`,
      right: `${(1 - this.selectTo) * 100}%`
    };
    console.log('this.rangeSelectorRightCss', this.rangeSelectorRightCss);
  }
}
