const AutoGait = require('./gait.js');
const IK = require('./IK.js');
const Maths = require('./maths.js');

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
            fps: 30,
            render2D: true,
            render3D: true,
            robot: {
                body: {
                    type: 'custom',
                    radius: 7,     // Body Radius
                    legRadius: 7,   // Location of the leg anchors
                    height: 0.5,    // Body tickness
                    angle: 0,       // Body Y rotation
                    streamline: 0, // oval deformation in the vector direction
                    z: 5,           // Body height from ground
                    builder: function(body, Leg) {
                        let legConfigs = [{
                            anchorAngle: 330
                        },{
                            anchorAngle: 30
                        },{
                            anchorAngle: 150
                        },{
                            anchorAngle: 210
                        }]
                        for (let i=0;i<body.options.leg.count;i++) {
                            let legConfig = legConfigs[i];
                            let legAngle = legConfig.anchorAngle;
                            let legAnchor = Maths.pointCoord(0, 0, body.options.body.legRadius, legAngle);
                            let legPosition = Maths.pointCoord(0, 0, body.options.leg.distance, legAngle);
                            let leg = new Leg(body, legAnchor, legPosition, body.options.leg, body.canvas);
                            leg.n = i;
                            leg.legAngle = legAngle;
                            leg.lift.lifted = i % 2 == 0; // Default initial state for the legs
                            body.legs.push(leg);
                        }
                    }
                },
                leg: {
                    count: 4,       // Number of legs
                    decayRate: 1,   // Smoothing decay rate [0;1]
                    distance: 15,   // Distance of the movement center
                    radius: 3,      // Movement area radius
                    maxRadius: 3,   // Max Movement area radius to be able to reach coordinates
                    maxZ: 3,        // Max Y distance (Z in 2D coords, but Y in 3D)
                    mirror: [false, true, false, true],
                    upper: {
                        offset: [-ServoData.servo.w/2, ServoData.servo.ch+ServoData.servo.w/2, 0],
                        length: 5.5,
                        width: 0.5,
                        height: 0.5
                    },
                    tip: {
                        offset: [ServoData.servo.l/2 - ServoData.servo.w/2, 0, 0],
                        length: 7,
                        width: 0.5,
                        height: 0.5
                    }
                },
                gait: {
                    steps: 7,
                    maxTurnAngle: 0.2,
                    maxSpeed: 1, 
                    logic: function(body, legs) {
                        let minLegs = legs.length-1;
                        let liftedCount = _.filter(legs, function(item) {
                            return item.lift.lifted;
                        }).length;
                        let liftAllowedCount = Math.max(0, legs.length - minLegs - liftedCount);

                        if (liftAllowedCount > 0) {
                            /*let allowedToLift = function(i) {
                                return !legs[body.cycle(i-1, 0, legs.length)].lift.lifted && !legs[body.cycle(i+1, 0, legs.length)].lift.lifted;
                            }*/
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
                                    //console.log("distanceFromCenter", legs[priorities[i][0]].foot.distanceFromCenter)
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
        
        try {
            const ServoController = require('./servo_pca.js');
            this.servo = new ServoController();
            this.servo.init();
            const ServoController2 = require('./servo.js');
            this.servo2 = new ServoController2();
            this.servo2.init();
        } catch (e) {
            console.log("pca9685/I2C not found")
        }

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
        if (n==0) {
            angle = -this.gait.body.legs[l].legAngle - 90 + angle;
            angle = Math.min(180, Math.max(angle, 0));
            /*if (this.gait.body.legs[l].mirrored.shoulder) {
                angle = 180 - angle;
            }*/
        }
        if (n==1) {
            angle = angle;
            angle = Math.min(180, Math.max(angle, 0));
            /*if (this.gait.options.leg.mirror[l]) {
                angle = 180 - angle;
            }*/
        }
        if (n==2) {
            angle = -angle;
            angle = Math.min(180, Math.max(angle, 0));
            /*if (this.gait.options.leg.mirror[l]) {
                angle = 180 - angle;
            }*/
        }
        return Math.round(angle);
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
            if (!this.gait.options.leg.mirror[l]) {
                out = 180 - out;
            } else {
                out = correctedAngle;
            }
        }
        if (n === 2) {
            if (this.gait.options.leg.mirror[l]) {
                out = correctedAngle;
            } else {
                out = 180-correctedAngle;
            }
        }
        return Math.abs(Math.round(out));
    }


    writeAngles() {
        let angles = [];
        let i;
        for (i=0;i<this.gait.body.legs.length;i++) {
            angles.push(this.getOriginalAngle(i, 0, this.ik.legs[i].angles.shoulder));
            angles.push(this.getOriginalAngle(i, 1, this.ik.legs[i].angles.upper));
            angles.push(this.getOriginalAngle(i, 2, this.ik.legs[i].angles.tip));
        }

        if (this.servo) {
            for (i=0;i<15;i++) {
                this.servo.move(i, angles[i]); // PCA
            }
            //this.servo2.moveServos(0x07, [angles[15], angles[16], angles[17], 0, 0, 0]);
        }
        //console.log(JSON.stringify(angles));
    }

    writeAnglesPreset(angle) {
        let angles = [];
        let i;
        for (i=0;i<this.gait.body.legs.length;i++) {
            angles.push(angle);
            angles.push(angle);
            angles.push(angle);
        }

        if (this.servo) {
            for (i=0;i<15;i++) {
                this.servo.move(i, angles[i]); // PCA
            }
            //console.log(JSON.stringify([angles[15], angles[16], angles[17], 0, 0, 0]));
            //this.servo2.moveServos(0x07, [angles[15], angles[16], angles[17], 0, 0, 0]);
        }
        console.log(JSON.stringify(angles));
    }
    
    render() {
        this.gait.tick();
        this.ik.update();
        this.writeAngles();
    }

    async testServos() {
        const ServoController = require('./servo.js');
        this.servo = new ServoController();
        this.servo.init();
        const a = 90;
        this.servo.moveServos(0x07, [a, a, a, a, a, a])
    }
}


var processArgs = function() {
	var i;
	var args 	= process.argv.slice(2);
	var output 	= {};
	for (i=0;i<args.length;i++) {
		var l1	= args[i].substr(0,1);
		if (l1 == "-") {
			if (args[i+1] == "true") {
				args[i+1] = true;
			}
			if (args[i+1] == "false") {
				args[i+1] = false;
			}
			if (!isNaN(args[i+1]*1)) {
				args[i+1] = args[i+1]*1;
			}
			output[args[i].substr(1)] = args[i+1];
			i++;
		}
	}
	return output;
}



setTimeout(async () => {
    var args	= processArgs();

    console.log("args", args)

    let bot = new CreepyBot({});
    bot.init();
    
    switch (args.op) {
        case "start":
            bot.start();
        break;
        case "test":
            for (i=0;i<500;i++) {
                bot.writeAnglesPreset(args.angle);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        break;
    }
    
    //bot.testServos();

    //
}, 500)

