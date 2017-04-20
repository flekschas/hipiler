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
    nav: true,
    icon: 'info'
  },
  {
    route: 'docs',
    name: 'docs',
    title: 'Documentation',
    moduleId: 'views/docs',
    nav: true,
    navTitle: 'Docs',
    icon: 'help'
  },
  {
    route: 'explore',
    name: 'explore',
    title: 'Explore',
    moduleId: 'views/explore',
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
  routes,
  transition
};
