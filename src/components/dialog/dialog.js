// Aurelia
import {
  bindable,
  bindingMode
} from 'aurelia-framework';

export class Dialog {
  @bindable({ defaultBindingMode: bindingMode.twoWay }) deferred = {};
  @bindable({ defaultBindingMode: bindingMode.twoWay }) isOpen = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) message = '';

  cancel () {
    if (this.deferred && this.deferred.reject) {
      this.deferred.reject(Error());
      this.isOpen = false;
    }
  }

  okay () {
    if (this.deferred && this.deferred.resolve) {
      this.deferred.resolve();
      this.isOpen = false;
    }
  }
}
