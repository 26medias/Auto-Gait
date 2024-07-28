import Render  from './Render.js'
import Robot from '../../../Robot.js'
import Gait from '../../../Gait.js'
import { robot_configs } from '../../../robot_configs.js'

const main = async () => {

    // Create the robot representation
	const robot = new Robot({
        ...robot_configs.quadrupede,
        z: 3,
        pitch: 0,
        roll: 0,
        yaw: 0,
        fixAngles: function(angles) {
            return {
                shoulder: angles.shoulder,
                upper: angles.upper,
                tip: angles.tip
            }
        },
        onUpdate: function(legIndex, angles) {
            // Whenever an angle changes
            //console.log("onUpdate", {legIndex, ...angles})
        }
    });

    const gait = new Gait(robot, {
        angle: 90,
        steps: 10,
        stepSize: 5,
        stepHeight: 5,
        stepDamping: 0,
        turn: 0, // experimental [0;40]
    });

    // Link the 3D Renderer
    const renderer = new Render(robot, gait, {fps: 60});
    renderer.init(function() {
        // on fps tick
    });

    const gaitFPS = 30;
    let tick;
    let gaitActive = false;
    const toggleGait = (active) => {
        gaitActive = false;
        clearInterval(tick);
        if (active) {
            tick = setInterval(() => {
                gait.tick();
            }, 1000/gaitFPS);
            gaitActive = true;
        }
    }
    toggleGait(true);
    

    $(document).keydown(function(event) {
        switch(event.which) {
            case 37: // left
                
                break;
            case 39: // right
                
                break;
            case 38: // up
            console.log("FIX ANGLE")
                robot.legs.forEach(leg => {
                    robot.setAngles(leg.index, {
                        shoulder: 90,
                        upper: 90,
                        tip: 90
                    });
                })
                break;
            case 40: // down
                break;
            case 32: // space
                //scope.started ? scope.stop() : scope.start();
                toggleGait(!gaitActive);
                break;
            default: 
                // Do nothing for other keys
                break;
        }
    });

    /*// Move the tip
    robot.legs[1].tip = robot.legs[1].ik.globalFromRelative({
        x: 5, y: 0, z: 0
    })
    // Apply the changes
	robot.setAngles(1, robot.legs[1].ik.getAngles());*/

    window.robot = robot;
};

main();

