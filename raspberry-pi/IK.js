var isNode = false;

if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // Node.js environment detected
    isNode = true;
    var Maths = require('./maths.js');
}

class IK {
    constructor(gait) {
        this.gait = gait;
        this.legs = [];
        this.init();
    }

    init() {
        for (let i=0;i<this.gait.options.leg.count;i++) {
            this.legs.push({
                angles: {
                    shoulder: 0,
                    upper: 0,
                    tip: 0
                }
            });
        }
    }

    update() {
        for (let i=0;i<this.gait.options.leg.count;i++) {
            this.updateLeg(i);
        }
        this.debug(this.legs[1].angles);
    }


    debug(data) {
        //$('#debug').text(JSON.stringify(data, null, 4));
    }

    /*
        This calculates the angles of the shoulder (left-right), upper arm (up-down) & tip (up-down) on a robot leg powered by servos
        The shoulder is attached to the body at `leg.anchor.x|y`, which it at `this.gait.body.legs[n].legAngle`° from the body center
        The upper arm is attached to the shoulder.
        The tip is attached to the upper arm.
    */
    updateLeg(n) {
        let leg = this.gait.body.legs[n];
        let anchor = {
            x: leg.anchor.x,
            y: leg.anchor.y,
        }
        let tip = {
            x: leg.foot.ax,
            y: leg.foot.ay,
        }
        let tip3D = {
            x: tip.x,
            y: leg.lift.z,
            z: tip.y,
        }

        let tip3D_updated_raw = Maths.rotate3DPoint([tip3D.x, tip3D.y, tip3D.z], [0, this.gait.body.z, 0], [this.gait.body.roll, this.gait.body.angle, this.gait.body.pitch]);
        //console.log(n, tip3D_updated)

        tip3D = {
            x: tip3D_updated_raw[0],
            y: tip3D_updated_raw[1],
            z: tip3D_updated_raw[2]
        }

        leg.tip3D = tip3D

        // Correct for body angle
        //tip = Maths.rotate(tip.x, tip.y, 0, 0, -this.gait.body.angle);

        // Shoulder Angle
        let _tip =  {
            x: tip3D.x,
            y: tip3D.z
        }
        //this.legs[n].angles.shoulder = Maths.cycle(this.angle2D(anchor, _tip) - this.gait.body.legs[n].legAngle + 90, 0, 360); //@todo: remove the cycle, fix raw angles
        this.legs[n].angles.shoulder = Maths.angle2D(anchor, _tip) - this.gait.body.legs[n].legAngle + 90// - this.gait.body.legs[n].legAngle + 90; //@todo: remove the cycle, fix raw angles
        
        let fixed = this.pointBetween({
            x: leg.anchor.x,
            y: this.gait.body.z + this.gait.options.leg.upper.offset[1],
            z: leg.anchor.y,
        },{
            x: tip.x,
            y: this.gait.body.z + this.gait.options.leg.upper.offset[1],
            z: tip.y,
        }, -this.gait.options.leg.upper.offset[0]);

        let anchor3D = fixed;
        //console.log(this.legs[n].tip3D)

        let groundAnchor = { // todo: Adapt this to body rotation
            x: anchor3D.x,
            y: leg.lift.z,
            z: anchor3D.z
        }
        
        // Adjust for ground height
        let triangleAngles3D = this.triangleAngles3D(anchor3D, tip3D, groundAnchor);

        // Distance from anchor to tip
        let tipDistance = this.distance3D(anchor3D, tip3D)
        let tipLength = this.gait.options.leg.tip.length+ this.gait.options.leg.tip.offset[0];
        let upperLength = this.gait.options.leg.upper.length;
        let triangleAngles = this.triangleAngles(tipLength, upperLength, tipDistance);

        // Upper Angle
        this.legs[n].angles.upper = -triangleAngles[0]+90 + (90-triangleAngles3D[1]);
        this.legs[n].angles.tip = -triangleAngles[2]+180;

    }

