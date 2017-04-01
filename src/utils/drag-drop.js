import $ from './dom-el';
import hasParent from './has-parent';

export default function dragDrop (baseEl, dropEl, dropCallback) {
  const $baseEl = $(baseEl);
  let isDragging = false;

  document.addEventListener('dragenter', (event) => {
    if (hasParent(event.target, baseEl)) {
      $baseEl.addClass('is-dragging-over');
      isDragging = true;
      event.preventDefault();
    }
  });

  document.addEventListener('dragover', (event) => {
    if (isDragging) {
      event.preventDefault();
    }
  });

  document.addEventListener('dragleave', () => {
    if (isDragging && hasParent(event.target, dropEl)) {
      $baseEl.removeClass('is-dragging-over');
      isDragging = false;
    }
  });

  document.addEventListener('drop', (event) => {
    if (isDragging) {
      event.preventDefault();

      if (hasParent(event.target, baseEl)) {
        dropCallback(event);
      }

      $baseEl.removeClass('is-dragging-over');
      isDragging = false;
    }
  }, false);
}
