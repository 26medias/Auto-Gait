var isNode = false;

if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // Node.js environment detected
    isNode = true;
}

class Maths {
    
    // Polar to cartesian
    static pointCoord(centerX, centerY, radius, angle) {
        var angleInRadians = angle * Math.PI / 180;
        var x = centerX + radius * Math.cos(angleInRadians);
        var y = centerY + radius * Math.sin(angleInRadians);
        return { x, y };
    }

    // Cartesian to polar
    static polarCoordinates(centerX, centerY, x, y) {
        var deltaX = x - centerX;
        var deltaY = y - centerY;

        var radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        var angleInRadians = Math.atan2(deltaY, deltaX);

        // Convert the angle from radians to degrees
        var angleInDegrees = angleInRadians * 180 / Math.PI;

        // Adjust the angle to be between 0 and 360 degrees
        if (angleInDegrees < 0) {
            angleInDegrees += 360;
        }

        return { radius, angle: angleInDegrees };
    }

    // Is the point within the circle?
    static isWithinCircle(x, y, circleCenterX, circleCenterY, circleRadius) {
        var deltaX = x - circleCenterX;
        var deltaY = y - circleCenterY;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return distance <= circleRadius;
    }

    static cycle(value, min, max) {
        const range = max - min;
        return ((value - min) % range + range) % range + min;
    }
    

    // Bind the coordinates in an infinite world
    static bound(x, y, w, h) {
        if (x < 0) x = w;
        if (y < 0) y = h;
        if (x > w) x = 0;
        if (y > h) y = 0;
        return {x, y}
    }

    // Arduino map
    static map(value, fromLow, fromHigh, toLow, toHigh) {
        return (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
    }

    static translate(x, y, angle, distance) {
        // Convert angle from degrees to radians
        let angleInRadians = angle * Math.PI / 180;

        // Calculate the new coordinates
        let newX = x + distance * Math.cos(angleInRadians);
        let newY = y + distance * Math.sin(angleInRadians);

        return { x: newX, y: newY };
    }

    static rotate(x, y, centerX, centerY, angle) {
        // Convert angle from degrees to radians
        let angleInRadians = angle * Math.PI / 180;

        // Translate point to origin
        let translatedX = x - centerX;
        let translatedY = y - centerY;

        // Rotate point
        let rotatedX = translatedX * Math.cos(angleInRadians) - translatedY * Math.sin(angleInRadians);
        let rotatedY = translatedX * Math.sin(angleInRadians) + translatedY * Math.cos(angleInRadians);

        // Translate point back
        let finalX = rotatedX + centerX;
        let finalY = rotatedY + centerY;

        return { x: finalX, y: finalY };
    }

    static distance(x0, y0, x1, y1) {
        let dx = x1 - x0;
        let dy = y1 - y0;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distanceFromPoint(x, y, points) {
        return points.map(point => {
            const dx = point.x - x;
            const dy = point.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return { ...point, distance };
        });
    }

    static distanceFromCircleEdge(point, center, radius) {
        const dx = point.x - center.x;
        const dy = point.y - center.y;
    
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
    
        return distanceToCenter - radius;
    }

    // Center of the polygon
    static getCenter(points) {
        let cx = 0, cy = 0;
        let area = 0;
    
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const current = points[i];
            const previous = points[j];
    
            const a = current.x * previous.y - previous.x * current.y;
            cx += (current.x + previous.x) * a;
            cy += (current.y + previous.y) * a;
            area += a;
        }
    
        area = area / 2;
        cx = cx / (6 * area);
        cy = cy / (6 * area);
    
        return { x: cx, y: cy };
    }

    // Increased spacing between 0 & 1
    static generateIncreasingSpacing(count, power) {
        let values = Array.from({length: count}, (_, i) => Math.pow(i / (count - 1), power));
        return values;
    }

    // 90° intersection coordinates on a line
    static findIntersection(x1, y1, x2, y2, x0, y0) {
        if (x1 === x2) {
          return { x: x1, y: y0 };
        }
        if (y1 === y2) {
          return { x: x0, y: y1 };
        }
        
        const m = (y2 - y1) / (x2 - x1);
        const mPerpendicular = -1 / m;
        const x = (mPerpendicular * x0 - y0 + y1 - m * x1) / (mPerpendicular - m);
        const y = m * (x - x1) + y1;
        return { x, y };
    }

    // Sort points by distance from the reverse vector
    static sortByDistanceFromVector(vX, vY, vAngle, pointsArray) {
        // Convert angle to radians and adjust for the opposite direction
        const radianAngle = (vAngle + 180) * (Math.PI / 180);
        
        // Calculate the unit vector in the opposite direction
        const ux = Math.cos(radianAngle);
        const uy = Math.sin(radianAngle);
        
        // Map each point to an object that includes the distance from the anchor point
        // in the direction opposite of the vector
        const pointsWithDistance = pointsArray.map(point => {
            // Calculate the vector from the anchor to the point
            const dx = point.x - vX;
            const dy = point.y - vY;
            
            // Calculate the dot product to get the projection on the opposite vector direction
            const dot = dx * ux + dy * uy;
            
            // The projection of the distance on the opposite vector direction
            const distance = Math.sqrt(dx * dx + dy * dy) * Math.sign(dot);
            
            return { ...point, distance };
        });

        // Sort the points by the projection of their distance on the vector's opposite direction
        pointsWithDistance.sort((a, b) => b.distance - a.distance);

        // Return the sorted array with distance property
        return pointsWithDistance;
    }

    // Build the gait steps
    static buildGait(frames) {
        let frame = Array.from({length: frames}, (_, i) => i);
        const swingEnd = Math.PI / 2;
        const twoPi = 2 * Math.PI;
    
        // longitudinal Movement
        let swing = frame.map(f => -Math.cos(2 * (f * twoPi / frames)));
        let stance = frame.map(f => Math.cos(2 / 3 * (f * twoPi / frames - swingEnd)));
        let swingSlice = frame.map(f => f <= swingEnd / (twoPi / frames));
        let stanceSlice = swingSlice.map(s => !s);
        let longitudinalMovement = swing.filter((_, i) => swingSlice[i])
            .concat(stance.filter((_, i) => stanceSlice[i]));
        longitudinalMovement = longitudinalMovement.concat(longitudinalMovement, longitudinalMovement, longitudinalMovement);
    
        // vertical Movement
        let lift = frame.map(f => Math.sin(2 * (f * twoPi / frames)));
        let liftSlice = swingSlice;
        let verticalMovement = lift.filter((_, i) => liftSlice[i])
            .concat(Array(stanceSlice.filter(Boolean).length).fill(0));
        verticalMovement = verticalMovement.concat(verticalMovement, verticalMovement, verticalMovement);
    
        return { x: longitudinalMovement, y: verticalMovement };
    }
}
if (isNode) {
    module.exports = Maths;
}