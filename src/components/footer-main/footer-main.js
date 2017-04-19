import packageJson from 'text!../../../package.json';  // eslint-disable-line import/no-webpack-loader-syntax

export class FooterMain {
  constructor (event) {
    this.version = JSON.parse(packageJson).version;
  }
}
