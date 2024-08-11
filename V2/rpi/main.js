import Robot from '../Robot.js'
import Gait from '../Gait.js'
import ServoController from './ServoController.js'
import { robot_configs } from '../robot_configs.js'

const getServoNum = (leg, n) => {
    return (leg*3) + n;
}

const getServoPort = (n) => {
    const mapping = [
        1, 3, 0,
        5, 7, 4,
        9, 11, 8,
        21, 23, 22,
        25, 27, 26,
        29, 31, 30
    ]
    return mapping[n]; // adjust to zero-index
}


const main = async () => {

    const servosA = new ServoController(0x40);
    await servosA.init();
    const servosB = new ServoController(0x60);
    await servosB.init();

    const moveServo = (leg, n, angle) => {
        const servoNum = getServoNum(leg, n);
        const servoPort = getServoPort(servoNum);
        if (servoPort <= 15) {
            servosA.move(servoPort, angle);
        } else {
            servosB.move(servoPort-16, angle);
        }
    }
    
    // Create the robot representation
	const robot = new Robot({
        ...robot_configs.hexapod_hybrid,
        z: 5,
        pitch: 0,
        roll: 0,
        yaw: 0,
        angleTweaks: [
            [10, -5, 5],
            [8, 0, -10],
            [5, -5, 20],
            [-13, -5, -15],
            [0, 0, 0],
            [0, 0, 0]
        ],
        fixAngles: function(angles) {
            return {
                shoulder: angles.shoulder,
                upper: 180-angles.upper,
                tip: 180-angles.tip
            }
        },
        onUpdate: function(legIndex, angles) {
            // Whenever an angle changes
            console.log("onUpdate", {legIndex, ...angles})
            moveServo(legIndex, 0, angles.shoulder);
            moveServo(legIndex, 1, angles.upper);
            moveServo(legIndex, 2, angles.tip);
        }
    });

    const gait = new Gait(robot, {
        angle: 0,
        steps: 7,
        stepSize: 5,
        stepHeight: 8,
        stepDamping: 0,
        turn: 0 // experimental
    });
    gait.tick(true);

    await robot.initLegs(2000);

    const gaitFPS = 2;
    const tick = setInterval(() => {
        gait.tick();
    }, 1000/gaitFPS);

};

main();


