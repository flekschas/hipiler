"use strict";
const path = require('path');
const project = require('./aurelia_project/aurelia.json');

const testSrc = [
  { pattern: project.unitTestRunner.source, included: false },
  'test/aurelia-karma.js'
];

const output = project.platform.output;
const appSrc = project.build.bundles.map(x => path.join(output, x.name));
const entryIndex = appSrc.indexOf(path.join(output, project.build.loader.configTarget));
const entryBundle = appSrc.splice(entryIndex, 1)[0];
const files = [entryBundle].concat(testSrc).concat(appSrc);

module.exports = function (config) {
  const cfg = {
    basePath: '',
    frameworks: [project.testFramework.id],
    files,
    exclude: [],
    preprocessors: {
      [project.unitTestRunner.source]: [project.transpiler.id]
    },
    babelPreprocessor: { options: project.transpiler.options },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    customLaunchers: {
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },
    singleRun: false,
    // client.args must be a array of string.
    // Leave 'aurelia-root', project.paths.root in this order so we can find
    // the root of the aurelia project.
    client: {
      args: ['aurelia-root', project.paths.root]
    }
  };

  if (process.env.TRAVIS) {
    cfg.browsers = ['Chrome_travis_ci'];
  }

  config.set(cfg);
};
