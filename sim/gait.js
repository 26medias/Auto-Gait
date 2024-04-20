var isNode = false;

if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // Node.js environment detected
    isNode = true;
}

if (isNode) {
    var _ = require('underscore');
    //var Maths = require('./maths.js');
} 

class AutoGait {
    constructor(canvas, options, onTick) {
        let scope = this;
        if (isNode) {
            var fake = require('./fake');
            this.canvas = new fake.Canvas();
            this.control = new fake.Control();
        } else {
            this.canvas = new Canvas($(canvas));
            this.control = new Control(this.canvas, this, function(value) {
                if (value) {
                    scope.start();
                } else {
                    scope.stop();
                }
            }, function(value) {
                scope.body.applyRotationVector(value)
            });
        }
        
        this.onTick = onTick;
        this.options = _.extend({
            render: true,
            width: 800,
            height: 600,
            body: {
                radius: 60,
                height: 2,
                type: 'radial',
                legRadius: 45
            },
            leg: {
                decayRate: 1,
                distance: 100,
                count: 6,
                radius: 30,
                maxZ: 5,
            },
            movement: {
                angle: 45,
                distance: 5,
                spread: 2,
                spreadDistance: 5
            },
            gait: {
                steps: 4
            },
            tick: 100
        }, options);
        this.init();
    }

    init() {
        this.body = new Body(this.options, this.canvas);
        this.render();
    }


    // RENDER
    render() {
        if (this.options.render) {
            this.body.render();
            this.control.render();
        }
    }

    // On tick
    tick() {
        // Reset the vectors
        this.body.resetVectors();
        this.body.resetLegVectors();
        // Apply the external actions (apply vectors, ...)
        this.onTick(this);
        // Body tick
        this.body.tick();
        // 2D Render
        this.render();
    }

    start() {
        let scope = this;
        this.itv = setInterval(function() {
            scope.tick();
        }, this.options.tick);
    }

    stop() {
        clearInterval(this.itv);
        this.render();
    }
}





/***************
* BODY
***************/

class Body {
    constructor(options, canvas) {
        const scope = this;
        this.canvas = canvas;
        this.options = options;

        // Initial Position
        this.x = 200;
        this.y = 200;
        this.z = options.body.z;

        this.turnTowardVector = true;

        // Roll/Pitch
        this.roll = 0;
        this.pitch = 0;

        this.offset = {
            x: 0,
            y: 0
        }
        this.angle = 0;
        this.streamline = options.body.streamline;

        // overwrite
        
        this.updateLegRadius = function(value) {
            scope.options.gait.maxSpeed = value / ((scope.options.gait.steps * (scope.options.leg.count-1)) / 2)
        }
        this.updateLegRadius(this.options.leg.radius);

        // Initial vectors
        this.resetVectors();

        // Create the legs
        this.legs = [];
        let i;
        switch (this.options.body.type) {
            case 'radial':
                for (i=0;i<this.options.leg.count;i++) {
                    let legAngle = (360/this.options.leg.count)*i;// + this.angle;
                    let legAnchor = Maths.pointCoord(0, 0, this.options.body.legRadius, legAngle);
                    let legPosition = Maths.pointCoord(0, 0, this.options.leg.distance, legAngle);
                    let leg = new Leg(this, legAnchor, legPosition, this.options.leg, this.canvas);
                    leg.n = i;
                    leg.legAngle = legAngle;
                    leg.lift.lifted = i % 2 == 0; // Default initial state for the legs
                    this.legs.push(leg);
                }
            break;
            case 'custom':
                this.options.body.builder(this, Leg);
            break;
        }
    }

    resetVectors() {
        this.vectors = {
            rotation: {
                angle: 0
            },
            translation: {
                angle: 0,
                radius: 0,
                x: 0,
                y: 0
            }
        };
    }

    // Reset vectors before tick
    resetLegVectors() {
        let i;
        for (i=0;i<this.legs.length;i++) {
            this.legs[i].resetVectors();
        }
    }

