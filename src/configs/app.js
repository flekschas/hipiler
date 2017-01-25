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
    route: ['', 'home'],
    name: 'home',
    title: 'Home',
    moduleId: 'views/home',
    nav: true,
    showIcon: true,
    iconId: 'home'
  },
  {
    route: 'about',
    name: 'about',
    title: 'About',
    moduleId: 'views/about',
    nav: true
  },
  {
    route: 'decompose',
    name: 'decompose',
    title: 'Decompose',
    moduleId: 'views/decompose',
    nav: true
  }
];
