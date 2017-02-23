// Aurelia
import { inject, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// Injectables
import Font from 'services/font';
import States from 'services/states';

// Utils etc.
import $ from 'utils/dom-el';
import debounce from 'utils/debounce';
import { transition } from 'configs/app';
import { requestNextAnimationFrame } from 'utils/request-animation-frame';
import { updateWidth } from 'views/decompose-actions';
import { COLUMN_NAMES } from 'views/decompose-defaults';

const logger = LogManager.getLogger('decompose');


@inject(EventAggregator, Font, States)
export class Decompose {
  constructor (eventAggregator, font, states) {
    this.events = eventAggregator;
    this.font = font;

    this.css = {};

    this.store = states.store;
    this.store.subscribe(this.update.bind(this));

    this.fragments = {};
    this.stats = {};

    this.updateCssDb = debounce(this.updateCss.bind(this), 50);

    this.update();
  }

  attached () {
    this.$baseEl = new $(this.baseEl);

    requestNextAnimationFrame(() => {
      new $(this.matrixColEl).addClass('is-transitionable');
      new $(this.fragmentsColEl).addClass('is-transitionable');
      new $(this.statsColEl).addClass('is-transitionable');
    });
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
      transform: `translateX(${dX - (this.font.size * 0.25)}px)`
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
    }, transition.fast);

    this.dragging = undefined;
  }

  maximizeColumn (column) {
    let columnToUpdate = column;
    let width = 99;

    if (column === 'matrix') {
      this.minimizeColumn('fragments');
      this.minimizeColumn('stats');
    }

    if (column === 'fragments') {
      this.minimizeColumn('matrix');
      this.minimizeColumn('stats');
    }

    if (column === 'stats') {
      width = this.baseEl.getBoundingClientRect().width / 16;
    }

    this.store.dispatch(updateWidth(columnToUpdate, width));
  }

  minimizeColumn (column) {
    let columnToUpdate = column;
    let width = 1;

    if (column === 'fragments') {
      columnToUpdate = 'matrix';
      width = 99;
    }

    this.store.dispatch(updateWidth(columnToUpdate, width));
  }

  update () {
    try {
      this.updateCssDb(this.store.getState().present.decompose.columns);
    } catch (e) {
      logger.error('State invalid', e);
    }
  }

  updateColumnWidth (dragged) {
    if (dragged.target === 'fragments') {
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

  updateCss (columns) {
    COLUMN_NAMES.forEach((columnName) => {
      this.css[columnName] = {
        flexBasis: `${columns[`${columnName}Width`]}${columns[`${columnName}WidthUnit`]}`
      };
    });
  }
}