    getLegsSortedByDistance(vector, iterator) {
        let vectCoords = Maths.pointCoord(0, 0, vector.radius, vector.angle);
        // Update the legs
        let legCoords = this.legs.map((item, n) => {
            let point = iterator(item);
            let intersect = Maths.findIntersection(0, 0, vectCoords.x, vectCoords.y, point.x, point.y);
            let distance = Maths.distance(0, 0, intersect.x, intersect.y);
            return {
                n,
                x: point.x,
                y: point.y,
                intersect,
                distance,
            };
        })

        let offsets = Maths.sortByDistanceFromVector(0, 0, vector.angle, legCoords.map((item) => ({n:item.n, ...item.intersect})));
        offsets.sort((a, b) => a.n-b.n)
        return {offsets, legCoords};
    }


    // Change movement vector
    applyTranslationVector(vector) {
        this.vectors.translation.angle = vector.angle;
        this.vectors.translation.radius = vector.distance*this.options.gait.maxSpeed/100; // Convert percent to actual cm/tick speed
        
        // Convert to cartesian
        let cartesianChange = Maths.pointCoord(0, 0, this.vectors.translation.radius, this.vectors.translation.angle);
        this.vectors.translation.x = cartesianChange.x;
        this.vectors.translation.y = cartesianChange.y;
    }

    // Increment rotation
    applyRotationVector(vector) {
        this.vectors.rotation.angle = vector.angle;
        //------------------------------
        this.angle += vector.angle;
    }


    // Apply the vector forces on the body
    applyVectorForces() {
        let i;
        let scope = this;
        // Release the landing limits
        if (this.vectors.translation.radius>0) {
            this.unrest();
        }
        //console.log(this.vectors.translation.radius)

        /*console.log({
            angle: this.angle,
            tangle: this.vectors.translation.angle,
            diff: 
        })*/

        let angularStepChange = 0;

        if (this.turnTowardVector) {
            const angularTargetDiff = this.vectors.translation.angle - this.angle;
            angularStepChange = Math.max(Math.min(angularTargetDiff/10, this.options.gait.maxTurnAngle), -this.options.gait.maxTurnAngle);
            this.angle += angularStepChange;
        }
        

        for (i=0;i<this.legs.length;i++) {
            this.legs[i].applyBodyRotationVector(this.vectors.rotation.angle + angularStepChange);
        }

        //console.log(this.vectors.translation.angle, this.angle, angularTargetDiff, angularStepChange)

        // Update the body position
        this.x += this.vectors.translation.x;
        this.y += this.vectors.translation.y;

        // @test
        // Bind in an infinite world
        this.x = Maths.bound(this.x, this.y, this.options.width/2, this.options.height/2).x;
        this.y = Maths.bound(this.x, this.y, this.options.width/2, this.options.height/2).y;


        // Streamlining the gait
        let centerOffsets = this.getLegsSortedByDistance(this.vectors.translation, function(item) {return {x: item.center.x, y: item.center.y}});
        this.offsets = centerOffsets.offsets;
        let legCoords = centerOffsets.legCoords.map((item, n) => {
            item.distanceOffset = scope.offsets[n].distance;
            item.offset = Maths.pointCoord(0, 0, item.distanceOffset*scope.streamline/100, this.vectors.translation.angle);
            item.polarCoords = Maths.polarCoordinates(0, 0, -item.offset.x, -item.offset.y);
            return {
                x: item.x - item.offset.x,
                y: item.y - item.offset.y,
                n: item.n,
                polar: item.polarCoords
            };
        })
        this.areaOffsets = legCoords;

        // Update the legs
        for (i=0;i<this.legs.length;i++) {
            // Apply the streamline offset
            //this.legs[i].offset = this.areaOffsets[i].polar;

            // apply the vector to the legs
            this.legs[i].applyBodyTranslationVector(this.vectors.translation, this.vectors.translation);
        }
    }

