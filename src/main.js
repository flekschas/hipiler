import { environments } from 'configs/app';
import config from 'config';

//Configure Bluebird Promises.
Promise.config({
  warnings: {
    wForgottenReturn: false
  }
});

export function configure (aurelia) {
  aurelia.use
    .standardConfiguration()
    .feature('resources');

  if (environments[config.env].debug) {
    aurelia.use.developmentLogging();
  }

  if (environments[config.env].testing) {
    aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => aurelia.setRoot());
}
