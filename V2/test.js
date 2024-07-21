const QuadrupedeLeg = require('./QuadrupedeLeg');
const ServoController = require('./ServoController');

class LegTester {
    constructor() {
        const LegMetas = {
            angle: 300,
            anchor:{x:3.5, y:-6.06, z:0},
            upper: {
                length: 5.5,
                offset: [-0.6, 1.2, 0],
            },
            tip: {
                length: 7,
                offset: [0.5, 0, 0],
            }
        }
        this.Leg = new QuadrupedeLeg(LegMetas);
        this.Servo = new ServoController();
    }

    async init() {
        await this.Servo.init();
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
    }

    fixAngle(angle) {
        angle = Math.round(angle);
        angle = Math.min(180, Math.max(angle, 0));
        return angle;
    }

    move(options) {

        const angles = this.Leg.getAngles(options.x||13, options.y||-8, options.z||-5);

        this.Servo.move(0, this.fixAngle(angles.shoulder));
        this.Servo.move(1, this.fixAngle(angles.upper));
        this.Servo.move(2, this.fixAngle(angles.tip));

        return angles;
    }

    processArgs() {
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
}

(async() => {
    const Leg = new LegTester();
    var args	= Leg.processArgs();
    console.log(args)
    await Leg.init();
    setInterval(() => {
        Leg.move(args);
    }, 500)
    
})()
