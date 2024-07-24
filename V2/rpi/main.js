import Robot from '../Robot.js'
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
        z: 5,
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
        onUpdate: function(legIndex, angles) {
            // Whenever an angle changes
            //console.log("onUpdate", {legIndex, ...angles})
            servos.move(getServoNum(legIndex, 0), angles.shoulder);
            servos.move(getServoNum(legIndex, 1), angles.upper);
            servos.move(getServoNum(legIndex, 2), angles.tip);
        }
    });

    const gait = new Gait(robot, {
        steps: 20,
        stepSize: 4,
        stepHeight: 5,
        turn: 0 // experimental
    });

    const gaitFPS = 30;
    const tick = setInterval(() => {
        gait.tick();
    }, 1000/gaitFPS);

};

main();


