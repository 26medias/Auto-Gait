import Render  from './Render.js'
import Robot from '../../../Robot.js'

const main = async () => {
    const legAngles = [300, 60, 120, 240];

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
            height: 1
        },
        onUpdate: function(legIndex, angles) {
            // Whenever an angle changes
            console.log("onUpdate", {legIndex, ...angles})
        }
    });

    // Link the 3D Renderer
    const renderer = new Render(robot, {fps: 60});
    renderer.init(function() {
        // on fps tick
    });

    // Move the tip
    robot.legs[1].tip = robot.legs[1].ik.globalFromRelative({
        x: 0, y: -7, z: 0
    })
    // Apply the changes
	robot.setAngles(1, robot.legs[1].ik.getAngles());

    window.robot = robot;
};

main();

