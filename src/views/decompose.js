// Aurelia
import { inject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectables
import Font from 'services/font';
import States from 'services/states';

// Utils etc.
import $ from 'utils/dom-el';
import { requestNextAnimationFrame } from 'utils/request-animation-frame';
import { updateWidth } from 'views/decompose.actions';
import { COLUMN_NAMES } from 'views/decompose.defaults';

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

    this.pattern = {};
    this.stats = {};
  }

  attached () {
    this.$baseEl = new $(this.baseEl);

    requestNextAnimationFrame(() => {
      new $(this.matrixColEl).addClass('is-transitionable');
      new $(this.patternColEl).addClass('is-transitionable');
      new $(this.statsColEl).addClass('is-transitionable');
    });

    this.updateCss(this.store.getState().present.decompose.columns);
  }

  update () {
    try {
      this.updateCss(this.store.getState().present.decompose.columns);
    } catch (e) {
      logger.error('State invalid', e);
    }
  }

  updateCss (columns) {
    for (let columnName of COLUMN_NAMES) {
      this.css[columnName] = {
        flexBasis: `${columns[`${columnName}Width`]}${columns[`${columnName}WidthUnit`]}`
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
    let target;

    try {
      target = this.dragging.target;
    } catch (e) {
      logger.error(e);
      return;
    }

    this.dragging.dX = event.clientX - this.dragging.x;

    this.mouseMoveListener.dispose();

    const draggerRect = this[`${target}Dragger`].getBoundingClientRect();
    const dragIndicatorRect = this[`${target}DragIndicator`].getBoundingClientRect();

    this[target].dragBtnCss = {
      ...this[target].dragBtnCss,
      position: 'fixed',
      top: `${draggerRect.top}px`,
      left: `${draggerRect.left}px`,
      transform: null
    };

    this[target].dragIndicatorCss = {
      ...this[target].dragIndicatorCss,
      position: 'fixed',
      top: `${dragIndicatorRect.top}px`,
      left: `${dragIndicatorRect.left}px`,
      transform: null
    };

    this.updateColumnWidth(this.dragging);

    setTimeout(() => {
      this.$baseEl.removeClass(`is-col-drag-${target}-highlight`);

      this[target].dragBtnCss = {
        ...this[target].dragBtnCss,
        position: null,
        top: null,
        left: null
      };

      this[target].dragIndicatorCss = {
        ...this[target].dragIndicatorCss,
        position: null,
        top: null,
        left: null
      };

      requestNextAnimationFrame(() => {
        this.$baseEl.removeClass(`is-col-drag-${target}`);
      });
    }, 2500);

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
