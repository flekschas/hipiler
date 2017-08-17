import {
  requestAnimationFrame
} from 'utils/request-animation-frame';

/*
  Chartlets v0.9.10: http://chartlets.com
  MIT License
  (c) 2013 Adam Mark

  Adjusted by Fritz Lekschas
*/

let type;
let ctx;
let width;
let height;
let rotated;
let range;
let sets;
let opts;
let colors;
let themes;
let renderers;
let animate;

// Type of chart ('line', 'bar' or 'pie')
type = null;

// Canvas 2d context
ctx = null;

// Canvas dimensions
width = 0;
height = 0;

// Is the canvas rotated 90 degrees (for horizontal bar charts)?
rotated = false;

// Input range [min, max] across sets
range = [0, 0];

// Data sets (an array of arrays)
sets = [];

// Options from data-opts
opts = {};

// Renderers for line, bar and pie charts
renderers = {
  line: renderLineChart,
  bar: renderBarChart,
  pie: renderPieChart
};

// Built-in color themes. A theme can have any number of colors (as hex, RGB/A, or HSL/A)
themes = {
  blues: ['#7eb5d6', '#2a75a9', '#214b6b', '#dfc184', '#8f6048'],
  money: ['#009b6d', '#89d168', '#d3eb87', '#666666', '#aaaaaa'],
  circus: ['#9351a4', '#ff99cc', '#e31a1c', '#66cdaa', '#ffcc33'],
  party: ['#ffcc00', '#ff66cc', '#3375cd', '#e43b3b', '#96cb3f'],
  garden: ['#3c7bb0', '#ffa07a', '#2e8b57', '#7eb5d6', '#89d168'],
  crayon: ['#468ff0', '#ff8000', '#00c000', '#ffd700', '#ff4500'],
  ocean: ['#3375cd', '#62ccb2', '#4aa5d5', '#a6cee3', '#ffcc33'],
  spring: ['#ed729d', '#72caed', '#9e9ac8', '#a6d854', '#f4a582'],
  beach: ['#f92830', '#2fb4b1', '#ffa839', '#3375cd', '#5fd1d5'],
  fire: ['#dc143c', '#ff8c00', '#ffcc33', '#b22222', '#cd8540']
};

// Animation shim. See http://paulirish.com/2011/requestanimationframe-for-smart-animating/
animate = requestAnimationFrame;

// Split attribute value into array. 'a b c' -> ['a', 'b', 'c']
function parseAttr (elem, attr) {
  let val = elem.getAttribute(attr);

  return val ? val.replace(/, +/g, ',').split(/ +/g) : null;
}

// Parse data-opts attribute. 'a:b c:d' -> {a:'b', c:'d'}
function parseOpts (elem) {
  let pairs;
  let pair;
  let _opts = {};

  pairs = parseAttr(elem, 'data-opts') || [];

  for (let i = 0; i < pairs.length; i++) {
    pair = pairs[i].split(':');
    _opts[pair[0]] = pair[1];
  }

  return _opts;
}

