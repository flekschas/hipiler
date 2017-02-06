import { DURATION, FPS } from 'components/fragments/fragments-defaults';

import Pile from 'components/fragments/pile';

const PilingAnimation = {
  // Variables

  animationPiles: [],

  done: false,

  matrices: undefined,

  positions: [],

  stepCount: 0,

  steps: DURATION / 1000 * FPS,

  targetPile: undefined,

  // Methods

  finish () {
    this.done = true;
    pileUp(this.matrices, this.targetPile, false);
    this.animationPiles = [];

    this.animationPiles.forEach((animationPile) => {
      if (animationPile !== this.targetPile) {
        animationPile.destroy();
      }
    });
  },

  start () {
    this.matrices.forEach((matrix, indexM) => {
      this.positions.push([]);

      this.steps.forEach((step, indexS) => {
        this.positions[indexM].push([
          matrix.pile.x +
            ((indexS * (this.targetPile.x - matrix.pile.x)) / this.steps),
          matrix.pile.y +
            ((indexS * (this.targetPile.y - matrix.pile.y)) / this.steps)
        ]);
      });
      this.animationPiles.push(matrix.pile);
    });

    this.matrices.forEach((matrix, indexM) => {
      this.positions.push([]);

      this.steps.forEach((step, indexS) => {
        this.positions[indexM].push([
          matrix.pile.x +
            ((indexS * (this.targetPile.x - matrix.pile.x)) / this.steps),
          matrix.pile.y +
            ((indexS * (this.targetPile.y - matrix.pile.y)) / this.steps)
        ]);
      });

      this.animationPiles.push(matrix.pile);
    });
  },

  step () {
    if (this.stepCount < this.steps) {
      this.animationPiles.forEach((animationPile, index) => {
        animationPile.moveTo(
          this.positions[index][this.stepCount][0],
          -this.positions[index][this.stepCount][1]
        );
      });
      this.stepCount += 1;
    } else {
      this.finish();
    }
  }
};

export function pilingAnimation (targetPile, matrices) {
  const inst = Object.create(PilingAnimation);

  inst.targetPile = targetPile;
  inst.matrices = matrices.slice(0);

  return inst;
}


const SplitAnimation = {
  // Variables

  animationPiles: [],

  dir: [],

  done: false,

  matrix: undefined,

  positions: [],

  stepCount: 0,

  steps: DURATION / 1000 * FPS,

  // Methods

  finish () {
    this.done = true;
  },

  start () {
    this.pileNew = Pile(
      pileIDCount++, scene, _zoomFac
    );

    this.pileNew.colored = this.matrix.pile.colored;
    piles.splice(piles.indexOf(this.matrix.pile) + 1, 0, this.pileNew);

    let m = [];
    for (let i = this.matrix.pile.getMatrixPosition(this.matrix); i < this.matrix.pile.size(); i++) {
      m.push(this.matrix.pile.getMatrix(i));
    }

    pileUp(m, this.pileNew, false);
    updateLayout(piles.indexOf(this.pileNew) - 1, true);

    this.pileNew.draw();
    this.matrix.pile.draw();

    this.dir = [
      (this.pileNew.x - this.matrix.pile.x) / this.steps,
      (this.pileNew.y - this.matrix.pile.y) / this.steps
    ];

    this.steps.forEach((step, index) => {
      this.positions.push([
        this.matrix.pile.x + (index * this.dir[0]),
        -this.matrix.pile.y + (index * this.dir[1])
      ]);
    });

    // move pileNew back to where this.matrix.pile is.
    this.pileNew.moveTo(this.matrix.pile.x, this.matrix.pile.y);
  },

  step () {
    if (this.stepCount < this.steps) {
      this.pileNew.moveTo(
        this.positions[this.stepCount][0],
        this.positions[this.stepCount][1]
      );
      this.stepCount += 1;
    } else {
      this.finish();
    }
  }
};

export function splitAnimation (matrix) {
  const inst = Object.create(SplitAnimation);

  inst.matrix = matrix;

  return inst;
}


const DepileAnimation = {
  // Variables

  done: false,

  piles: undefined,

  positions: [],

  startPos: undefined,

  stepCount: 0,

  steps: DURATION / 1000 * FPS,

  // Methods

  finish () {
    this.done = true;

    for (let i = 0; i < this.piles.length; i++) {
      this.piles[i].draw();
    }

    render();
  },

  start () {
    for (let i = 0; i < this.piles.length; i++) {
      this.positions.push([]);

      for (let s = 1; s <= this.steps; s++) {
        this.positions[i].push([
          startPos.x + s * (this.piles[i].x - startPos.x) / this.steps,
          startPos.y + s * (this.piles[i].y - startPos.y) / this.steps
        ]);
      }

      this.piles[i].moveTo(startPos.x, startPos.y);
    }
  },

  step () {
    if (this.stepCount < this.steps) {
      for (let i = 0; i < this.piles.length; i++) {
        this.piles[i].moveTo(
          this.positions[i][this.stepCount][0],
          -this.positions[i][this.stepCount][1]
        );
      }

      this.stepCount++;
    } else {
      this.finish();
    }
  }
};

export function depileAnimation (piles, startPos) {
  const inst = Object.create(DepileAnimation);

  inst.piles = piles;

  return inst;
}
