const checkTextInputFocus = () => {
  switch (document.activeElement.tagName) {
    case 'INPUT':
      if (document.activeElement.type === 'text') {
        return true;
      }
      break;
    case 'TEXTAREA':
      return true;
    default:
      // Nothing
  }
  return false;
};

export default checkTextInputFocus;