// Parse data-sets attribute. '[1 2] [3 4]' -> [[1,2], [3,4]]
function parseSets (str) {
  // or '[[1,2], [3,4]]' -> [[1,2], [3,4]]
  let _sets = str.match(/\[[^[]+\]/g) || [];

  for (let i = 0; i < _sets.length; i++) {
    _sets[i] = _sets[i].match(/[-\d.]+/g);

    for (let j = 0; j < _sets[i].length; j++) {
      _sets[i][j] = +_sets[i][j];
    }
  }

  return _sets;
}

// Is the bar or line chart stacked?
function isStacked () {
  return opts.transform === 'stack';
}

// Is the line chart filled?
function isFilled () {
  return opts.fill !== undefined;
}

// Get the range [min, max] across all data sets
function getRange (_sets, stacked) {
  return stacked ? computeStackRange(_sets) : computeRange(_sets);
}

// Compute the range [min, max] across all data sets
function computeRange (_sets) {
  let arr = Array.prototype.concat.apply([], _sets);

  if (type === 'bar' || isStacked()) {
    arr.push(0);
  }

  return [Math.min.apply(null, arr), Math.max.apply(null, arr)];
}

// Compute the range [min, max] across all data sets if they are *stacked*
function computeStackRange (_sets) {
  return computeRange(mergeSets(_sets).concat(_sets));
}

// Convert a color string (hex, rgb/a, or hsl/a) to an object with r, g, b, a values
function parseColor (str) {
  let color = {
    r: 0,
    g: 0,
    b: 0,
    a: 1
  };

  if (str.match(/#/)) {
    color = parseHex(str);
  } else if (str.match(/rgb/)) {
    color = parseRGB(str);
  } else if (str.match(/hsl/)) {
    color = parseHSL(str);
  }

  return color;
}

// Convert an rgb or rgba string to an object with r, g, b, a values
function parseRGB (str) {
  let c = str.match(/[\d.]+/g);

  return {
    r: +c[0],
    g: +c[1],
    b: +c[2],
    a: +c[3] || 1
  };
}

// Convert a 3- or 6-digit hex string to an object with r, g, b, a values
function parseHex (str) {
  let c = str.match(/\w/g);

  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }

  const n = +(`0x${c.join('')}`);

  return {
    r: (n & 0xFF0000) >> 16,  // eslint-disable-line no-bitwise
    g: (n & 0x00FF00) >> 8,  // eslint-disable-line no-bitwise
    b: (n & 0x0000FF),  // eslint-disable-line no-bitwise
    a: 1
  };
}

// Convert an hsl or hsla string to an object with r, g, b, a values
// See http://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
function parseHSL (str) {
  let c = str.match(/[\d.]+/g);
  let h = +c[0] / 360;
  let s = +c[1] / 100;
  let l = +c[2] / 100;
  let a = (+c[3] || 1) / 1;
  let r;
  let g;
  let b;

  function hue2rgb (p, q, t) {
    if (t < 0) {
      t += 1;
    }
    if (t > 1) {
      t -= 1;
    }
    if (t < 1 / 6) {
      return p + ((q - p) * 6 * t);
    }
    if (t < 1 / 2) {
      return q;
    }
    if (t < 2 / 3) {
      return p + ((q - p) * ((2 / 3) - t) * 6);
    }

    return p;
  }

  if (s === 0) {
    r = g = b = l;  // eslint-disable-line no-multi-assign
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
    const p = (2 * l) - q;
    r = hue2rgb(p, q, h + (1 / 3));
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - (1 / 3));
  }

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255,
    a
  };
}

// Multiply a color's alpha value (0 to 1) by n
function sheerColor (color, n) {
  color.a *= n;

  return color;
}

// Convert a color object (with r, g, b, a properties) to an rgba string
function toRGBString (color) {
  const rgba = [
    Math.round(color.r),
    Math.round(color.g),
    Math.round(color.b),
    color.a
  ].join(',');

  return `rgba(${rgba})`;
}

// Rotate the context 90 degrees
function rotate () {
  rotated = true;
  ctx.translate(width, 0);
  ctx.rotate(Math.PI / 2);
}

// Get the x step in pixels
function getXStep (len) {
  return (rotated ? height : width) / (len - 1);
}

// Get the x position in pixels for the given index and length of set
function getXForIndex (idx, len) {
  return idx * getXStep(len);
}

// Get the y position in pixels for the given data value
function getYForValue (val) {
  let h = rotated ? width : height;

  return h - (h * ((val - range[0]) / (range[1] - range[0])));
}

// Sum all the values in a set. e.g. sumSet([1,2,3]) -> 6
function sumSet (set) {
  let i;
  let n = 0;

  for (i = 0; i < set.length; i++) {
    n += set[i];
  }

  return n;
}

// Sum all the values at the given index across sets. e.g. sumY([[4,5],[6,7]], 0) -> 10
function sumY (_sets, idx) {
  let i;
  let n = 0;

  for (i = 0; i < _sets.length; i++) {
    n += _sets[i][idx];
  }

  return n;
}

// Merge two or more sets into one array. e.g. mergeSets([[1,2],[3,4]]) -> [4,6]
function mergeSets (_sets) {
  let i;
  let set = [];

  for (i = 0; i < _sets[0].length; i++) {
    set.push(sumY(_sets, i));
  }

  return set;
}

// Get the color string for the given index. Return black if undefined
function colorOf (idx) {
  return colors[idx] || '#000';
}

