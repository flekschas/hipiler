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

  if (window.hipilerConfig.debug) {
    aurelia.use.developmentLogging();
  }

  if (window.hipilerConfig.testing) {
    aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => aurelia.setRoot());
}

export default {
  configure
};
