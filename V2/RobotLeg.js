import Maths from "./Maths.js";

export default class RobotLeg {
    constructor(robot, index) {
        this.robot = robot;
        this.index = index;
    }

    // Init the default positions & angles
    init() {
        const robotLeg = this.robot.legs[this.index];
        robotLeg.tip = this.globalFromRelative({
            x: 0, y: 0, z: 0
        })
        this.robot.setAngles(this.index, this.getAngles());
    }

    getAngles() { // x,y from top, y=up-down

        const robotLeg = this.robot.legs[this.index];

        let angles = {
            shoulder: 90,
            upper: 90,
            tip: 90
        }

        let tip3D = {
            x: robotLeg.tip.x,
            y: robotLeg.tip.z,
            z: robotLeg.tip.y,
        }
        
        let fixed = this.pointBetween({
            x: robotLeg.anchor.x,
            y: this.robot.options.z + robotLeg.sizes.upper.offset[1],
            z: robotLeg.anchor.y,
        },{
            x: robotLeg.tip.x,
            y: this.robot.options.z + robotLeg.sizes.upper.offset[1],
            z: robotLeg.tip.y,
        }, -robotLeg.sizes.upper.offset[0]);

        let anchor3D = fixed;

        let groundAnchor = {
            x: anchor3D.x,
            y: 0,
            z: anchor3D.z
        }
        
        // Adjust for ground height
        let triangleAngles3D = this.triangleAngles3D(anchor3D, tip3D, groundAnchor);

        // Distance from anchor to tip
        let tipDistance = this.distance3D(anchor3D, tip3D)
        let tipLength = robotLeg.sizes.tip.length + robotLeg.sizes.tip.offset[0];
        let upperLength = robotLeg.sizes.upper.length;
        let triangleAngles = this.triangleAngles(tipLength, upperLength, tipDistance);

        // Shoulder
        angles.shoulder = Maths.angle2D(robotLeg.anchor, robotLeg.tip) - robotLeg.angle + 90;
        // Upper
        angles.upper = -triangleAngles[0]+90 + (90-triangleAngles3D[1]);
        if (!robotLeg.mirror) {
            angles.upper = 180 - angles.upper;
        }
        // Tip
        angles.tip = -triangleAngles[2]+180;
        if (robotLeg.mirror) {
            angles.tip = 180 - angles.tip;
        }
        angles.shoulder = this.limit180(this.cycle(angles.shoulder, 0, 360));
        angles.upper = this.limit180(this.cycle(angles.upper, 0, 360));
        angles.tip = this.limit180(this.cycle(angles.tip, 0, 360));

        return angles;
    }

    cycle(value, min, max) {
        const range = max - min;
        return ((value - min) % range + range) % range + min;
    }

    limit180(angle) {
        if (angle > 300) angle = 0; // Probably want a value in that direction
        if (angle > 180) angle = 180;
        return angle;
    }

    globalFromRelative(point) {
        const robotLeg = this.robot.legs[this.index];
        return {
            x: point.x + robotLeg.center.x,
            y: point.y + robotLeg.center.y,
            z: point.z,
        }
    }

    distance3D(pointA, pointB) {
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        const dz = pointA.z - pointB.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    triangleAngles(sideA, sideB, sideC) {
        sideC = Math.min(sideC, (sideA+sideB)*0.9999);
        const angleAB = Math.acos((sideB * sideB + sideC * sideC - sideA * sideA) / (2 * sideB * sideC));
        const angleBC = Math.acos((sideA * sideA + sideC * sideC - sideB * sideB) / (2 * sideA * sideC));
        const angleCA = Math.acos((sideA * sideA + sideB * sideB - sideC * sideC) / (2 * sideA * sideB));
    
        // Convert radians to degrees
        return [
            angleAB * (180 / Math.PI),
            angleBC * (180 / Math.PI),
            angleCA * (180 / Math.PI)
        ];
    }

    triangleAngles3D(pointA, pointB, pointC) {
        // Function to calculate distance between 3D points
        const distance = (p1, p2) => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dz = p1.z - p2.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        };
    
        // Calculate the lengths of the sides of the triangle
        const sideAB = distance(pointA, pointB);
        const sideBC = distance(pointB, pointC);
        const sideAC = distance(pointA, pointC);
    
        // Calculate the angles in radians
        const angleAB = Math.acos((sideBC * sideBC + sideAC * sideAC - sideAB * sideAB) / (2 * sideBC * sideAC));
        const angleBC = Math.acos((sideAB * sideAB + sideAC * sideAC - sideBC * sideBC) / (2 * sideAB * sideAC));
        const angleAC = Math.acos((sideAB * sideAB + sideBC * sideBC - sideAC * sideAC) / (2 * sideAB * sideBC));
    
        // Convert radians to degrees
        return [
            angleAB * (180 / Math.PI),
            angleBC * (180 / Math.PI),
            angleAC * (180 / Math.PI)
        ];
    }

    pointBetween(pointA, pointB, distance) {
        // Calculate the vector AB
        const vectorAB = {
            x: pointB.x - pointA.x,
            y: pointB.y - pointA.y,
            z: pointB.z - pointA.z
        };
    
        // Calculate the magnitude of vector AB
        const magnitudeAB = Math.sqrt(vectorAB.x * vectorAB.x + vectorAB.y * vectorAB.y + vectorAB.z * vectorAB.z);
    
        // Normalize the vector AB
        const normalizedAB = {
            x: vectorAB.x / magnitudeAB,
            y: vectorAB.y / magnitudeAB,
            z: vectorAB.z / magnitudeAB
        };
    
        // Scale the normalized vector by the distance
        const scaledVector = {
            x: normalizedAB.x * distance,
            y: normalizedAB.y * distance,
            z: normalizedAB.z * distance
        };
    
        // Translate point A by the scaled vector to get the new point
        return {
            x: pointA.x + scaledVector.x,
            y: pointA.y + scaledVector.y,
            z: pointA.z + scaledVector.z
        };
    }
}