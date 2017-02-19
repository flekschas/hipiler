// Aurelia
import {
  bindable,
  bindingMode
} from 'aurelia-framework';

import icons from 'configs/icons';

export class SvgIcon {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) iconId;

  attached () {
    const id = this.iconId.toUpperCase().replace('-', '_');
    this.icon = icons[id] ? icons[id] : icons.WARNING;

    console.log('KACKEN', id, this.iconId);
  }
}
