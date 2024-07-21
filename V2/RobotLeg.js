export default class RobotLeg {
    constructor(options) {
        this.options = options;
        this.tip = {
            x: 0,
            y: 0,
            z: 0
        }
    }

    getAngles(x, y, z) { // x,y from top, y=up-down

        let angles = {
            shoulder: 90,
            upper: 90,
            tip: 90
        }

        let tip3D = {
            x: this.tip.x,
            y: this.tip.z,
            z: this.tip.y,
        }

        let _tip =  {
            x: tip3D.x,
            y: tip3D.z
        }
        angles.shoulder = Maths.angle2D(this.options.anchor, this.tip) - this.options.angle + 90;
        
        let fixed = this.pointBetween({
            x: this.options.anchor.x,
            y: this.options.upper.offset[1],
            z: this.options.anchor.y,
        },{
            x: this.tip.x,
            y: this.options.upper.offset[1],
            z: this.tip.y,
        }, -this.options.upper.offset[0]);

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
        let tipLength = this.options.tip.length + this.options.tip.offset[0];
        let upperLength = this.options.upper.length;
        let triangleAngles = this.triangleAngles(tipLength, upperLength, tipDistance);

        // Upper Angle
        angles.upper = -triangleAngles[0]+90 + (90-triangleAngles3D[1]);
        angles.tip = -triangleAngles[2]+180;

        return angles;
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