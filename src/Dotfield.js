
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

    this.max_dots = 16*1024;
    this.fvDotBuffer = new Float32Array(this.max_dots*3);
    this.size = 0;

    this.grid_res = maxr;
    this.dot_grid = []; // 2-d array of dot lists
  }

  getDot(idx) {
    const x = this.fvDotBuffer[idx*4+0]
    const y = this.fvDotBuffer[idx*4+1]
    const r = this.fvDotBuffer[idx*4+2]
    const g = 0; // this.fvDotBuffer[idx*4+3]

    return new Dot(x, y, r, g);
  }

  setDot(idx, dot) {
    this.fvDotBuffer[idx*4+0] = dot.x;
    this.fvDotBuffer[idx*4+1] = dot.y;
    this.fvDotBuffer[idx*4+2] = dot.radius;
    // this.fvDotBuffer[idx*4+3] = dot.gradient;

    this.addDotToGrid(idx, dot);
  }

  getDotsNear(dot) {
    // Load all the grid cells within max_radius of dot
    const range = dot.radius*2 + this.max_radius;
    const x1 = parseInt(Math.max(0, dot.x - range) / this.grid_res);
    const y1 = parseInt(Math.max(0, dot.y - range) / this.grid_res);
    const x2 = parseInt((dot.x + range) / this.grid_res);
    const y2 = parseInt((dot.y + range) / this.grid_res);
    // const x1 = 0, y1 = 0, x2 = this.width / this.grid_res, y2 = this.height / this.grid_res;

    let dot_list = [];

    // Iterate over cells to collect all the dots that might hit our candidate
    for(let u = x1; u < x2; u++) {
      for(let v = y1; v < y2; v++) {
        const row = this.dot_grid[u] || [];
        const cell = row[v] || [];
        dot_list.push(...cell);
      }
    }

    return dot_list;
  }

  addDotToGrid(idx, dot) {
    const u = parseInt(dot.x / this.grid_res);
    const v = parseInt(dot.y / this.grid_res);
    // console.debug(`Placing dot (${dot.x}, ${dot.y}) at ${u}, ${v}`);
    if(!this.dot_grid[u]) {
      this.dot_grid[u] = []
    }
    if(!this.dot_grid[u][v]) {
      this.dot_grid[u][v] = []
    }
    this.dot_grid[u][v].push(idx);
  }

  findNearestDotUsingGrid(dot) {
    // 
    const dots_to_check = this.getDotsNear(dot);
    // console.debug(`Comparing ${dots_to_check.length} dots...`)
    let closest_dot = this.getDot(dots_to_check[0]);
    let nearest_dist = distance(dot, closest_dot) - closest_dot.radius;

    for(let i=1; i<dots_to_check.length; i++) {
      // Compare each point to the input dot
      const cmp_dot = this.getDot(dots_to_check[i]);
      const cmp_dist = distance(dot, cmp_dot) - cmp_dot.radius;

      if(cmp_dist < nearest_dist) {
        closest_dot = cmp_dot;
        nearest_dist = cmp_dist;
      }
    }
    return [closest_dot, nearest_dist];
  }

  findNearestDot(dot) {
    // Brute force it for now, then we'll add the Bridson style improvement;
    let closest_dot = this.getDot(0);
    let nearest_dist = distance(dot, closest_dot) - closest_dot.radius;

    for(let i=1; i<this.size; i++) {
      // Compare each point to the input dot
      const cmp_dot = this.getDot(i);

      // Bail early if the bounding box doesn't clip
      cmp_dot.x - cmp_dot.radius
      //
      const cmp_dist = distance(dot, cmp_dot) - cmp_dot.radius;

      if(cmp_dist < nearest_dist) {
        closest_dot = cmp_dot;
        nearest_dist = cmp_dist;
      }
    }
    return [closest_dot, nearest_dist];
  }

  isInField(dot) {
    const dx = dot.x - this.width/2;
    const dy = dot.y - this.height/2;
    const dr = dx*dx + dy*dy;
    const boundary = (this.width/2-dot.radius)**2;
    return boundary - dr;
  }

  generateField(kSamples, initial_seed) {

    console.debug(`Generating field for kSamples ${kSamples} with seed ${initial_seed}`);
    this.size = 1;

    const k_limit = kSamples || 30;
    const _seed = initial_seed || 42;
    const arng = new alea(_seed);

    this.dot_grid = [];

    const init_width = this.width/2 + arng()*200-100;
    const init_height = this.height/2 + arng()*200-100;
    let initial_dot = new Dot(init_width, init_height, this.max_radius, 1.0);
    this.setDot(0, initial_dot);
    const Actives = [initial_dot];

    const d_start_time = new Date();

    while(Actives.length>0 && this.size < this.max_dots) {
      
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
          k_r, 1.0); // Start with the sample dot's radius for findingNearest
        
        const dist_to_edge = this.isInField(k_dot);
        if(dist_to_edge > this.min_radius) {
          const [_closest_dot, min_dist] = this.findNearestDotUsingGrid(k_dot);
          k_dot.radius = Math.min(this.max_radius, min_dist, dist_to_edge);
          if(this.min_radius < min_dist && min_dist < this.max_radius) {
            not_found = false;
            // console.debug(`Placing a point at ${k_dot.x}, ${k_dot.y} with r: ${k_dot.radius} whose nearest neighbor is ${min_dist} away`)
            // Found a valid sample, add it to the Actives list.
            this.setDot(this.size, k_dot);
            this.size += 1;
            Actives.push(k_dot);
          }
        }
        k_tested -= 1;
      } while(not_found && k_tested > 0);

      if(k_tested === 0) {
        // This means our annulus is full, so remove the sample point from Actives
        Actives.splice(idx_sample, 1);
      }
    }

    const d_run_time = (new Date())-d_start_time;
    console.debug(`Time to generate ${this.size} dots: ${d_run_time}ms`);
    this.dot_grid = []; // Release the memory for the dot_grid
  }
}
