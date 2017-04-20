//Configure Bluebird Promises.
Promise.config({
  warnings: {
    wForgottenReturn: false
  }
});

export function configure (aurelia) {
  let debug = false;
  let testing = false;

  aurelia.use
    .standardConfiguration()
    .feature('resources')
    .plugin('aurelia-configuration', (config) => {
      config.setDirectory('.');
      config.setEnvironments({
        development: ['localhost'],
        production: ['github.io']
      });

      debug = config.get('debug');
      testing = config.get('testing');
    });

  if (debug) {
    aurelia.use.developmentLogging();
  }

  if (testing) {
    aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => aurelia.setRoot());
}

export default {
  configure
};
