import Robot from '../Robot.js'
import Gait from '../Gait.js'
import ServoController from './ServoController.js'


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
            //console.log("onUpdate", {legIndex, ...angles})
            servos.move(getServoNum(legIndex, 0), angles.shoulder);
            servos.move(getServoNum(legIndex, 1), 180-angles.upper);
            servos.move(getServoNum(legIndex, 2), 180-angles.tip);
        }
    });

    const gait = new Gait(robot, {
        angle: 90,
        steps: 8,
        stepSize: 3.5,
        stepHeight: 5,
        stepDamping: 0,
        turn: 0 // experimental
    });

    const gaitFPS = 30;
    const tick = setInterval(() => {
        gait.tick();
    }, 1000/gaitFPS);

};

main();