    // Return the various body centers
    updateCenters() {
        let scope = this;
        let centerAll = Maths.getCenter(this.legs.map(function(leg) {
            return {
                x: leg.foot.ax,
                y: leg.foot.ay
            }
        }))
        let centerDown = Maths.getCenter(this.legs.filter(function(leg) {
            return !leg.lift.lifted;
        }).map(function(leg) {
            return {
                x: leg.foot.ax,
                y: leg.foot.ay
            }
        }))
        let centerUp = Maths.getCenter(this.legs.filter(function(leg) {
            return leg.lift.lifted;
        }).map(function(leg) {
            return {
                x: leg.foot.ax,
                y: leg.foot.ay
            }
        }))


        let offsetVector = Maths.polarCoordinates(centerAll.x, centerAll.y, centerDown.x, centerDown.y);

        this.offset = {
            ...offsetVector,
            x: centerAll.x - centerDown.x,
            y: centerAll.y - centerDown.y,
        }

        this.centers = {
            center: centerAll,
            up: centerUp,
            down: centerDown,
            offsetVector
        };
        return this.centers;
    }

    rest() {
        let i;
        for (i=0;i<this.legs.length;i++) {
            this.legs[i].lift.lifted = true;
            this.legs[i].lift.max = 0;
            this.legs[i].foot.radius = 0;
            this.legs[i].setPositionByVector();
        }
        this.tick();
    }

    unrest() {
        let i;
        for (i=0;i<this.legs.length;i++) {
            this.legs[i].lift.max = 100;
        }
    }

    //@todo: update support for shoving: predictive next position
    computeLegsPriority() {
        let scope = this;
        let i;

        // Filter on legs that are on the ground with a foot radius > 60%
        let moveCandidates = _.filter(_.clone(this.legs), function(leg) {
            return !leg.lift.lifted && leg.foot.radius > 30;
        }).sort(function(a, b) { 
            return b.foot.radius - a.foot.radius
        });
        /*if (moveCandidates.length>0) {
            console.log(moveCandidates);
        }*/

        for (i=0;i<this.legs.length;i++) {
            this.legs[i].priority = null;
        }
        _.each(moveCandidates, function(item, n) {
            scope.legs[item.n].priority = n;
        });

        for (i=0;i<this.legs.length;i++) {
            //this.legs[i].debug = this.legs[i].foot.radius;
            //this.legs[i].debug = this.legs[i].vectors;
        }
    }

    tick() {
        let i;

        this.updateCenters();

        this.options.gait.logic(this, this.legs);

        // Compute leg priority
        this.computeLegsPriority();

        // Apply the vector forces on the body
        this.applyVectorForces();

        // Tick the legs
        for (i=0;i<this.legs.length;i++) {
            this.legs[i].tick();
        }

        this.autocorrect();
    }

    autocorrect() {
        let i;
        for (i=1;i<this.legs.length;i++) {
            if (this.legs[i].lift.lifted && this.legs[i-1].lift.lifted) {
                this.legs[i].downLeg();
            }
        }
    }

    // RENDER
    render() {
        let i;
        // Clear the canvas
        this.canvas.clear();

        // Render the info
        this.renderInfo();

        // Render the legs
        for (i=0;i<this.legs.length;i++) {
            this.legs[i].render();
        }

        // Render the body
        this.renderBody();
    }

    renderBody() {
        let i;
        // Render the body
        let bodyPoints = [];
        let angleSlice = (360/this.options.leg.count);
        for (i=0;i<this.options.leg.count;i++) {
            let point = Maths.pointCoord(0, 0, this.options.body.radius, angleSlice*i + this.angle + angleSlice/2);
            bodyPoints.push(point);
        }
        this.canvas.polygon(this.x, this.y, bodyPoints);
    }

