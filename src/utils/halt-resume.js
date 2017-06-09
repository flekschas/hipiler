// Aurelia
import { LogManager } from 'aurelia-framework';

const logger = LogManager.getLogger('higlass');

/**
 * Simple stack holder that fires all halted functions once it's resumed.
 */
export default function HaltResume () {
  const stack = [];

  const halt = function (f, params) {
    stack.push([f, params]);
  };

  const resume = function () {
    let entry = stack.pop();
    while (entry) {
      try {
        entry[0](...entry[1]);
      } catch (e) {
        logger.error(`Could not resume function: ${e}`);
      }
      entry = stack.pop();
    }
  };

  return { halt, resume };
}
