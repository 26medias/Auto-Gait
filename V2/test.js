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

    async start() {
        await this.Servo.init();

        var args	= this.processArgs();
        const angles = this.Leg.getAngles(args.x||13, args.y||-8, args.z||-5);

        this.Servo.move(0, angles[0]);
        this.Servo.move(1, angles[1]);
        this.Servo.move(2, angles[2]);

        console.log(angles);

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

const Leg = new LegTester();
Leg.start();