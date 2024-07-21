import Render  from './Render.js'
import Robot from '../../../Robot.js'

const main = async () => {
    const legAngles = [300, 60, 120, 240];

	const robot = new Robot({
        z: 5,
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
            console.log("onUpdate", {legIndex, angles})
        }
    });

    const renderer = new Render(robot, {});
    renderer.init(function() {
        // on tick
    });

	robot.setAngles(0, {
		shoulder: 125,
		upper: 75,
		tip: 0
	})
};

main();

