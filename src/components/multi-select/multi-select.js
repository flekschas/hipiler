// Aurelia
import {
  bindable,
  bindingMode,
  inject  // eslint-disable-line
} from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';  // eslint-disable-line

// Injectables
import States from 'services/states';  // eslint-disable-line

import { EVENT_BASE_NAME } from 'components/multi-select/multi-select-defaults';

import arraysEqual from 'utils/arrays-equal';
import hasParent from 'utils/has-parent';
import mod from 'utils/mod';
import queryObj from 'utils/query-obj';


@inject(EventAggregator, States)
export class MultiSelect {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) bottomUp = false;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) eventId;  // eslint-disable-line
  @bindable options = [];  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) placeholder;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) stateQuery;  // eslint-disable-line
  @bindable({ defaultBindingMode: bindingMode.oneWay }) disabled = false;  // eslint-disable-line

  constructor (eventAggregator, states) {
    this.event = eventAggregator;
    this.selectedOptions = [];
    this.search = '';
    this.selectedOptionsIdx = {};

    this.store = states.store;
    this.unsubscribeStore = this.store.subscribe(this.update.bind(this));

    this.subscriptions = [];
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  /**
   * Called once the component is attached.
   */
  attached () {
    this.subscriptions.push(this.event.subscribe(
      'app.click',
      (event) => {
        if (!hasParent(event.target, this.baseEl)) {
          this.deactivateOptions();
        }
      }
    ));

    this.update();
  }

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

  optionsChanged (newValue, oldValue) {
    this.update();
  }

  get selectableOptions () {
    return this.options
      .filter(option => (
        this.inputEl.value.length ?
          option.name.toLowerCase().indexOf(
            this.inputEl.value.toLowerCase()
          ) >= 0 : true
      ));
  }

  activateOptions () {
    if (this.disabled) { return; }
    this.focusedOptionId = -1;
    this.optionsIsActive = true;

    return true;
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
    if (this.disabled) { return; }

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
      this.options
        .filter(option => option.id === removedOption.id)
        .forEach((option) => { option.isSelected = false; });
    }

    this.publish();
  }

  select (option) {
    if (this.disabled) { return; }

    if (!option.isSelected) {
      this.selectedOptions.push(option);
      this.focusedOptionId = -1;
      option.isSelected = true;
      option.isFocus = false;

      this.publish();
    } else {
      this.unselect(option);
    }
  }

  selectBatch (options) {
    options.forEach((option) => {
      if (!option.isSelected) {
        this.selectedOptions.push(option);
        this.focusedOptionId = -1;
        option.isSelected = true;
        option.isFocus = false;

        this.publish();
      }
    });
  }

  unselect (optionRemove) {
    if (this.disabled || !optionRemove.isSelected) { return; }

    this.options
      .filter(option => option.id === optionRemove.id)
      .forEach((option) => {
        option.isSelected = false;
      });

    const index = this.selectedOptions.indexOf(optionRemove);

    if (index >= 0) {
      this.selectedOptions.splice(index, 1);
    }

    this.publish();
  }

  update () {
    const selectedOptionsState = queryObj(
      this.store.getState().present, this.stateQuery
    );

    const currentSelection = this.selectedOptions.map(option => option.id);

    if (
      !selectedOptionsState ||
      this.options.length === 0 ||
      this.selectedOptionsState === selectedOptionsState ||
      arraysEqual(currentSelection, selectedOptionsState)
    ) {
      return;
    }

    this.selectedOptionsState = selectedOptionsState;

    const newSelection = [];

    selectedOptionsState.forEach((selectedOptionId) => {
      this.options
        .filter(option => option.id === selectedOptionId)
        .forEach((option) => {
          option.isSelected = true;
          option.isFocus = false;
          newSelection.push(option);
        });
    });

    this.selectedOptions = newSelection;
  }
}
