const scrollToAnchor = (id) => {
  const el = document.getElementById(id);
  if (el) {
    // Re-apply anchor URL such that the browser actually scrolls to the anchor
    location.href = `#${id}`;
  }
};

export default scrollToAnchor;
