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
        this.frames = Maths.buildGait_v2(this.options.steps*this.robot.legs.length, this.robot.legs.length);
        this.frameLength = this.frames.x.length;
        this.frameSize = this.frames.x.length/this.robot.legs.length;
        window.Maths = Maths;
    }
    getFrame(i) {
        return {
            x: this.frames.x[i],
            y: this.frames.y[i]
        }
    }
    getGaitIndex(groupIndex, groupCount, n, data) {
        // Calculate the start index of the group
        const startIndex = groupIndex * groupCount;
        
        // Calculate the desired index within the group
        const gaitIndex = startIndex + n;
        
        // Check if the calculated index is within the bounds of the data array
        if (gaitIndex >= data.length) {
            throw new Error("Index out of bounds");
        }
        
        return gaitIndex;
    }
    getLegFrame(legIndex, i) {
        return this.getLegFrame_double(legIndex, i);
    }

    getLegFrame_single(legIndex, i) {
        const n = Maths.cycle(i + legIndex*this.options.steps, 0, this.frameLength);

        return {
            x: this.frames.x[n],
            y: this.frames.y[n]
        }
    }
    getLegFrame_double(legIndex, i) {
        const n = Maths.cycle(i + Maths.cycle(legIndex, 0, this.robot.legs.length/2)*this.options.steps, 0, this.frameLength);

        return {
            x: this.frames.x[n],
            y: this.frames.y[n]
        }
    }
    getLegFrame_tripod(legIndex, i) {
        const n = Maths.cycle(i + Maths.cycle(legIndex, 0, this.robot.legs.length/3)*this.options.steps, 0, this.frameLength);

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

            // Set the desired tip coordinates
            let coords;
            coords = scope.robot.legs[n].ik.globalFromRelative({
                x: leg.offsets.x + pos.x*scope.robot.legs[n].stepSize, y: leg.offsets.y + 0, z: leg.offsets.z + pos.y*scope.options.stepHeight
            })
            coords = {
                z: coords.z,
                ...Maths.rotate(coords.x, coords.y, scope.robot.legs[n].center.x, scope.robot.legs[n].center.y, scope.options.angle) // Rotation of the gait direction
            }
            scope.robot.legs[n].tip = coords;
        })
            
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