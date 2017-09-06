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

const round = (num, dec = 2) => Number(
  `${Math.round(`${num}e+${dec}`)}e-${dec}`
);

const scientificify = (num, dec = 3) => (num > 9999 ?
  num.toExponential(dec) :
  round(num, dec)
);


@inject(EventAggregator)
export class Chartlet {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) axisX;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) axisY;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) data;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) opts;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) update;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) width;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) height;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) scientificify;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) numPrecision;  // eslint-disable-line

  constructor (event) {
    this.color = GRAY_DARK;
    this.event = event;
    this.indices = [];
    this.renderDb = debounce(this.render.bind(this), 175);
  }

  attached () {
    this.render();
    this.subscribeEventListeners();
  }

  detached () {
    this.unsubscribeEventListeners();
  }

  dataChanged (newData) {
    const fraction = newData.values.length / 5;

    this.indices = newData.values.length > 10
      ? Array.from(Array(6)).map((x, index) => parseInt(index * fraction, 10))
      : Array.from(Array(newData.values.length)).map((x, index) => index);
  }

  render () {
    requestNextAnimationFrame(() => {
      this.width = this.plotWrapperEl.getBoundingClientRect().width;

      requestNextAnimationFrame(() => {
        this.range = drawing.render([this.plotEl], [[this.data.values]]).range;
        if (this.scientificify) {
          this.range = this.range.map(
            num => scientificify(num, this.numPrecision || 3)
          );
        }
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
