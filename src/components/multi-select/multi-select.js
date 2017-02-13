// Aurelia
import {
  bindable,
  bindingMode,
  inject
} from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';

import { EVENT_BASE_NAME } from 'components/multi-select/multi-select-defaults';

import hasParent from 'utils/has-parent';
import mod from 'utils/mod';

@inject(EventAggregator)
export class MultiSelect {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) bottomUp = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) eventId;
  @bindable options;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) placeholder;

  constructor (eventAggregator) {
    this.event = eventAggregator;
    this.selectedOptions = [];
    this.search = '';
    this.selectedOptionsIdx = {};
  }

  attached () {
    this.event.subscribe(
      'app.click',
      (event) => {
        if (!hasParent(event.target, this.baseEl)) {
          this.deactivateOptions();
        }
      }
    );

    this.event.subscribe(
      `${EVENT_BASE_NAME}.${this.eventId}.update`,
      this.update.bind(this)
    );

    this.update();
  }

  get selectableOptions () {
    return this.options
      .filter(option => !option.isSelected)
      .filter(option => (
        this.inputEl.value.length ?
          option.name.toLowerCase().indexOf(
            this.inputEl.value.toLowerCase()
          ) >= 0 : true
      ));
  }

  activateOptions () {
    this.focusedOptionId = -1;
    this.optionsIsActive = true;
  }

  deactivateOptions () {
    this.optionsIsActive = false;
  }

  focusOption (id, dir) {
    const next = (dir === 'down' ? 1 : -1) * (this.bottomUp ? 1 : -1);

    if (typeof id === 'undefined') {
      if (this.focusedOptionId < 0) {
        if (this.bottomUp) {
          this.focusedOptionId = this.options.length - 1;
        } else {
          this.focusedOptionId = 0;
        }
      } else {
        this.focusedOptionId = mod(
          this.focusedOptionId + next, this.options.length
        );
      }
    } else {
      this.focusedOptionId = id % this.options.length;
    }

    if (typeof this.optionIsFocus !== 'undefined') {
      this.optionIsFocus.isFocus = false;
    }

    this.options[this.focusedOptionId].isFocus = true;
    this.optionIsFocus = this.options[this.focusedOptionId];
  }

  focusOptionUp () {
    this.focusOption(undefined, 'up');
  }

  focusOptionDown () {
    this.focusOption(undefined, 'down');
  }

  keyDownHandler (event) {
    switch (event.keyCode) {
      case 13:  // Enter
        if (this.focusedOptionId >= 0) {
          this.select(this.options[this.focusedOptionId]);
        }
        break;

      case 38:  // Up
        this.focusOptionUp();
        break;

      case 40:  // Down
        this.focusOptionDown();
        break;

      case 8:  // Backspace
      case 46:  // Delete
        if (event.target.value.length > 0) {
          return true;
        }
        this.removeLastSelectedOption();
        break;

      default:
        return true;
    }
  }

  publish () {
    if (this.eventId) {
      this.event.publish(
        `${EVENT_BASE_NAME}.${this.eventId}`,
        this.selectedOptions
      );
    }
  }

  removeLastSelectedOption () {
    const removedOption = this.selectedOptions.pop();

    if (removedOption) {
      this.selectedOptionsIdx[removedOption.id] = undefined;
      this.options
        .filter(option => option.id === removedOption.id)
        .forEach((option) => { option.isSelected = false; });
    }

    this.publish();
  }

  removeSelectedOption (optionRemove) {
    const index = this.selectedOptions.findIndex(
      option => option.id === optionRemove.id
    );

    if (index >= 0) {
      const removedOption = this.selectedOptions.splice(index, 1);

      this.selectedOptionsIdx[removedOption.id] = undefined;

      this.options
        .filter(option => option.id === optionRemove.id)
        .forEach((option) => { option.isSelected = false; });
    }

    this.publish();
  }

  select (option) {
    if (typeof this.selectedOptionsIdx[option.id] === 'undefined') {
      this.selectedOptions.push(option);
      this.focusedOptionId = -1;
      option.isSelected = true;
      option.isFocus = false;

      this.selectedOptionsIdx[option.id] = this.selectedOptions.length - 1;

      this.publish();
    }
  }

  update () {
    this.options
      .filter(option => option.isSelected)
      .forEach((option) => {
        this.selectedOptions.push(option);
      });
  }
}