    renderInfo() {
        let touchingFloor = this.legs.filter((leg) => !leg.lift.lifted).map((item) => ({x: item.foot.ax, y: item.foot.ay}));
        this.canvas.polygon(this.x, this.y, touchingFloor, 'rgba(255, 179, 0)', 'rgba(255, 179, 0, 0.2)', 1);
        let notTouchingFloor = this.legs.filter((leg) => leg.lift.lifted).map((item) => ({x: item.foot.ax, y: item.foot.ay}));
        this.canvas.polygon(this.x, this.y, notTouchingFloor, 'rgba(0, 0, 0)', 'rgba(0, 0, 0, 0.1)', 1);
    }

}




/***************
* LEG
***************/

class Leg {
    constructor(body, legAnchor, center, options, canvas) {
        this.canvas = canvas;
        this.body = body;
        this.options = options;
        this.anchor = legAnchor;
        this.mirrored = {
            shoulder: false,
            upper: false,
            tip: false
        }

        this.tip3D = {x: 0, y: 0, z: 0}

        // force vectors applied
        this.resetVectors();

        // Center of the motion circle
        this.center = center;

        // Motion circle offset
        this.offset = {
            angle: 0,  // Center offset vector
            radius: 0  // Center offset vector
        };
        // Foot data
        this.foot = {
            ax: 0,      // Actual position
            ay: 0,      // Actual position
            prev_x: 0,  // Previous known position
            prev_y: 0,  // Previous known position
            x: 0,       // Desired position
            y: 0,       // Desired position
            angle: 0,   // Angle from center
            radius: 0   // Radius from center
        }

        // Gait Steps
        this.gaitSteps = Maths.buildGait(this.body.options.gait.steps*4);

        // Status
        this.lift = {
            lifted: false,  // Lifted status
            n: 0,           // Lift gait step index
            z: 0,           // Z position
            min: -100,      // Min position (0 = center)
            max: 100        // Max position (0 = center)
        }

        // State
        this.state = {
            priority: 0,
            tx: 0,
            ty: 0,
        }

        this.setPositionByVector();
    }

    resetVectors() {
        this.vectors = {
            rotation: {
                angle: 0
            },
            translation: {
                angle: 0,
                radius: 0,
                x: 0,
                y: 0
            }
        };
    }

    // Get the motion circle coordinates
    getCenter() {
        let offset = Maths.pointCoord(0, 0, this.offset.radius, this.offset.angle);
        return {
            x: this.center.x + offset.x,
            y: this.center.y + offset.y
        }
    }

    cycle(value, min, max) {
        const range = max - min;
    
        // Adjust the value to be within the range starting from zero
        value = (value - min) % range;
    
        // Correct for negative values
        if (value < 0) {
            value += range;
        }
    
        return value + min;
    }

    integrateVectors(translationVector, rotationVector) {
        return {
            angle: (translationVector.angle + rotationVector.angle) % 360, // Ensure the angle stays within 0 to 360 degrees
            radius: translationVector.radius
        };
    }

    //
    // Vector forces applied on the body
    //
    // Rotate the movement area around the body center by an angle
    applyBodyRotationVector(angle) {
        this.vectors.rotation.angle = angle;
        //this.vectors.translation.angle += angle;
    }

    // Change the center of the motion circle
    applyBodyTranslationVector(cartesianChange, vector) {
        this.vectors.translation.angle = vector.angle;
        this.vectors.translation.radius = vector.radius;
        this.vectors.translation.x = cartesianChange.x;
        this.vectors.translation.y = cartesianChange.y;
    }





