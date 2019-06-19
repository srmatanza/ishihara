
module.exports = {
    PP: {}
};

let Point = function(_x, _y) {

    var ret = {};
    ret.x = _x||0;
    ret.y = _y||0;
    ret.mul = (s)=>new Point(ret.x*s, ret.y*s);
    ret.add = (p2)=>new Point(ret.x+p2.x, ret.y+p2.y);
    ret.sub = (p2)=>new Point(ret.x-p2.x, ret.y-p2.y);

    return ret;
};

module.exports.Point = Point

module.exports.PP.dot = (ptA, ptB) => {
    return (ptA.x*ptB.x)+(ptA.y*ptB.y);
}

let ptDistSq = (ptA, ptB) => {
    let x2 = (ptB.x-ptA.x)*(ptB.x-ptA.x);
    let y2 = (ptB.y-ptA.y)*(ptB.y-ptA.y);
    return (x2+y2);
}
module.exports.PP.ptDistSq = ptDistSq

let ptDist = (ptA, ptB) => {
    return Math.sqrt(ptDistSq(ptA, ptB))
}

module.exports.PP.ptDist = ptDist