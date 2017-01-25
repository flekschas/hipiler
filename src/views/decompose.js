// Aurelia
import { inject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectables
import Font from 'services/font';
import States from 'services/states';
import { updateWidth } from 'views/decompose.actions';

// Utils
import $ from 'utils/dom-el';
import { requestNextAnimationFrame } from 'utils/request-animation-frame';

const logger = LogManager.getLogger('decompose');


@inject(EventAggregator, Font, States)
export class Decompose {
  constructor (eventAggregator, font, states) {
    this.events = eventAggregator;
    this.font = font;

    this.css = {};

    // Link the Redux store
    this.store = states.store;
    this.store.subscribe(this.update.bind(this));
    this.undo = states.undo.bind(states);
    this.redo = states.redo.bind(states);

    this.pattern = {};
    this.stats = {};
  }

  attached () {
    this.$baseEl = new $(this.baseEl);
    this.updateCss();
  }

  update () {
    logger.debug('update');
    this.updateCss();
  }

  updateCss () {
    let columns;

    try {
      columns = this.store.getState().present.decompose.columns;
    } catch (e) {
      logger.error('State invalid', e);
    }

    const columnNames = Object.keys(columns);

    for (let columnName of columnNames) {
      this.css[columnName] = {
        flexBasis: `${columns[columnName].width}${columns[columnName].widthUnit}`
      };
    }
  }

  columnDragStartHandler (event, target) {
    this.dragging = {
      target,
      x: event.clientX
    };

    this.$baseEl.addClass(`is-col-drag-${this.dragging.target}`);
    this.$baseEl.addClass(`is-col-drag-${this.dragging.target}-highlight`);

    this.mouseMoveListener = this.events.subscribe(
      'app.mouseMove', this.columnDragMoveHandler.bind(this)
    );
    this.events.subscribeOnce('app.mouseUp', this.columnDragEndHandler.bind(this));
  }

  columnDragMoveHandler (event) {
    const dX = event.clientX - this.dragging.x;

    this[this.dragging.target].dragBtnCss = {
      transform: `translateX(${dX - this.font.size * 0.25}px)`
    };

    this[this.dragging.target].dragIndicatorCss = {
      transform: `translateX(${dX}px)`
    };
  }

  columnDragEndHandler (event) {
    const target = this.dragging.target;

    this.dragging.dX = event.clientX - this.dragging.x;

    this.updateColumnWidth(this.dragging);

    this.$baseEl.removeClass(`is-col-drag-${target}-highlight`);

    requestNextAnimationFrame(() => {
      this.$baseEl.removeClass(`is-col-drag-${target}`);
    });

    this.mouseMoveListener.dispose();

    this[this.dragging.target].dragBtnCss = {
      transform: null
    };

    this[this.dragging.target].dragIndicatorCss = {
      transform: null
    };

    this.dragging = undefined;
  }

  updateColumnWidth (dragged) {
    if (dragged.target === 'pattern') {
      const visWidth = this.visEl.getBoundingClientRect().width;
      const matrixWidth = this.matrixColEl.getBoundingClientRect().width;

      this.store.dispatch(
        updateWidth(
          'matrix',
          (matrixWidth + dragged.dX) / visWidth * 100
        )
      );
    }

    if (dragged.target === 'stats') {
      const statsWidth = this.statsColEl.getBoundingClientRect().width;

      this.store.dispatch(
        updateWidth(
          'stats',
          (statsWidth - dragged.dX) / this.font.size
        )
      );
    }
  }
}
