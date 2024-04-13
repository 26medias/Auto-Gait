const AutoGait = require('./gait.js');
const IK = require('./IK.js');
const Maths = require('./maths.js');
const RobotControl = require('./webcontrol.js');

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
    constructor(options, params) {
        params = _.extend({}, params);
        this.params = params;
        this.options = _.extend({
            fps: params.fps || 10,
            render2D: true,
            render3D: true,
            robot: {
                body: {
                    type: 'custom',
                    radius: 7,     // Body Radius
                    legRadius: 7,   // Location of the leg anchors
                    height: 0.5,    // Body tickness
                    angle: 0,       // Body Y rotation
                    streamline: params.streamline || 18, // oval deformation in the vector direction
                    z: 4,           // Body height from ground
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
                    distance: params.distance || 12,   // Distance of the movement center
                    radius: params.radius || 4.2,      // Movement area radius
                    maxRadius: params.radius || 4.2,   // Max Movement area radius to be able to reach coordinates
                    maxZ: params.maxZ || 5,        // Max Y distance (Z in 2D coords, but Y in 3D)
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
                    steps: params.steps || 10,
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
        console.log(options);

    }

    async reset() {
        this.stop();
        delete this.gait;
        delete this.ik;
    }

    setupWebServer() {
        const scope = this;
        this.controls = new RobotControl({
            port: 8082,
            content: './webui',
            onData: function(data) {
                console.log(data);

                let i;

                switch (data.name) {
                    case "fps":
                        scope.setFPS(data.value);
                    break;
                    case "z":
                        scope.gait.body.z = data.value;
                    break;
                    case "roll":
                        scope.gait.body.roll = data.value;
                    break;
                    case "pitch":
                        scope.gait.body.pitch = data.value;
                    break;
                    case "yaw":
                        scope.gait.body.yaw = data.value;
                    break;
                    case "areaRadius":
                        for (i=0;i<scope.gait.body.legs.length;i++) {
                            scope.gait.body.legs[i].center = Maths.pointCoord(0, 0, data.value, scope.gait.body.legs[i].legAngle);
                        }
                    break;
                    case "areaDistance":
                        scope.gait.body.updateLegRadius(data.value);
                    break;
                    case "steps":
                        scope.options.gait.steps = data.value;
                    break;
                    case "streamline":
                        scope.gait.body.streamline = data.value;
                    break;
                    case "translationAngle":
                        scope.params.translationAngle = data.value;
                    break;
                    case "translationRadius":
                        scope.params.translationRadius = data.value;
                    break;
                }

                return {received: data}
            },
            config: scope.params
        })
        this.controls.start();
    }

    async init() {
        let scope = this;

        this.reset();
        this.setupWebServer();
        
        if (!this.params.disabled) {
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
                angle: scope.params.translationAngle || 0,
                distance: scope.params.translationRadius || 0,
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
        this.setFPS(this.options.fps);
    }

    setFPS(value) {
        let scope = this;
        clearInterval(this.itv);
        this.itv = setInterval(function() {
            scope.render();
        }, 1000/value)
    }

    stop() {
        this.started = false;
        clearInterval(this.itv);
    }

    // Real world angle to Sim Angle
    convertAngle(l, n, angle, fixed) {
        if (!fixed) {
            return angle;
        }
        if (n==1) {
            if (!this.gait.options.leg.mirror[l]) {
                angle = 180 - angle;
            }
        }
        if (n==2) {
            if (this.gait.options.leg.mirror[l]) {
                angle = 180 - angle;
            }
        }
        angle = Math.round(angle);
        angle = Math.min(180, Math.max(angle, 0));
        return angle;
    }

    writeAngles() {
        let angles = [];
        let angles2 = [];
        let i;
        for (i=0;i<this.gait.body.legs.length;i++) {
            
            let a0 = this.convertAngle(i, 0, Math.round(this.ik.legs[i].angles.shoulder), true);
            let a1 = this.convertAngle(i, 1, Math.round(this.ik.legs[i].angles.upper), true);
            let a2 = this.convertAngle(i, 2, Math.round(this.ik.legs[i].angles.tip), true);

            angles.push(a0);
            angles.push(a1);
            angles.push(a2);

            //angles2.push(Math.round(this.ik.legs[i].angles.shoulder));
            //angles2.push(Math.round(this.ik.legs[i].angles.upper));
            //angles2.push(Math.round(this.ik.legs[i].angles.tip));
        }

        /*if (this.servo && !this.params.disabled) {
            for (i=0;i<15;i++) {
                this.servo.move(i, angles[i]); // PCA
            }
            //this.servo2.moveServos(0x07, [angles[15], angles[16], angles[17], 0, 0, 0]);
        }*/
        if (!this.params.disabled) {
            this.servo.setAllAngles(angles);
        }
        //console.log(JSON.stringify(angles2));
        //console.log(JSON.stringify(angles));
        //console.log('')
    }

    writeAnglesPreset(angle, fixed) {
        let angles = [];
        let i;
        for (i=0;i<this.gait.body.legs.length;i++) {
            let a0 = this.convertAngle(i, 0, angle, fixed);
            let a1 = this.convertAngle(i, 1, angle, fixed);
            let a2 = this.convertAngle(i, 2, angle, fixed);
            
            angles.push(a0);
            angles.push(a1);
            angles.push(a2);
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
    args = _.extend({
        disabled: true,
        fps: 30,
        areaDistance: 12,
        areaRadius: 4.2,
        streamline: 18,
        steps: 10,
        translationAngle: 0,
        translationRadius: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        z: 4
    }, args);

    console.log("args", args)

    let bot = new CreepyBot({}, args);
    /*
        streamline
        distance
        radius
        maxZ
        steps
    */
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

