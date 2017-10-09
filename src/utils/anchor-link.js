import { Container } from 'aurelia-dependency-injection';
import { Router } from 'aurelia-router';

const container = Container.instance;
const router = container.get(Router);

const anchorLink = (path, anchor) => (router.history._hasPushState
  ? `${router.generate(path)}#${anchor}`
  : `${router.generate(path)}/${anchor}`
);

export default anchorLink;

export const getAnchor = (path, anchor) => (router.history._hasPushState
  ? anchor
  : `${router.generate(path).slice(1)}/${anchor}`
);
