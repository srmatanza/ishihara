
// Layout of the dot buffer;

import { alea } from "seedrandom";

// x, y, radius, gradient
export class Dot {
  constructor(x, y, r, g) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.gradient = g;
  }

  is_also_at(another_dot) {
    if(another_dot.x === this.x && another_dot.y == this.y) {
      return true;
    }
    return false;
  }
}

function distance_sq(dot_a, dot_b) {
  return ((dot_b.x - dot_a.x)**2 + (dot_b.y - dot_a.y)**2);
}

function distance(dot_a, dot_b) {
  return Math.sqrt(distance_sq(dot_a, dot_b));
}

export class Dotfield {
  constructor(width, height, minr, maxr) {
    this.width = width
    this.height = height

    this.min_radius = minr
    this.max_radius = maxr

    this.fvDotBuffer = new Float32Array(4096);
    this.size = 0;

    // this.iGridRes = maxr;
    // this.fvDotGrid = new Float32Array(parseInt((width*height) / (this.iGridRes ** 2)));
  }

  getDot(idx) {
    const x = this.fvDotBuffer[idx*4+0]
    const y = this.fvDotBuffer[idx*4+1]
    const r = this.fvDotBuffer[idx*4+2]
    const g = this.fvDotBuffer[idx*4+3]

    return new Dot(x, y, r, g);
  }

  setDot(idx, dot) {
    this.fvDotBuffer[idx*4+0] = dot.x;
    this.fvDotBuffer[idx*4+1] = dot.y;
    this.fvDotBuffer[idx*4+2] = dot.radius;
    this.fvDotBuffer[idx*4+3] = dot.gradient;
  }

  findNearestDot(dot) {
    // Brute force it for now, then we'll add the Bridson style improvement;
    let closest_dot = this.getDot(0);
    let nearest_dist = distance(dot, closest_dot) - closest_dot.radius;

    // console.debug("********* findNearestDot ***********");
    // console.debug(`* Comparing Dot: ${dot.x}, ${dot.y} r: ${dot.radius}`)

    for(let i=1; i<this.size; i++) {
      // Compare each point to the input dot
      const cmp_dot = this.getDot(i);
      const cmp_dist = distance(dot, cmp_dot) - cmp_dot.radius;

      // console.debug(`* dot: ${cmp_dot.x}, ${cmp_dot.y} r: ${cmp_dot.radius}`)

      if(cmp_dist < nearest_dist) {
        closest_dot = cmp_dot;
        nearest_dist = cmp_dist;
      }
    }
    // console.debug("***");
    return [closest_dot, nearest_dist];
  }

  isInField(dot) {
    const dx = dot.x - this.width/2;
    const dy = dot.y - this.height/2;
    const dr = dx*dx + dy*dy;
    const boundary = (this.width/2-dot.radius)**2;
    if(dr < boundary) {
      return true;
    }
    return false;
  }

  generateField(kSamples, initial_seed) {

    console.debug(`Generating field for kSamples ${kSamples} with seed ${initial_seed}`);
    this.size = 1;

    const k_limit = kSamples || 30;
    const _seed = initial_seed || 42;
    const arng = new alea(_seed);
    let initial_dot = new Dot(this.width/2, this.height/2, this.max_radius, 1.0);
    this.setDot(0, initial_dot);
    const Actives = [initial_dot];

    const d_start_time = new Date();

    let total_iterations = 2000;
    while(Actives.length>0 && total_iterations > 0) {
      
      const idx_sample = parseInt(arng()*Actives.length);
      const sample_dot = Actives[idx_sample];

      const r1 = sample_dot.radius + this.min_radius;
      const r2 = sample_dot.radius + this.max_radius;
      let k_tested = k_limit;
      let not_found = true;

      do {
        // Generate a point in the ring between r1 and r2;
        const k_r = arng()*(r2-r1)+r1;
        const k_theta = arng()*2*Math.PI;

        const k_dot = new Dot(
          sample_dot.x + Math.sin(k_theta)*k_r,
          sample_dot.y + Math.cos(k_theta)*k_r,
          0, 1.0);
        
        if(this.isInField(k_dot)) {
          const [_closest_dot, dot_dist] = this.findNearestDot(k_dot);
          const min_dist = dot_dist;
          k_dot.radius = Math.min(this.max_radius, min_dist);
          if(this.min_radius < min_dist && min_dist < this.max_radius) {
            not_found = false;
            // console.debug(`Placing a point at ${k_dot.x}, ${k_dot.y} with r: ${k_dot.radius} whose nearest neighbor is ${min_dist} away`)
            // Found a valid sample, add it to the Actives list.
            this.setDot(this.size, k_dot);
            this.size += 1;
            Actives.push(k_dot);
          } else {
            // console.debug(` xxx Couldn't place the dot, min_dist: ${min_dist}`);
          }
        }
        k_tested -= 1;
      } while(not_found && k_tested > 0);

      if(k_tested === 0) {
        // This means our annulus is full, so remove the sample point from Actives
        Actives.splice(idx_sample, 1);
      }
      total_iterations-=1;
    }

    const d_run_time = (new Date())-d_start_time;
    console.debug(`Time to generate ${this.size} dots: ${d_run_time}ms`);
    if(total_iterations == 0) {
      console.error('Our loop timed out...');
    }
  }
}
