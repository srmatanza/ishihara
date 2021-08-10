import { quadtree } from 'd3-quadtree'
import alea from 'seedrandom';

const kLimit = 20

function Dot(_x, _y, _r, _clr, _id) {
    return {
        cx: _x||0,
        cy: _y||0,
        r: _r||25,
        clr: _clr,
        id: _id||0
    };
};

const isInCircleField = (width, height, pt) => {

    const dx = pt.cx-width/2;
    const dy = pt.cy-height/2;
    const dR = /*Math.sqrt*/(dx*dx+dy*dy);
    const boundary = (width/2-pt.r)*(width/2-pt.r);
    //const boundary = (maxRad-pt.r)*(maxRad-pt.r);
    if(dR<boundary) {
        return true;
    }
    return false;
}

const isInSquareField = (width, height, pt) => {
    const dx = pt.cx-width/2;
    const dy = pt.cy-height/2;
    if(dx > -width && dx < width && dy > -height && dy < height) {
        return true;
    }
    return false;
}

const isInField = isInCircleField;
//const isInField = isInSquareField;

// Only visit at points within mB of cPt
let findDistNearestPoint = (qtree, cPt, maxR) => {

    let minPt = maxR;
    const cx = cPt.cx, cy = cPt.cy;

    qtree.visit((node, x0, y0, x1, y1) => {
        
        const mB = maxR*2;
        if( x0<=(cx+mB) && (cx-mB)<=x1 &&
            y0<=(cy+mB) && (cy-mB)<=y1) {
                if(node.hasOwnProperty('data')) {
                    //node.data is a dot
                    const dx = node.data.cx - cx;
                    const dy = node.data.cy - cy;
                    let dPt = Math.sqrt(dx*dx + dy*dy);
                    dPt = dPt-node.data.r;
                    if(dPt<minPt) {
                        minPt = dPt;
                    }
                }
            
                return false;
            }
            return true;
        }
    );

    return minPt;
}

const getFillStyle = () => '#000000';

function Ishihara(width, height, minR, maxR, seed) {

    const initialSeed = seed||42;
    const arng = new alea(initialSeed);

    const dStart = new Date();

    let circlesDrawn = 0;
    const tree = quadtree().x((d)=>d.cx).y((d)=>d.cy);

    let kk = {cx: width/2, cy: height/2, r: maxR, id: 0};
    const Actives = [kk];
    let dd = getFillStyle();

    while(Actives.length>0) {
        const iSample = parseInt(arng()*Actives.length);
        const samplePt = Actives[iSample];

        const r1 = samplePt.r+minR;
        const r2 = samplePt.r+maxR;
        let kTested = kLimit;
        let bFound = false;

        do {
            // Generate a point in the ring between r1 and r2;
            const kR = arng()*(r2-r1)+r1;
            const kTheta = arng()*2*Math.PI;

            const kPt = {
                cx: samplePt.cx+Math.sin(kTheta)*kR,
                cy: samplePt.cy+Math.cos(kTheta)*kR,
                r: 0
            };

            const minDist = findDistNearestPoint(tree, kPt, maxR);
            kPt.r = minDist;
            if(minDist>=minR && isInField(width, height, kPt)) {
                bFound = true;
                // We found a valid sample!
                // Add it to the tree, and to the Actives list.
                const fillStyle = getFillStyle();
                circlesDrawn+=1;
                const dot = new Dot(kPt.cx, kPt.cy, minDist, fillStyle, circlesDrawn);
                tree.add(dot);
                Actives.push(kPt);
            }
            kTested -= 1;
        } while(!bFound && kTested>0);

        if(kTested === 0) {
            // We couldn't find a point, so remove iSample from the Actives list.
            Actives.splice(iSample,1);
        }
    }

    const hudTime = (new Date())-dStart;

    console.log("Time: " + (hudTime));
    console.log("Circles Drawn: " + circlesDrawn);
    console.log("Cirlces per sec: " + (1000*circlesDrawn/(hudTime)));

    return tree.data();
}

export default Ishihara;
