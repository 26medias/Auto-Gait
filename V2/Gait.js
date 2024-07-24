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
        this.frames = Maths.buildGait(this.options.steps*5);
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
        //this.PitchRollAssist();
        this.calculateTurnData();
        this.robot.legs.forEach((leg, n) => {
            // Get the frame data
            const pos = scope.getLegFrame(n, scope.i);

            // Update the leg data
            scope.robot.legs[n].stepSize = scope.options.stepSize; // default
            const ratio = this.turnData.radiusA/this.turnData.radiusB;

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