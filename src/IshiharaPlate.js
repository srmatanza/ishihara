import React, { Component } from 'react';
import alea from 'seedrandom';
import { parseSVG, makeAbsolute } from 'svg-path-parser';
import opentype from 'opentype.js';
import { Bezier } from 'bezier-js';
import { checkIntersection } from 'line-intersect';

import { Point } from './point';
import { SDF } from './sdf';

const sevenPath = "M 39 155.25 L 0 155.25 L 0 0 L 369 0 L 369 36 Q 274.5 169.5 220.125 313.875 A 1159.759 1159.759 0 0 0 188.813 408.391 Q 175.283 456.511 168.73 499.182 A 515.65 515.65 0 0 0 162.75 562.5 L 70.5 562.5 A 820.015 820.015 0 0 1 97.736 466.628 Q 123.293 392.859 165.375 308.25 A 1466.84 1466.84 0 0 1 249.974 159.565 A 1164.059 1164.059 0 0 1 322.5 60 L 59.25 60 L 39 155.25 Z";

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

        opentype.load('NotoSans-Regular.ttf', (err, font) => {
          if(err) { 
            console.error('Could not load font.');
          } else {
            this.loadedFont = font;
            let _g1 = '2';
            if(this.props.glyphs) {
              _g1 =  this.props.glyphs[0];
            }
            const path = font.getPath(_g1, 0, 500, 720);
            this.state.glyphPath = makeAbsolute(parseSVG(path.toPathData()));
          }
        });

    }

    componentDidMount() {
        console.log("First arng: ", this.state.arng());
        setTimeout(this.updateCanvas.bind(this), 0);
    }

    componentDidUpdate(prevProps, prevState) {
        console.log('Dotfield update: ', this.props, prevProps, this.state, prevState)
        this.state.glyphPath = undefined;
        if(this.loadedFont && this.props.glyphs.length > 0) {
          const path = this.loadedFont.getPath(this.props.glyphs[0], 0, 500, 720);
          this.state.glyphPath = makeAbsolute(parseSVG(path.toPathData()));
          // console.log(`path: ${path.toPathData()}`);
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

                      const pct = minSqDist/maxRange;
                      const gc = this.getVariantColor(glyph_color, this.state.arng());
                      const fillClr = blend_rgb_tuples(gc, randFill, pct);

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
