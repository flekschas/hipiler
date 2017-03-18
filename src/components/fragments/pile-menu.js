// Aurelia
import {
  bindable,
  bindingMode,
  LogManager
} from 'aurelia-framework';

import commands from 'components/fragments/pile-menu-commands';

// import debounce from 'utils/debounce';

const logger = LogManager.getLogger('pile-menu');

export class PileMenu {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) isActive = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) position = {};
  @bindable({ defaultBindingMode: bindingMode.oneWay }) alignLeft = false;

  positionChanged () {
    this.setCss();
  }

  constructor () {
    this.commands = commands;
    this.css = {};

    this.setCss();
  }

  get pile () {
    return {};
  }

  setCss () {
    try {
      const top = typeof this.position.top !== 'undefined' ?
        `${this.position.top}px` : undefined;
      const right = typeof this.position.right !== 'undefined' ?
        `${this.position.right}px` : undefined;
      const bottom = typeof this.position.bottom !== 'undefined' ?
        `${this.position.bottom}px` : undefined;
      const left = typeof this.position.left !== 'undefined' ?
        `${this.position.left}px` : undefined;

      this.css = { top, right, bottom, left };
    } catch (error) {
      logger.error(error);
    }
  }
}