// Draw a line (or polygon) for a data set
function drawLineForSet (set, strokeStyle, lineWidth, fillStyle, offset) {
  let i = 1;
  let x;
  let y;
  let step;

  step = getXStep(set.length);

  ctx.lineWidth = Math.min(3, lineWidth);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.strokeStyle = strokeStyle;
  ctx.moveTo(0, getYForValue(set[0]));

  while (i < set.length) {
    x = getXForIndex(i, set.length);
    y = getYForValue(set[i]);

    // TODO support stack + smooth
    if (isStacked()) {
      opts.shape = 'straight';
    }

    drawLineSegment(set, i, x, y, step, opts.shape);

    i += 1;
  }

  // TODO support transform=band (upper + lower baselines)
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    if (offset) {
      i -= 1;
      while (i >= 0) {
        x = getXForIndex(i, offset.length);
        y = getYForValue(offset[i]);

        drawLineSegment(offset, i, x, y, step, opts.shape);
        //ctx.lineTo(x, y);

        i -= 1;
      }
    } else {
      ctx.lineTo(x, getYForValue(0));
      ctx.lineTo(0, getYForValue(0));
    }
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

// Draw an individual line segment
function drawLineSegment (set, i, x, y, step, shape) {
  let cx;
  let cy;

  // curvy line
  if (shape === 'smooth') {
    cx = getXForIndex(i - 0.5, set.length);
    cy = getYForValue(set[i - 1]);
    ctx.bezierCurveTo(cx, cy, cx, y, x, y);
  } else {
    // stepped line
    if (shape === 'step') {
      ctx.lineTo(x - (step / 2), getYForValue(set[i - 1]));
      ctx.lineTo(x - (step / 2), y);
    }
    // else straight line
    ctx.lineTo(x, y);
  }
}

// Draw circle or square caps for a data set
function drawCapsForSet (set, capStyle, fillStyle, lineWidth) {
  let i = 0;
  let w;

  while (i < set.length) {
    const x = getXForIndex(i, set.length);
    const y = getYForValue(set[i]);

    if (capStyle === 'square') {
      w = Math.max(2, lineWidth) * 2.5;
      drawRect(fillStyle, x - (w / 2), y + (w / 2), w, w);
    } else {
      w = lineWidth + 1;
      drawCircle(fillStyle, x, y, w);
    }

    i += 1;
  }
}

// Draw a circle
function drawCircle (fillStyle, x, y, r) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(x, y, r, 2 * Math.PI, false);
  ctx.fill();
}

// Draw a rectangle from bottom left corner
function drawRect (fillStyle, x, y, w, h) {
  ctx.fillStyle = fillStyle;
  ctx.fillRect(x, y - h, w, h);
}

// Draw an axis if a y-value is provided in data-opts
function drawAxis () {
  let x;
  let y;

  if (!isNaN(+opts.axis)) {
    x = 0;
    y = Math.round(getYForValue(opts.axis));

    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#bbb';
    ctx.moveTo(x, y);

    while (x < width) {
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x + 8, y);
      x += 8;
    }

    ctx.stroke();
  }
}

// Interpolate a value between a and b. e.g. interpolate(0,1,5,10) -> 0.5
function interpolate (a, b, idx, steps) {
  return +a + ((+b - +a) * (idx / steps));
}

// Interpolate all values from set a to set b, returning an array of arrays
function interpolateSet (a, b, n) {
  const c = [a];

  for (let i = 0; i < a.length; i++) {
    for (let j = 1; j < n; j++) {
      if (!c[j]) {
        c[j] = [];
      }

      c[j][i] = interpolate(a[i], b[i], j, n);
    }
  }

  return c.concat([b]);
}

// Interpolate all values across two arrays of sets, returning a multidimensional array
function interpolateSets (a, b, n) {
  const c = [];

  for (let i = 0; i < a.length; i++) {
    c.push(interpolateSet(a[i], b[i], n));
  }

  return c;
}

// Create a transition from one array of sets to another for the element with the given ID
function transition (elem, asets, bsets) {
  let i = 1;
  let n = 8;
  const interpolated = interpolateSets(asets, bsets, n);

  if (!asets.length) {
    return Chartlets.update(elem, bsets);
  }

  function _render () {
    const set = [];

    i += 1;

    for (let j = 0; j < interpolated.length; j++) {
      set.push(interpolated[j][i]);
    }

    Chartlets.update(elem, set);

    if (i <= n) {
      animate(_render);
    }
  }

  animate(_render);
}

