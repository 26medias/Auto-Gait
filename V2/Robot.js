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
    }

    createLeg(index, angle) {
        const legData = {
            index,
            angle,
            mirror: this.options.mirrors[index],
            anchor: Maths.pointCoord(0, 0, this.options.anchorRadius, angle),
            center: Maths.pointCoord(0, 0, this.options.centerRadius, angle),
            angles: {
                shoulder: 90,
                upper: 90,
                tip: 90
            },
            tip: {
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

    getAngles(index) {
        return this.legs[index].angles;
    }

    setAngles(index, angles) {
        this.legs[index].angles = angles;
        this.options.onUpdate && this.options.onUpdate(index, angles)
    }
}