    getThirdPoint(pointA, pointC, ab, ac) {
        // Calculate the horizontal (x, z) distance between A and C
        const horizontalDistanceAC = Math.sqrt(Math.pow(pointC.x - pointA.x, 2) + Math.pow(pointC.z - pointA.z, 2));
    
        // Find the horizontal position of B along the line AC using similar triangles
        const ratio = ab / ac;
        const horizontalDistanceAB = horizontalDistanceAC * ratio;
    
        // Calculate the x and z coordinates of B
        const directionX = (pointC.x - pointA.x) / horizontalDistanceAC;
        const directionZ = (pointC.z - pointA.z) / horizontalDistanceAC;
        const bx = pointA.x + horizontalDistanceAB * directionX;
        const bz = pointA.z + horizontalDistanceAB * directionZ;
    
        // Use Pythagorean theorem to find the y-coordinate of B
        // (ab^2 = horizontalDistanceAB^2 + (yB - yA)^2)
        // Ensure yB is higher than yC
        const yDifference = Math.sqrt(ab * ab - horizontalDistanceAB * horizontalDistanceAB);
        const by = Math.max(pointC.y, pointA.y) + yDifference;
    
        return { x: bx, y: by, z: bz };
    }

    angle2D(pointA, pointB) {
        // Calculate the angle in radians
        const angleRadians = Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
    
        // Convert radians to degrees
        const angleDeg = angleRadians * (180 / Math.PI);
    
        // Return the angle in degrees
        return angleDeg;
    }
    distance2D(pointA, pointB) {
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        return Math.sqrt(dx * dx + dy * dy);
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
    angles3D(pointA, pointB) {
        // Calculate differences
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const dz = pointB.z - pointA.z;
    
        // Calculate angles in radians
        const angleX = Math.atan2(Math.sqrt(dy * dy + dz * dz), dx); // projection on YZ plane
        const angleY = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy); // projection on XZ plane
        const angleZ = Math.atan2(Math.sqrt(dx * dx + dy * dy), dz); // projection on XY plane
    
        // Convert radians to degrees and return
        return {
            x: angleX * (180 / Math.PI),
            y: angleY * (180 / Math.PI),
            z: angleZ * (180 / Math.PI)
        };
    }

    rotatePoint(point, rotCenter, angle, axis = 'x') {
        // Convert angle to radians
        const angleRad = angle * (Math.PI / 180);
    
        // Translate point to the rotation center
        const translatedPoint = {
            x: point.x - rotCenter.x,
            y: point.y - rotCenter.y,
            z: point.z - rotCenter.z
        };
    
        let rotatedPoint = { x: 0, y: 0, z: 0 };
    
        // Perform the rotation around the specified axis
        switch (axis) {
            case 'x':
                rotatedPoint.x = translatedPoint.x;
                rotatedPoint.y = translatedPoint.y * Math.cos(angleRad) - translatedPoint.z * Math.sin(angleRad);
                rotatedPoint.z = translatedPoint.y * Math.sin(angleRad) + translatedPoint.z * Math.cos(angleRad);
                break;
            case 'y':
                rotatedPoint.x = translatedPoint.x * Math.cos(angleRad) + translatedPoint.z * Math.sin(angleRad);
                rotatedPoint.y = translatedPoint.y;
                rotatedPoint.z = translatedPoint.z * Math.cos(angleRad) - translatedPoint.x * Math.sin(angleRad);
                break;
            case 'z':
                rotatedPoint.x = translatedPoint.x * Math.cos(angleRad) - translatedPoint.y * Math.sin(angleRad);
                rotatedPoint.y = translatedPoint.x * Math.sin(angleRad) + translatedPoint.y * Math.cos(angleRad);
                rotatedPoint.z = translatedPoint.z;
                break;
            default:
                throw new Error('Invalid axis');
        }
    
        // Translate the point back
        rotatedPoint.x += rotCenter.x;
        rotatedPoint.y += rotCenter.y;
        rotatedPoint.z += rotCenter.z;
    
        return rotatedPoint;
    }

    pointCoord(centerX, centerY, radius, angle) {
        var angleInRadians = angle * Math.PI / 180;
        var x = centerX + radius * Math.cos(angleInRadians);
        var y = centerY + radius * Math.sin(angleInRadians);
        return { x, y };
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

if (isNode) {
    module.exports = IK;
}