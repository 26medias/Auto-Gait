import Robot from '../Robot.js'
import Gait from '../Gait.js'
import ServoController from './ServoController.js'
import { robot_configs } from '../robot_configs.js'

import readline from 'readline';

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

    const movePort = (port, angle) => {
        if (port <= 15) {
            servosA.move(port, angle);
        } else {
            servosB.move(port-16, angle);
        }
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    let port = 0;
    let angle = 0;
    process.stdin.on('keypress', (str, key) => {
        if (key.name === 'up') {
            angle++;
            angle = Math.min(angle, 180);
            console.log(`Angle ${angle}`)
            movePort(port, angle);
            // Handle up key
        } else if (key.name === 'down') {
            angle--;
            angle = Math.max(angle, 0);
            console.log(`Angle ${angle}`)
            movePort(port, angle);
            // Handle down key
        } else if (key.name === 'left') {
            port--;
            if (port<0) port = 31;
            angle = 90;
            console.log(`Port ${port}`)
            movePort(port, angle);
            // Handle left key
        } else if (key.name === 'right') {
            port++;
            if (port>31) port = 0;
            angle = 90;
            console.log(`Port ${port}`)
            movePort(port, angle);
            // Handle right key
        } else if (key.ctrl && key.name === 'c') {
            console.log('Exiting');
            process.exit();
        }
    });

};

main();


