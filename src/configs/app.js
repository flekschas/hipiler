export const environments = {
  dev: {
    debug: true,
    testing: true
  },
  prod: {
    debug: false,
    testing: false
  }
};

export const routes = [
  {
    route: '',
    name: 'home',
    title: 'Home',
    moduleId: 'views/home',
    nav: false
  },
  {
    route: 'about',
    name: 'about',
    title: 'About',
    moduleId: 'views/about',
    nav: true
  },
  {
    route: 'docs',
    name: 'docs',
    title: 'Documentation',
    moduleId: 'views/docs',
    nav: true,
    navTitle: 'Docs'
  },
  {
    route: 'decompose',
    name: 'decompose',
    title: 'Decompose',
    moduleId: 'views/decompose',
    nav: false
  },
  {
    route: 'matrix',
    name: 'matrix',
    title: 'Matrix',
    moduleId: 'views/matrix',
    nav: false
  }
];

export const transition = {
  veryFast: 150,
  fast: 200,
  semiFast: 250,
  normal: 330,
  slow: 660,
  slowest: 1000
};

export default {
  environments,
  routes
};
