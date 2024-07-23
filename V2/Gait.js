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
        this.frames = Maths.buildGait(this.options.steps*4);
        this.frameLength = this.frames.x.length;
    }
    getFrame(i) {
        return {
            x: this.frames.x[i],
            y: this.frames.y[i]
        }
    }
    getLegFrame(legIndex, i) {
        const n = Maths.cycle(i + (3-legIndex)*this.options.steps, 0, this.frameLength);

        return {
            x: this.frames.x[n],
            y: this.frames.y[n]
        }
    }

    PitchRollAssist() {
        const scope = this;
        this.robot.legs.forEach((leg, n) => {
            leg.offsets.x = scope.robot.options.pitch / 6;
            leg.offsets.y = -scope.robot.options.roll / 6;
        });
    }

    calculateTurnData() {
        let turnValue = Math.abs(this.options.turn);
        let turnDirection = this.options.turn > 0 ? 1 : -1;
        const minRadius = Maths.minRadius(this.robot.legs[1].center, this.robot.legs[2].center);
        const maxTurn = 50;

        const radiusB = Maths.map(Math.min(40, turnValue), maxTurn, 0, minRadius, maxTurn);

        /*console.log({
            turnDirection,
            minRadius,
            radiusB
        })*/

        const centerIndex = turnDirection==1 ? 1 : 0


        const center = Maths.findCircleCenters(
            this.robot.legs[turnDirection==1 ? 1 : 0].center,
            this.robot.legs[turnDirection==1 ? 2 : 3].center,
            radiusB
        )

        const dist = Maths.distance(
            this.robot.legs[turnDirection==1 ? 0 : 1].center.x, 
            this.robot.legs[turnDirection==1 ? 0 : 1].center.y,
            center[centerIndex].x,
            center[centerIndex].y
        );
        const radiusA = dist;

        this.turnData = {
            center: center[centerIndex],
            radiusA: radiusA,
            radiusB: radiusB
        }
    }


    tick() {
        const scope = this;
        this.PitchRollAssist();
        this.calculateTurnData();
        this.robot.legs.forEach((leg, n) => {
            // Get the frame data
            const pos = scope.getLegFrame(n, scope.i);

            // Update the leg data
            scope.robot.legs[n].stepSize = scope.options.stepSize; // default
            const ratio = this.turnData.radiusA/this.turnData.radiusB;

            // Set the desired tip coordinates
            if (this.options.turn > -1 && this.options.turn < 1) {
                scope.robot.legs[n].tip = scope.robot.legs[n].ik.globalFromRelative({
                    x: leg.offsets.x + pos.x*scope.robot.legs[n].stepSize, y: leg.offsets.y + 0, z: leg.offsets.z + pos.y*scope.options.stepHeight
                })
            } else {
                let coords;
                if ((this.options.turn > 0 && (n==1 || n==2)) || (this.options.turn < 0 && (n==0 || n==3))) {
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
                }
                scope.robot.legs[n].tip = {
                    x: coords.x, y: coords.y, z: leg.offsets.z + pos.y*scope.options.stepHeight
                }
            }
            
            // Apply the changes
            scope.robot.setAngles(n, scope.robot.legs[n].ik.getAngles());
        })
        this.i++;
        if (this.i>=scope.frameLength) {
            this.i = 0;
        }
    }
}