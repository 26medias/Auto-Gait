import Robot from '../Robot.js'
import ServoController from './ServoController.js'

const processArgs = () => {
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

const getServoNum = (leg, n) => {
    return (leg*3) + n;
}

const main = async () => {
    const legAngles = [300, 60, 120, 240];

    const servos = new ServoController();
    await servos.init();

    // Create the robot representation
	const robot = new Robot({
        z: 3,
        pitch: 0,
        roll: 0,
        yaw: 0,
        anchorRadius: 6,
        centerRadius: 12,
        angles: legAngles,
        mirrors: [false, true, false, true],
        sizes: {
            upper: {
                length: 5.5,
                offset: [-0.6, 1.2, 0],
                width: 0.5,
                height: 0.5
            },
            tip: {
                length: 7,
                offset: [0.5, 0, 0],
                width: 0.5,
                height: 0.5
            }
        },
        body: {
            radius: 6,
            height: 0.1
        },
        offsets: {
            x: -2.7,
            y: 1,
            angle: 0
        },
        onUpdate: function(legIndex, angles) {
            // Whenever an angle changes
            console.log("onUpdate", {legIndex, ...angles})
            servos.move(getServoNum(legIndex, 0), angles.shoulder);
            servos.move(getServoNum(legIndex, 1), angles.upper);
            servos.move(getServoNum(legIndex, 2), angles.tip);
        }
    });


    // Move the tip
    /*robot.legs[1].tip = robot.legs[1].ik.globalFromRelative({
        x: 0, y: -7, z: 0
    })
    // Apply the changes
	robot.setAngles(1, robot.legs[1].ik.getAngles());*/
};

main();

