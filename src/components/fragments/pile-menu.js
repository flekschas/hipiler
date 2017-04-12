// Aurelia
import {
  bindable,
  bindingMode,
  LogManager
} from 'aurelia-framework';

import commands from 'components/fragments/pile-menu-commands';

import fgmState from 'components/fragments/fragments-state';

// import debounce from 'utils/debounce';

const logger = LogManager.getLogger('pile-menu');

export class PileMenu {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) isActive = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) isAlignLeft = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) isBottomUp = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) pile;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) position = {};

  positionChanged () {
    this.setCss();
  }

  constructor () {
    this.commands = commands;
    this.css = {};

    this.setCss();
  }

  pileChanged () {
    if (this.pile) {
      this.commands.forEach((command) => {
        command.isVisible = this.isVisible(command);
        command.pile = this.pile;

        command.buttons.forEach((button) => {
          button.isVisible = this.isVisible(button);
        });
      });

      // Somtimes isActive is not properly recognized. This seems to be a bug
      // in Aurelia
      this.isActive = true;
    }
  }

  isVisible (command) {
    if (!this.pile) {
      return false;
    }

    if (command.isColoredOnly && !this.pile.isColored) {
      return false;
    }

    if (command.stackedPileOnly && this.pile.pileMatrices.length < 2) {
      return false;
    }

    if (command.trashedOnly && !this.pile.isTrashed) {
      return false;
    }

    if (command.notInTrash && this.pile.isTrashed) {
      return false;
    }

    if (command.inspectionOnly && !fgmState.isPilesInspection) {
      return false;
    }

    return true;
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

  trigger (button) {
    button.trigger(this.pile);

    if (button.closeOnClick) {
      this.isActive = false;
    }
  }
}
