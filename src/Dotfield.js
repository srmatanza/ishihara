import React, { Component } from 'react';
import alea from 'seedrandom';
import pisp from 'point-in-svg-polygon';
import Bezier from 'bezier-js';
import opentype from 'opentype.js';

import {Point} from './point';
import {SDF} from './sdf';

const sevenPath = "M 39 155.25 L 0 155.25 L 0 0 L 369 0 L 369 36 Q 274.5 169.5 220.125 313.875 A 1159.759 1159.759 0 0 0 188.813 408.391 Q 175.283 456.511 168.73 499.182 A 515.65 515.65 0 0 0 162.75 562.5 L 70.5 562.5 A 820.015 820.015 0 0 1 97.736 466.628 Q 123.293 392.859 165.375 308.25 A 1466.84 1466.84 0 0 1 249.974 159.565 A 1164.059 1164.059 0 0 1 322.5 60 L 59.25 60 L 39 155.25 Z";

var hexTriple = function(strHex) {
    const rHexLong = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

    const matchA = rHexLong.exec(strHex)

    return {r: parseInt(matchA[1], 16),
            g: parseInt(matchA[2], 16),
            b: parseInt(matchA[3], 16)}
}

var hexToString = function(ht) {
    return "#" + ht.r.toString(16).padStart(2, "0") +
                 ht.g.toString(16).padStart(2, "0") +
                 ht.b.toString(16).padStart(2, "0");
}

var blendHexColors = function(hexA, hexB, amt) {
    const htA = hexTriple(hexA);
    const htB = hexTriple(hexB);

    let rA = parseInt(htA.r, 16),
        gA = parseInt(htA.g, 16),
        bA = parseInt(htA.b, 16);
    let rB = parseInt(htB.r, 16),
        gB = parseInt(htB.g, 16),
        bB = parseInt(htB.b, 16);
    
    let cT = 1.0 - amt;
    let cU = amt;
    const fillTriple = {
        r: parseInt(cT*rA+cU*rB),
        g: parseInt(cT*gA+cU*gB),
        b: parseInt(cT*bA+cU*bB)
    };
    var fillCol = hexToString(fillTriple);

    return fillCol;
}

var colorBrightness = function(hex, dBright) {
    const hh = hexTriple(hex);
}

class Dotfield extends Component {

    constructor(props) {
        super(props);
        const initialSeed = props.seed||42;
        const segments = pisp.segments(sevenPath);
        console.log(segments);
        this.colorA = this.props.colorA||"#ff0000";
        this.colorB = this.props.colorB||"#000000";
        this.state = {
            arng: new alea(initialSeed),
            pathSeg: segments
        }
    }

    componentDidMount() {
        console.log("First arng: ", this.state.arng());
        this.updateCanvas();

        opentype.load('NotoSans-Regular.ttf', function(err, font) {
          if(err) { 
            console.error('Could not load font.');
          } else {
            const path = font.getPath('7', 0, 0, 72);
            console.log('path: ', path);
          }
        });
    }

    componentDidUpdate(prevProps, prevState) {
        // console.log('Dotfield update: ', this.props, prevProps, this.state, prevState)
        this.state.arng = new alea(this.props.seed);
        let bDiff = false
        for(const p in this.props) {
            if(!(p in prevProps && this.props[p] == prevProps[p])) {
                bDiff = true
            }
        }
        if(bDiff) {
            this.updateCanvas();
        }
    }

    updateCanvas() {
        const ctx = this.refs.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.props.width, this.props.height);
        const dots = this.props.dots;

        const padding = this.props.padding;

        //let dRen = 0;
        const dA = new Date();
        for(const dd in dots) {
            //const color = dd.clr;
            const dx = parseFloat(dots[dd].cx);
            const dy = parseFloat(dots[dd].cy);
          
            ctx.beginPath();
            ctx.arc(dx, dy, dots[dd].r-padding, 0, 2*Math.PI);

            // For the color, see how close we are to the poly

            const mm = parseInt(this.state.arng()*4)+9;
            const dHex = mm.toString(16);
            const randFill = "#ff"+dHex+dHex+dHex+dHex;
            ctx.fillStyle = randFill;
            const ddx = dx - this.props.offset.x;
            const ddy = dy - this.props.offset.y;
            if(pisp.isInside([ddx, ddy], this.state.pathSeg)) {
                ctx.fillStyle = "#000";
            } else if(this.props.bFeather) {
                const maxRange = 750;
                let minSqDist = maxRange;
                // if it's not inside, then let's see how close we are --
                for(const seg of this.state.pathSeg) {
                    switch(seg.type) {
                        case "line":
                            const ptA = seg.coords[0];
                            const ptB = seg.coords[1];
                            const lineDist = SDF.sdLine(Point(ddx, ddy), Point(ptA[0], ptA[1]), Point(ptB[0], ptB[1]));
                            minSqDist = Math.min(minSqDist, lineDist);
                            break;
                        case "bezier3":
                            const curve = new Bezier(seg.coords[0][0],
                                                     seg.coords[0][1],
                                                     seg.coords[1][0],
                                                     seg.coords[1][1],
                                                     seg.coords[2][0],
                                                     seg.coords[2][1],
                                                     seg.coords[3][0],
                                                     seg.coords[3][1]);
                            const p = curve.project({x: ddx, y: ddy});
                            const distSq = (ddx-p.x)*(ddx-p.x) + (ddy-p.y)*(ddy-p.y);
                            minSqDist = Math.min(minSqDist, distSq);
                            break;
                    }
                }
                if(minSqDist < maxRange) {

                    const pct = minSqDist/maxRange;
                    const fillClr = blendHexColors("#000000", randFill, pct);

                    ctx.fillStyle = fillClr;
                }
            }
            ctx.fill();

            //dRen++;
        }
        const dEnd = (new Date())-dA;
        console.log("Render Time: " + dEnd);
        //console.log("dots rendered per sec: " + (dRen/(dEnd/10)));
    }

    render() {
        // console.log(this.props);
        return (
            <canvas id="dotfield" ref="canvas" width={this.props.width} height={this.props.height}/>
        )
    }
}

export default Dotfield;
