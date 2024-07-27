import Maths from "./Maths.js";


export default class Gait {
    constructor(robot, options) {
        this.robot = robot;
        this.options = options;
        this.init();
    }
    init() {
        const scope = this;
        this.i = 0;
        this.frames = Maths.buildGait(this.options.steps*this.robot.legs.length*2);
        this.frameLength = this.frames.x.length;
        this.frameSize = this.frames.x.length/this.robot.legs.length;
    }
    getFrame(i) {
        return {
            x: this.frames.x[i],
            y: this.frames.y[i]
        }
    }
    getLegFrame_0(legIndex, n) {
        // Calculate the start index of the group
        const startIndex = legIndex * this.frameSize;
        
        // Calculate the desired index within the group
        const gaitIndex = startIndex + n;
        
        // Check if the calculated index is within the bounds of the data array
        if (gaitIndex >= this.frameLength.length) {
            throw new Error("Index out of bounds");
        }

        return {
            x: this.frames.x[gaitIndex],
            y: this.frames.y[gaitIndex]
        }
    }
    getLegFrame(legIndex, i) {
        const n = Maths.cycle(i + Maths.cycle(legIndex, 0, this.robot.legs.length/2)*this.options.steps, 0, this.frameLength/2);

        return {
            x: this.frames.x[n],
            y: this.frames.y[n]
        }
    }
    getLegFrame_single(legIndex, i) {
        const n = Maths.cycle(i + legIndex*this.options.steps, 0, this.frameLength);

        return {
            x: this.frames.x[n],
            y: this.frames.y[n]
        }
    }


    tick() {
        const scope = this;
        this.robot.legs.forEach((leg, n) => {
            // Get the frame data
            const pos = scope.getLegFrame(n, scope.i);

            // Update the leg data
            scope.robot.legs[n].stepSize = scope.options.stepSize; // default
            const ratio = 1; //this.turnData.radiusA/this.turnData.radiusB;

            // Set the desired tip coordinates
            let coords;
            if (this.options.turn > -1 && this.options.turn < 1) {
                coords = scope.robot.legs[n].ik.globalFromRelative({
                    x: leg.offsets.x + pos.x*scope.robot.legs[n].stepSize, y: leg.offsets.y + 0, z: leg.offsets.z + pos.y*scope.options.stepHeight
                })
            } else {
                if ((this.options.turn > 0 && (leg.true_center.y>0 || leg.true_center.y>0)) || (this.options.turn < 0 && (leg.true_center.y<0 || leg.true_center.y<0))) {
                    coords = Maths.getArcIntersectionAt(pos.x, scope.robot.legs[n].center, scope.robot.legs[n].stepSize, this.turnData.center, this.turnData.radiusB, false);
                } else {
                    // Update the size of the each step to match the turn ratio
                    scope.robot.legs[n].stepSize *= ratio;
                    // Move the feet centers to avoid overlaps
                    const originalCenter = Maths.pointCoord(0, 0, scope.robot.options.centerRadius, scope.robot.legs[n].angle);
                    const newCenter = Maths.rotate(originalCenter.x, originalCenter.y, this.turnData.center.x, this.turnData.center.y, n==0?ratio/2:-ratio/2);
                    // Update the step center
                    robot.legs[n].center = newCenter;
                    // Translate to arc coordinates
                    coords = Maths.getArcIntersectionAt(pos.x, scope.robot.legs[n].center, scope.robot.legs[n].stepSize, this.turnData.center, this.turnData.radiusA, false);
                    coords.z = leg.offsets.z + pos.y*scope.options.stepHeight
                }
            }
            coords = {
                z: coords.z,
                ...Maths.rotate(coords.x, coords.y, scope.robot.legs[n].center.x, scope.robot.legs[n].center.y, scope.options.angle) // Rotation of the gait direction
            }
            scope.robot.legs[n].tip = coords;
        })
        // Apply step damping
        const liftedLeg = this.robot.legs.find((leg) => leg.tip.z > leg.offsets.z);
        if (liftedLeg) {
            const oppositeLegIndex = Maths.cycle(liftedLeg.index+2, 0, 4);
            this.robot.legs[oppositeLegIndex].tip.z = this.robot.legs[oppositeLegIndex].offsets.z + (this.robot.legs[liftedLeg.index].tip.z-this.robot.legs[liftedLeg.index].offsets.z)*this.options.stepDamping;
        }
            
        this.robot.legs.forEach((leg, n) => {
            // Apply the changes
            scope.robot.setAngles(n, scope.robot.legs[n].ik.getAngles());
        });
        //console.log(liftedLeg)
        this.i++;
        if (this.i>=scope.frameLength) {
            this.i = 0;
        }
    }
}