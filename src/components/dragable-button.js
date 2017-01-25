import { bindable, bindingMode } from "aurelia-framework";

export class DraggableButton {
  @bindable({ defaultBindingMode: bindingMode.oneWay }) horizontalOnly = false;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) verticalOnly = false;

  constructor() {
    console.log('Oh yes girl', horizontalOnly, verticalOnly);
  }

  mouseDownHandler(el) {
    console.log('mouse down', el);
  }

  mouseUpHandler(el) {
    console.log('mouse up', el);
  }

  mouseMoveHandler(el) {
    console.log('mouse move', el);
  }
}
