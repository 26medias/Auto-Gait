import Maths from "./Maths.js";
import RobotLeg from "./RobotLeg.js";

export default class Robot {
    constructor(options) {
        this.options = options;
        this.init();
    }

    init() {
        const scope = this;
        this.legs = [];
        this.options.legs.forEach((leg, n) => {
            scope.createLeg(n, leg);
        });
        this.applyOffsets();
    }

    createLeg(index, leg) {
        const center = Maths.pointCoord(leg.x, leg.y, leg.centerDistance, leg.angle)
        console.log({center})
        const legData = {
            index,
            angle: leg.angle,
            mirror: this.options.mirrors[index],
            anchor: {x: leg.x, y: leg.y},
            center: center,
            true_center: center,
            angles: { // default angles
                shoulder: 90,
                upper: 90,
                tip: 90
            },
            tip: { // Tip position
                x: 0,
                y: 0,
                z: 0
            },
            tip3D: { // debug only
                x: 0,
                y: 0,
                z: 0
            },
            offsets: { // idk anymore, maybe delete
                x: 0,
                y: 0,
                z: 0
            },
            sizes: leg.size // identical legs
        }
        console.log(index, {leg, legData})
        legData.ik = new RobotLeg(this, index);
        this.legs.push(legData);
        legData.ik.init();
    }

    applyOffsets() {
        const scope = this;
        const robotOffsets = this.options.offsets;
        this.legs.forEach((leg, n) => {
            let offset = {...robotOffsets};
            if (leg.true_center.x < 0) {
                // Back
                offset.x = -robotOffsets.x;
            }
            if (leg.true_center.y < 0) {
                // Left
                offset.y = -robotOffsets.y;
            }
            //const correctedOffset = Maths.rotate(offset.x, offset.y, leg.true_center.x, leg.true_center.y, robotOffsets.angle);
            //leg.center.x = leg.true_center.x + correctedOffset.x;
            //leg.center.y = leg.true_center.y + correctedOffset.y;
            leg.center.x = leg.true_center.x + offset.x;
            leg.center.y = leg.true_center.y + offset.y;
            //leg.offsets.x = offset.x;
            //leg.offsets.y = offset.y;
        });
    }

    getAngles(index) {
        return this.legs[index].angles;
    }

    setAngles(index, angles) {
        if (this.options.angleTweaks && this.options.angleTweaks[index]) {
            angles = {
                shoulder: angles.shoulder + this.options.angleTweaks[index][0],
                upper: angles.upper + this.options.angleTweaks[index][1],
                tip: angles.tip + this.options.angleTweaks[index][2]
            }
        }
        if (this.options.fixAngles) {
            angles = this.options.fixAngles(angles);
        }
        this.legs[index].angles = angles;
        this.options.onUpdate && this.options.onUpdate(index, angles)
    }
}