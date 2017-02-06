import $ from './dom-el';
import hasParent from './has-parent';

export default function dragDrop (baseEl, dropEl, dropCallback) {
  const $baseEl = $(baseEl);

  document.addEventListener('dragenter', (event) => {
    if (hasParent(event.target, baseEl)) {
      $baseEl.addClass('is-dragging-over');
      isDragging = true;
    }
  });

  document.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  document.addEventListener('dragleave', () => {
    if (isDragging && hasParent(event.target, dropEl)) {
      $baseEl.removeClass('is-dragging-over');
    }
  });

  document.addEventListener('drop', (event) => {
    event.preventDefault();

    if (hasParent(event.target, baseEl)) {
      dropCallback(event);
    }

    $baseEl.removeClass('is-dragging-over');
  }, false);
}
