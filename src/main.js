import { LogManager } from 'aurelia-framework';
import { ConsoleAppender } from 'aurelia-logging-console';

//Configure Bluebird Promises.
if (Promise.config) {
  Promise.config({
    warnings: {
      wForgottenReturn: false
    }
  });
}

export function configure (aurelia) {
  aurelia.use
    .standardConfiguration()
    .plugin('aurelia-validation')
    .feature('resources');

  if (!window.hipilerConfig) {
    window.hipilerConfig = {};
  }

  if (window.hipilerConfig.debug) {
    LogManager.addAppender(new ConsoleAppender());
    LogManager.setLevel(LogManager.logLevel.debug);
  }

  if (window.hipilerConfig.testing) {
    aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => aurelia.setRoot());
}

export default {
  configure
};
