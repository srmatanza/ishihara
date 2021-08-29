import React, { Component } from 'react';
import alea from 'seedrandom';
import { parseSVG, makeAbsolute } from 'svg-path-parser';
import opentype from 'opentype.js';
import { Bezier } from 'bezier-js';
import { checkIntersection } from 'line-intersect';

import { Point } from './point';
import { SDF } from './sdf';

const sevenPath = "M171.08 261.20L263.56 83.72L137.08 83.72Q110.56 83.72 94.24 85.42Q77.92 87.12 67.72 92.90Q57.52 98.68 51.06 109.56Q44.60 120.44 37.80 139.48L37.80 139.48L27.60 166L1.76 166L49.36-24.40L76.56-24.40Q75.20-21 74.52-14.54Q73.84-8.08 73.84-3.32L73.84-3.32Q73.84 8.24 84.04 12.32Q94.24 16.40 125.52 16.40L125.52 16.40L324.76 16.40L324.76 30.00Q302.32 81.00 284.98 120.10Q267.64 159.20 253.70 191.50Q239.76 223.80 228.20 252.36Q216.64 280.92 204.74 310.16Q192.84 339.40 180.26 372.72Q167.68 406.04 152.04 447.52L152.04 447.52Q140.48 478.12 131.30 497.16Q122.12 516.20 113.96 527.42Q105.80 538.64 97.98 542.72Q90.16 546.80 81.32 546.80L81.32 546.80Q69.08 546.80 60.58 537.62Q52.08 528.44 52.08 518.92L52.08 518.92Q52.08 513.48 53.10 507.02Q54.12 500.56 57.86 490.02Q61.60 479.48 69.42 462.48Q77.24 445.48 90.50 418.96Q103.76 392.44 123.48 354.02Q143.20 315.60 171.08 261.20L171.08 261.20Z";
const glyph_typeface = 'LibreBaskerville-Regular.ttf';
// const glyph_typeface = 'NotoSans-Regular.ttf';

var clamp = function(val, min, max) {
    return Math.max(min||0, Math.min(max||1, val));
}

var blend_rgb_tuples = function(rgb_1, rgb_2, interpolation) {
    const t = clamp(interpolation);
    const r = rgb_1[0]*(1-t) + rgb_2[0]*(t);
    const g = rgb_1[1]*(1-t) + rgb_2[1]*(t);
    const b = rgb_1[2]*(1-t) + rgb_2[2]*(t);

    return [r, g, b];
}

const field_color = [41, 84, 3];
const glyph_color = [255, 107, 33];

export default class IshiharaPlate extends Component {

    constructor(props) {
        super(props);
        const initialSeed = props.seed||42;
        const segments = makeAbsolute(parseSVG(sevenPath));
        console.log(segments);

        this.state = {
            arng: new alea(initialSeed),
            glyphPath: segments
        }

        this.glyph_pt_size = 680;
        this.glyph_offset = [-20, 540];

        opentype.load(glyph_typeface, (err, font) => {
          if(err) { 
            console.error('Could not load font.');
          } else {
            this.loadedFont = font;
            let _g1 = '2';
            if(this.props.glyphs) {
              _g1 =  this.props.glyphs[0];
            }
            const path = font.getPath(_g1, ...this.glyph_offset, this.glyph_pt_size);
            this.state.glyphPath = makeAbsolute(parseSVG(path.toPathData()));
          }
        });
    }

    componentDidMount() {
        // console.log("First arng: ", this.state.arng());
        setTimeout(this.updateCanvas.bind(this), 0);
    }

    componentDidUpdate(prevProps, prevState) {
        console.log('Dotfield update: ', this.props, prevProps, this.state, prevState)
        // this.state.glyphPath = undefined;
        if(this.loadedFont && this.props.glyphs.length > 0) {
          const path = this.loadedFont.getPath(this.props.glyphs[0], ...this.glyph_offset, this.glyph_pt_size);
          this.state.glyphPath = makeAbsolute(parseSVG(path.toPathData()));
          // console.debug(`path: ${path.toPathData()}`);
          // this.state.glyphPath = pisp.segments(path.toPathData());
        }
        this.state.arng = new alea(this.props.seed);
        let bDiff = false
        for(const p in this.props) {
            if(!(p in prevProps && this.props[p] == prevProps[p])) {
                bDiff = true
            }
        }
        if(bDiff) {
          setTimeout(this.updateCanvas.bind(this), 0);
        }
    }

