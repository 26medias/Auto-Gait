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
        this.options.angles.forEach((angle, n) => {
            scope.createLeg(n, angle);
        });
        this.applyOffsets();
    }

    createLeg(index, angle) {
        const legData = {
            index,
            angle,
            mirror: this.options.mirrors[index],
            anchor: Maths.pointCoord(0, 0, this.options.anchorRadius, angle),
            center: Maths.pointCoord(0, 0, this.options.centerRadius, angle),
            true_center: Maths.pointCoord(0, 0, this.options.centerRadius, angle),
            angles: {
                shoulder: 90,
                upper: 100,
                tip: 90
            },
            tip: {
                x: 0,
                y: 0,
                z: 0
            },
            tip3D: { // debug only
                x: 0,
                y: 0,
                z: 0
            },
            offsets: {
                x: 0,
                y: 0,
                z: 0
            },
            sizes: this.options.sizes // identical legs
        }
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