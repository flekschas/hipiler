import { inject } from 'aurelia-dependency-injection';
import { Validator, ValidationControllerFactory, ValidationRules } from 'aurelia-validation';

// Utils etc.
import anchorLink, { getAnchor } from 'utils/anchor-link';
import scrollToAnchor from 'utils/scroll-to-anchor';


@inject(Validator, ValidationControllerFactory)
export class Configurator {
  constructor (validator, validationControllerFactory) {
    this.anchorLink = anchorLink;
    this.getAnchor = getAnchor;

    this.controller = validationControllerFactory.createForCurrentScope(validator);
    this.controller.subscribe(event => this.validated());

    ValidationRules
      .ensure('fragmentsServer')
      .displayName('Server URL')
      .matches(/\d{3}-\d{2}-\d{4}/)
      .withMessage('My ASS')
      .on(this);
  }

  /* ----------------------- Aurelia-specific methods ----------------------- */

  activate (urlParams) {
    if (urlParams.anchor) {
      this.anchor = `/about/${urlParams.anchor}`;
    }
  }

  attached () {
    if (this.anchor) {
      scrollToAnchor(this.anchor);
    }
  }

  /* ----------------------- Custom methods ----------------------- */

  validated () {}
}