    getVariantColor(rgb_tuple, color_variance) {
        const v = color_variance ? color_variance*100-50 : 0;
        return [clamp(rgb_tuple[0]+v, 0, 255), clamp(rgb_tuple[1]+v, 0, 255), clamp(rgb_tuple[2]+v, 0, 255)];
    }

    toRgb(rgb_tuple) {
        return `rgb(${rgb_tuple[0]}, ${rgb_tuple[1]}, ${rgb_tuple[2]})`
    }

    isInside(pt, pathSegments) {

        let ret = 0;
        for(const seg of pathSegments) {
            switch(seg.code) {
                case "L":
                case "Z":
                    const int = checkIntersection(0, 0, pt[0], pt[1], seg.x, seg.y, seg.x0, seg.y0);
                    ret += int.type == 'intersecting' ? 1 : 0;
                    break;
                case "Q":
                    const curve = new Bezier(seg.x0, seg.y0, seg.x1, seg.y1, seg.x, seg.y);
                    const line = { p1: {x: 0, y: 0}, p2: {x: pt[0], y: pt[1] }};
                    const intersections = curve.lineIntersects(line);
                    ret += intersections.length;
                    break;
            }
        }

        return ret%2;
    }

    drawGlyph(ctx) {
        for(const seg of this.state.glyphPath) {
            ctx.beginPath();
            ctx.moveTo(seg.x0, seg.y0);
            switch(seg.code) {
                case "L":
                case "Z":
                    ctx.lineTo(seg.x, seg.y);
                    ctx.strokeStyle = "rgb(255, 0, 0)";
                    break;
                case "Q":
                    ctx.quadraticCurveTo(seg.x1, seg.y1, seg.x, seg.y);
                    ctx.strokeStyle = "rgb(0, 0, 255)";
                    break;
            }
            ctx.stroke();
        }
    }

    updateCanvas() {
        const ctx = this.refs.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.props.width, this.props.height);
        const dots = this.props.dots;
        const num_dots = this.props.num_dots;

        const padding = this.props.padding;

        //let dRen = 0;
        const dA = new Date();
        for(let i=0; i<num_dots; i++) {
            //const color = dd.clr;
            const dx = parseFloat(dots[i*4+0]);
            const dy = parseFloat(dots[i*4+1]);
            const dr = parseFloat(dots[i*4+2]);
          
            ctx.beginPath();
            ctx.arc(dx, dy, dr-padding, 0, 2*Math.PI);

            const randFill = this.getVariantColor(field_color, this.state.arng());
            ctx.fillStyle = this.toRgb(randFill);
            const ddx = dx - this.props.offset.x;
            const ddy = dy - this.props.offset.y;

            const pathSegments = this.state.glyphPath;
            if(pathSegments) {
              if(this.isInside([ddx, ddy], pathSegments)) {
                  ctx.fillStyle = this.toRgb(this.getVariantColor(glyph_color, this.state.arng()));
              } else if(this.props.bFeather) {
                  const maxRange = 750;
                  let minSqDist = maxRange;
                  // if it's not inside, then let's see how close we are --
                  for(const seg of pathSegments) {
                      switch(seg.code) {
                          case "L":
                              const ptA = new Point(seg.x0, seg.y0);
                              const ptB = new Point(seg.x, seg.y);
                              const lineDist = SDF.sdLine(Point(ddx, ddy), ptA, ptB);
                              minSqDist = Math.min(minSqDist, lineDist);
                              break;
                          case "Q":
                              break;
                      }
                  }
                  if(minSqDist < maxRange) {

                      const pct = -(minSqDist-maxRange)/maxRange;
                      // const pct = 1/(minSqDist+1);
                      const gc = this.getVariantColor(glyph_color, this.state.arng());
                      const fillClr = blend_rgb_tuples(randFill, gc, pct);

                      ctx.fillStyle = this.toRgb(fillClr);
                  }
              }
            }
            ctx.fill();
        }

        // this.drawGlyph(ctx);

        const dEnd = (new Date())-dA;
        console.log(`Render Time: ${dEnd}ms`);
    }

    render() {
        return (
            <canvas id="dotfield" ref="canvas" width={this.props.width} height={this.props.height}/>
        )
    }
}

// export default IshiharaPlate;
