import Render  from './Render.js'
import Robot from '../../../Robot.js'
import Gait from '../../../Gait.js'
import ControlUI from './ControlUI.js'

const main = async () => {
    const legAngles = [300, 60, 120, 240];

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
        onUpdate: function(legIndex, angles) {
            // Whenever an angle changes
            //console.log("onUpdate", {legIndex, ...angles})
        }
    });

    const gait = new Gait(robot, {
        steps: 20,
        stepSize: 3,
        stepHeight: 5,
        turn: 40 // experimental
    });

    // Link the 3D Renderer
    const renderer = new Render(robot, gait, {fps: 60});
    renderer.init(function() {
        // on fps tick
    });

    const gaitFPS = 30;
    const tick = setInterval(() => {
        gait.tick();
    }, 1000/gaitFPS);

    $(document).keydown(function(event) {
        switch(event.which) {
            case 37: // left
                
                break;
            case 39: // right
                
                break;
            case 38: // up
                break;
            case 40: // down
                break;
            case 32: // space
                scope.started ? scope.stop() : scope.start();
                break;
            default: 
                // Do nothing for other keys
                break;
        }
    });

    // Move the tip
    /*robot.legs[1].tip = robot.legs[1].ik.globalFromRelative({
        x: 5, y: 0, z: 0
    })
    // Apply the changes
	robot.setAngles(1, robot.legs[1].ik.getAngles());*/

    window.robot = robot;
};

main();

