import Robot from '../Robot.js'
import Gait from '../Gait.js'
import ServoController from './ServoController.js'
import { robot_configs } from '../robot_configs.js'


const getServoNum = (leg, n) => {
    return (leg*3) + n;
}


const main = async () => {

    const servos = new ServoController();
    await servos.init();
    
    // Create the robot representation
	const robot = new Robot({
        ...robot_configs.quadrupede,
        z: 5,
        pitch: 0,
        roll: 0,
        yaw: 0,
        /*angleTweaks: [
            [-15, -30, 0],
            [25, 30, 0],
            [-25, -30, 0],
            [10, 30, 0]
        ],*/
        /*angleTweaks: [
            [-15, -30, -10],
            [25, 30, 0],
            [-20, -30, 0],
            [20, 20, 5],
        ],*/
        angleTweaks: [
            [10, -5, 5],
            [8, 0, -10],
            [5, -5, 20],
            [-13, -5, -15],
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
            //console.log("onUpdate", {legIndex, ...angles})
            servos.move(getServoNum(legIndex, 0), angles.shoulder);
            servos.move(getServoNum(legIndex, 1), angles.upper);
            servos.move(getServoNum(legIndex, 2), angles.tip);
        }
    });

    const gait = new Gait(robot, {
        angle: 90,
        steps: 10,
        stepSize: 5,
        stepHeight: 8,
        stepDamping: 0,
        turn: 0 // experimental
    });

    const gaitFPS = 30;
    const tick = setInterval(() => {
        gait.tick();
    }, 1000/gaitFPS);

};

main();


