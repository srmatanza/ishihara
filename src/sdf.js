// Referenced from:
// http://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm

const { Point, PP } = require('./point')

module.exports = {
    SDF: {}
}

module.exports.SDF.sdCircle = function(ptX, ptCenter, radius) {
    return PP.ptDist(ptX, ptCenter) - radius
}

module.exports.SDF.sdLine = function(ptX, ptA, ptB) {
    const pa = ptX.sub(ptA)
    const ba = ptB.sub(ptA)
    const h = Math.min( Math.max(PP.dot(pa, ba)/PP.dot(ba, ba), 0.0), 1.0)
    return PP.ptDistSq(Point(0, 0), pa.sub(ba.mul(h)))
}
