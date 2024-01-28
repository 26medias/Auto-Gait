const AutoGait = require('./gait.js');
const IK = require('./IK.js');
const Maths = require('./maths.js');
const ServoController = require('./servo.js');
const _ = require('underscore');


const ServoData = {
    servo: {
        w: 1.2,
        h: 2.2,
        l: 2.2,
        ch: 0.6,
        pd: 0.46,
        ph: 0.4,
    }
};


class CreepyBot {
    constructor(options) {
        this.options = _.extend({
            fps: 5,
            render2D: false,
            render3D: false,
            robot: {
                body: {
                    type: 'radial',
                    radius: 10,     // Body Radius
                    legRadius: 9,   // Location of the leg anchors
                    height: 0.5,    // Body tickness
                    angle: 0,       // Body Y rotation
                    streamline: 0, // oval deformation in the vector direction
                    z: 4,           // Body height from ground
                    builder: function(body, Leg) {
                        for (let i=0;i<body.options.leg.count;i++) {
                            let legAngle = (360/body.options.leg.count)*i + body.angle;
                            let legAnchor = Maths.pointCoord(0, 0, body.options.body.legRadius, legAngle);
                            let legPosition = Maths.pointCoord(0, 0, body.options.leg.distance, legAngle);
                            let leg = new Leg(body, legAnchor, legPosition, body.options.leg, body.canvas);
                            leg.legAngle = legAngle;
                            leg.lift.lifted = i % 2 == 0;
                            body.legs.push(leg);
                        }
                    }
                },
                leg: {
                    count: 6,       // Number of legs
                    decayRate: 1,   // Smoothing decay rate [0;1]
                    distance: 17.5,   // Distance of the movement center
                    radius: 5,      // Movement area radius
                    maxRadius: 5,   // Max Movement area radius to be able to reach coordinates
                    maxZ: 3,        // Max Y distance (Z in 2D coords, but Y in 3D)
                    upper: {
                        offset: [-ServoData.servo.w/2, ServoData.servo.ch+ServoData.servo.w/2, 0],
                        length: 9,
                        width: 0.5,
                        height: 0.5
                    },
                    tip: {
                        offset: [ServoData.servo.l/2 - ServoData.servo.w/2, 0, 0],
                        length: 8,
                        width: 0.5,
                        height: 0.5
                    }
                },
                gait: {
                    steps: 10,
                    maxSpeed: 1,
                    logic: function(body, legs) {
                        let minLegs = legs.length-1;
                        let liftedCount = _.filter(legs, function(item) {
                            return item.lift.lifted;
                        }).length;
                        let liftAllowedCount = Math.max(0, legs.length - minLegs - liftedCount);

                        if (liftAllowedCount > 0) {
                            let allowedToLift = function(i) {
                                return !legs[body.cycle(i-1, 0, legs.length)].lift.lifted && !legs[body.cycle(i+1, 0, legs.length)].lift.lifted;
                            }
                            let priorities = legs.map(function(l, n) {
                                return [n, l.priority]
                            }).filter(function(l) {
                                return l[1] || l[1]===0;
                            }).sort(function(a, b) {
                                return a[1] - b[1];
                            })
                            
                            if (priorities.length > 0) {
                                for (let i=0;i<=priorities.length;i++) {
                                    //console.log("Lift:", priorities[i][0], JSON.stringify(priorities))
                                    legs[priorities[i][0]].liftLeg();
                                    liftAllowedCount -= 1;
                                    if (liftAllowedCount <=0) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }, options);
    }

    async reset() {
        this.stop();
        delete this.gait;
        delete this.ik;
    }

    async init() {
        let scope = this;

        this.reset();

        this.servo = new ServoController();
        await this.servo.init();

        // Gait
        this.gait = new AutoGait('#canvas', {
            render: false,
            width: 400,
            height: 300,
            ...this.options.robot
        }, function(gait) {
            // on tick
            scope.gait.body.applyTranslationVector({
                angle: 0,
                distance: 50,
            });
            scope.gait.body.applyRotationVector({
                angle: 0,
            });
        });

        this.ik = new IK(this.gait);

        this.start();
    }

    start() {
        let scope = this;
        this.started = true;
        this.itv = setInterval(function() {
            scope.render();
        }, 1000/this.options.fps)
    }
    stop() {
        this.started = false;
        clearInterval(this.itv);
    }


    // Real world angle to Sim Angle
    convertAngle(l, n, angle) {
        let out;
        if (n==0) {
            out = -this.gait.body.legs[l].legAngle - 90 + angle;
        }
        if (n==1) {
            out = angle;
        }
        if (n==2) {
            out = -angle;
        }
        return Math.round(out);
    }

    // Sim angle to Real world angle
    getOriginalAngle(l, n, correctedAngle) {
        let out;
        if (n === 0) {
            let x = correctedAngle + this.gait.body.legs[l].legAngle;
            if (x > 180) {
                x = x - 360;
            }
            out = x + 90;
        }
        if (n === 1) {
            out = correctedAngle;
        }
        if (n === 2) {
            out = correctedAngle;
        }
        return Math.round(out);
    }


    writeAngles() {
        let angles = [];
        let i;
        for (i=0;i<this.gait.body.legs.length;i++) {
            angles.push(this.getOriginalAngle(i, 0, this.ik.legs[i].angles.shoulder));
            angles.push(this.getOriginalAngle(i, 1, this.ik.legs[i].angles.upper));
            angles.push(this.getOriginalAngle(i, 2, this.ik.legs[i].angles.tip));
        }
        //console.log(angles);
        //@TODO: Send
        for (i=0;i<16;i++) {
            this.servo.move(i, angles[i]);
        }
    }
    
    render() {
        this.gait.tick();
        this.ik.update();
        this.writeAngles();
    }
}


setTimeout(function() {
    let bot = new CreepyBot({});
    bot.init();
}, 500)

