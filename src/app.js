// Aurelia
import { inject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectable
import Font from 'services/font';
import States from 'services/states';

// Utils
import { routes } from 'configs/app';
import dragDrop from 'utils/drag-drop';
import readJsonFile from 'utils/read-json-file';

const logger = LogManager.getLogger('decompose');

@inject(EventAggregator, Font, States)
export class App {
  constructor (eventAggregator, font, states) {
    this.events = eventAggregator;
    this.font = font;
    this.states = states;
    this.undo = states.undo.bind(states);
    this.redo = states.redo.bind(states);
  }

  attached () {
    this.font.size = parseInt(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue('font-size')
        .slice(0, -2),
      10
    );

    // Drag and drop handler
    dragDrop(document.body, (event) => {
      let results;

      try {
        results = readJsonFile(event.dataTransfer.files[0]);
      } catch (e) {
        logger.error(e);
      }

      results
        .then(json => this.updateState(json))
        .catch(error => logger.error(error));
    });

    document.addEventListener('keydown', this.keyDownHandler.bind(this));
  }

  configureRouter (config, router) {
    this.router = router;

    config.map(routes);
  }

  keyDownHandler (event) {
    if (event.keyCode === 90 && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.undo();
    }

    if (event.keyCode === 89 && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.redo();
    }
  }

  mouseUpHandler (event) {
    this.events.publish('app.mouseUp', event);
  }

  mouseMoveHandler (event) {
    this.events.publish('app.mouseMove', event);
  }

  updateState (json) {
    logger.debug('ass', json);
  }
}
