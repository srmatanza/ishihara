import { expect } from '@jest/globals';
import { Dot, Dotfield } from './Dotfield'

const _epsilon = 0.0001;

test('Dotfield is created', ()=> {
  let Df = new Dotfield(100, 100, 10, 20);
  Df.generateField(15, 237);

  expect(Df.size).toBe(7);

  for(let j=0; j<Df.size; j++) {
    let first_dot = Df.getDot(j);
    for(let i=0; i<Df.size; i++) {
      let cmp_dot = Df.getDot(i);
      if(first_dot.x == cmp_dot.x && first_dot.y == cmp_dot.y) {
        continue;
      }
      // console.debug(`x: ${cmp_dot.x}, y: ${cmp_dot.y}, radius: ${cmp_dot.radius}`);
      let dist = Math.sqrt( (first_dot.x - cmp_dot.x)**2 + (first_dot.y - cmp_dot.y)**2);

      expect(dist + _epsilon).toBeGreaterThan(first_dot.radius + cmp_dot.radius);
    }
  }
})

