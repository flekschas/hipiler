// Aurelia
import {
  bindable,
  bindingMode
} from 'aurelia-framework';

import icons from 'configs/icons';

export class SvgIcon {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) iconId;  // eslint-disable-line

  constructor () {
    this.icon = {
      viewBox: '0 0 16 16',
      fillRule: '',
      svg: ''
    };
  }

  attached () {
    const id = this.iconId.toUpperCase().replace(/-/g, '_');
    this.icon = icons[id] ? icons[id] : icons.WARNING;
  }
}