// Render a line chart
function renderLineChart () {
  drawAxis();

  for (let i = 0; i < sets.length; i++) {
    const strokeStyle = colorOf(i);
    let set = sets[i];
    let offset = null;

    if (isStacked()) {
      set = mergeSets(sets.slice(0, i + 1));
      offset = i > 0 ? mergeSets(sets.slice(0, i)) : null;
    }

    drawLineForSet(set, strokeStyle, opts.stroke || 1.5, null);

    // TODO account for negative and positive values in same stack
    if (isStacked() || isFilled()) {
      const alphaMultiplier = opts.alpha || (isStacked() ? 1 : 0.5);

      const fillStyle = toRGBString(sheerColor(parseColor(strokeStyle), alphaMultiplier));

      drawLineForSet(set, strokeStyle, 0, fillStyle, offset);
    }

    if (opts.cap) {
      drawCapsForSet(set, opts.cap, strokeStyle, ctx.lineWidth);
    }
  }
}

// Render a bar chart
function renderBarChart () {
  if (opts.orient === 'horiz') {
    rotate();
  }

  drawAxis();

  ctx.lineWidth = opts.stroke || 1;
  ctx.lineJoin = 'miter';

  let len = sets[0].length;

  // TODO fix right pad
  for (let i = 0; i < sets.length; i++) {
    for (let j = 0; j < len; j++) {
      const p = 1;
      const a = rotated ? height : width;
      let w = ((a / len) / sets.length) - ((p / sets.length) * i) - 1;
      let x = (p / 2) + getXForIndex(j, len + 1) + (w * i) + 1;
      let y = getYForValue(sets[i][j]);
      const h = y - getYForValue(0) || 1;

      if (isStacked()) {
        // TODO account for negative and positive values in same stack
        w = (a / len) - 2;
        x = getXForIndex(j, len + 1);
        y = getYForValue(sumY(sets.slice(0, i + 1), j));
      }

      drawRect(colorOf(i), x, y, w, h);
    }
  }
}

// Render a pie chart
function renderPieChart () {
  const x = width / 2;
  const y = height / 2;
  const r = Math.min(x, y) - 2;
  const set = sets[0];
  const sum = sumSet(set);

  let a1 = 1.5 * Math.PI;
  let a2 = 0;

  for (let i = 0; i < set.length; i++) {
    ctx.fillStyle = colorOf(i);
    ctx.beginPath();
    a2 = a1 + ((set[i] / sum) * (2 * Math.PI));

    // TODO opts.wedge
    ctx.arc(x, y, r, a1, a2, false);
    ctx.lineTo(x, y);
    ctx.fill();
    a1 = a2;
  }
}

// Render or re-render the chart for the given element
function init (elem, dataSet) {
  if (window.devicePixelRatio > 1) {
    if (!elem.__resized) {
      elem.style.width = `${elem.width}px`;
      elem.style.height = `${elem.height}px`;
      elem.width *= 2;
      elem.height *= 2;
      elem.__resized = true;
    }
  }

  type = parseAttr(elem, 'data-type')[0];
  sets = dataSet || parseSets(elem.getAttribute('data-sets'));
  opts = parseOpts(elem);
  ctx = elem.getContext('2d');
  width = elem.width;
  height = elem.height;
  colors = themes[opts.theme] || parseAttr(elem, 'data-colors') || themes.basic;
  range = parseAttr(elem, 'data-range') || getRange(sets, isStacked());
  rotated = false;

  // erase
  elem.width = elem.width;

  // set background color
  if (opts.bgcolor) {
    drawRect(opts.bgcolor || '#fff', 0, 0, width, -height);
  }

  try {
    renderers[type](ctx, width, height, sets, opts);
  } catch (e) {
    console.error(e.message);
  }

  return {
    range
  };
}

// The API
const Chartlets = {
  // Render charts for an array of elements, or render all elements with class 'chartlet'
  render: (elems, dataSets = []) => {
    if (!elems) {
      elems = document.querySelectorAll('.chartlet');
    }

    for (let i = 0; i < elems.length; i++) {
      return init(elems[i], dataSets[i]);
    }
  },

  // Set a color theme. e.g. setTheme('disco', ['#123', '#456', '#789'])
  setTheme: (name, palette) => {
    themes[name] = palette;
  },

  // Get a color theme as an array of strings
  getTheme: name => (name ? themes[name] : colors),

  setRenderer: (newType, renderer) => {
    renderers[newType] = renderer;
  },

  // Update data sets for the given element (or ID)
  update: (elem, newSets, options) => {
    if (typeof elem === 'string') {
      elem = document.getElementById(elem);
    }

    if (options && options.transition === 'linear') {
      transition(elem, parseSets(elem.getAttribute('data-sets')), newSets);
      return;
    }

    elem.setAttribute('data-sets', JSON.stringify(newSets));

    this.render([elem]);
  }
};

export default Chartlets;
