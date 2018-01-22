export const name = 'HiPiler';

export const routes = [
  {
    route: '',
    href: '/',
    name: 'home',
    title: 'Home',
    moduleId: 'views/home',
    nav: false
  },
  // {
  //   route: 'configurator/:anchor?',
  //   href: '/configurator',
  //   name: 'configurator',
  //   title: 'Configurator',
  //   moduleId: 'views/configurator',
  //   nav: true,
  //   icon: 'cog'
  // },
  {
    route: 'about/:anchor?',
    href: '/about',
    name: 'about',
    title: 'About',
    moduleId: 'views/about',
    nav: true,
    icon: 'info'
  },
  {
    route: 'docs/:anchor?/:anchor2?',
    href: '/docs',
    name: 'docs',
    title: 'Documentation',
    moduleId: 'views/docs',
    nav: true,
    navTitle: 'Docs',
    icon: 'help'
  },
  {
    route: 'explore',
    href: '/explore',
    name: 'explore',
    title: 'Explore',
    moduleId: 'views/explore',
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