    // New integrated version
    applyVectorForces() {
        // Apply the rotation
        let rotValue = Maths.rotate(this.center.x, this.center.y, 0, 0, this.vectors.rotation.angle);
        this.center.x = rotValue.x;
        this.center.y = rotValue.y;

        let currentCenter = this.getCenter();

        // Integrate the translation & rotation vectors
        let integratedVector = this.integrateVectors(this.vectors.translation, this.vectors.rotation);
        integratedVector = {
            ...integratedVector,
            ...Maths.pointCoord(0, 0, integratedVector.radius, integratedVector.angle)
        }
        this.integratedVector = integratedVector;


        this.foot.angle = integratedVector.angle;
        if (this.lift.lifted) {
            // Tip lifted
            this.lift.n++;
            this.lift.z = this.gaitSteps.y[this.lift.n] * this.options.maxZ;
            this.foot.radius = Maths.map(this.gaitSteps.x[this.lift.n], -1, 1, this.lift.min, this.lift.max);
            if (this.lift.n == this.body.options.gait.steps) {
                this.lift.lifted = false;
                this.lift.n = 0;
                this.lift.z = 0;
            }
            // Update x & y values
            this.setPositionByVector();
            //this.debug = '- LIFTED -';
        } else {
            // Tip on the floor
            // Ensure the leg stays in contact with the floor
            this.foot.x -= this.vectors.translation.x;
            this.foot.y -= this.vectors.translation.y;

            /*let nextCoords = {
                x: this.foot.x - this.vectors.translation.x,
                y: this.foot.y - this.vectors.translation.y,
            }*/

            // Tip getting out of the circle
            /*if (!Maths.isWithinCircle(this.foot.x, this.foot.y, currentCenter.x, currentCenter.y, this.options.radius)) {
                //this.liftLeg();
            }*/

        }
        let center = this.getCenter();
        this.foot.distanceFromCenter = Maths.distance(center.x, center.y, this.foot.ax, this.foot.ay);

        let actualPolarCoords = Maths.polarCoordinates(currentCenter.x, currentCenter.y, this.foot.ax, this.foot.ay);
        this.foot.isFront = Math.abs(actualPolarCoords.angle-integratedVector.angle) < Math.abs(actualPolarCoords.angle-this.cycle(integratedVector.angle-180, 0, 360))
        this.foot.radius = actualPolarCoords.radius/this.options.radius*100*(this.foot.isFront?-1:1);
    }


    //
    // Tick
    //
    tick() {
        // Apply the force vectors
        this.applyVectorForces();

        this.foot.prev_x = this.foot.ax*1;
        this.foot.prev_y = this.foot.ay*1;
        //this.foot.ax = (this.foot.x * this.options.decayRate) + (this.foot.prev_x * (1-this.options.decayRate));
        //this.foot.ay = (this.foot.y * this.options.decayRate) + (this.foot.prev_y * (1-this.options.decayRate));
        this.foot.ax = this.foot.x*1;
        this.foot.ay = this.foot.y*1;
        if (!this.lift.lifted && (this.foot.ax != this.foot.x || this.foot.ay != this.foot.y)) {
            this.lift.lifted = true;
        }
    }

    liftLeg() {
        this.lift.lifted = true;
        this.lift.n = 0;
        this.lift.z = this.gaitSteps.y[0] * this.options.maxZ;
    }

    downLeg() {
        this.lift.lifted = false;
        this.lift.n = 0;
        this.lift.z = 0;
    }

    setPositionByVector() {
        let center = this.getCenter();
        let footPosition = Maths.pointCoord(0, 0, this.foot.radius * this.options.radius / 100, this.foot.angle);
        this.foot.x = footPosition.x + center.x;
        this.foot.y = footPosition.y + center.y;
    }

    render() {
        //this.update();
        // Anchor
        this.canvas.circle(this.body.x + this.anchor.x, this.body.y + this.anchor.y, 5, '#000000');
        // Render the movement radius
        let center = this.getCenter();
        this.canvas.circle(this.body.x + center.x, this.body.y + center.y, this.options.radius, '#0288D1');
        // Movement Center
        this.canvas.circle(this.body.x + center.x, this.body.y + center.y, 1, '#ff0000');
        // Foot
        let footBorder = '#000000';
        let footFill = '#000000';
        if (this.lift.lifted) {
            footBorder = '#000000';
            footFill = 'rgba(0,0,0,0)';
        }
        this.canvas.circle(this.body.x + this.foot.ax, this.body.y + this.foot.ay, this.lift.lifted ? 2 + this.lift.z * 5 : 3, footBorder, footFill);
    }
}

if (isNode) {
    module.exports = AutoGait;
}