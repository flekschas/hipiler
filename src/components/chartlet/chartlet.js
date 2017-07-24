// Aurelia
import {
  bindable,
  bindingMode,
  inject  // eslint-disable-line
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

import {
  GRAY_DARK
} from 'configs/colors';

import debounce from 'utils/debounce';

import {
  requestNextAnimationFrame
} from 'utils/request-animation-frame';

import drawing from 'components/chartlet/chartlet-drawing';


@inject(EventAggregator)
export class Chartlet {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) axisX;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) axisY;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) data;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) opts;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) update;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) width;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) height;  // eslint-disable-line

  constructor (event) {
    this.color = GRAY_DARK;
    this.event = event;
    this.renderDb = debounce(this.render.bind(this), 175);
  }

  attached () {
    this.render();
    this.subscribeEventListeners();
  }

  detached () {
    this.unsubscribeEventListeners();
  }

  render () {
    requestNextAnimationFrame(() => {
      this.width = this.plotWrapperEl.getBoundingClientRect().width;

      requestNextAnimationFrame(() => {
        this.range = drawing.render([this.plotEl], [[this.data.values]]).range;
      });
    });
  }

  subscribeEventListeners () {
    this.subscriptions = [];
    this.update.forEach((eventName) => {
      this.subscriptions.push(this.event.subscribe(
        eventName,
        this.renderDb.bind(this)
      ));
    });
  }

  unsubscribeEventListeners () {
    // Remove Aurelia event listeners
    this.subscriptions.forEach((subscription) => {
      subscription.dispose();
    });
    this.subscriptions = [];
  }
}
