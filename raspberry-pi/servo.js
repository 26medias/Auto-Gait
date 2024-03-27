const i2cBus = require("i2c-bus");

class ServoController {
    constructor() {
        
    }

    init() {
        this.i2cBus = i2cBus.openSync(1); // Assuming I2C bus 1 for Raspberry Pi
    }

    // Function to send servo angles to a single Arduino-based controller
    moveServos(address, angles) {
        if (angles.length !== 6) {
            console.error("Angles array must have 6 elements.");
            return;
        }
        const limitedAngles = angles.map(angle => Math.max(0, Math.min(180, angle)));

        const buffer = Buffer.from(limitedAngles);
        try {
            this.i2cBus.writeI2cBlockSync(address, 0x00, buffer.length, buffer);
        } catch (e) {
            console.error("[I2C] ", e.message)
        }
    }

    // Function to control any of the 18 servos across the three controllers
    move(servo, angle) {
        if (angle < 0 || angle > 180) {
            console.error("Angle must be between 0 and 180.");
            return;
        }

        const controllerAddresses = [0x07, 0x08, 0x09]; // I2C addresses of the Arduino controllers
        const controllerIndex = Math.floor(servo / 6);
        const servoIndex = servo % 6;
        const angles = new Array(6).fill(90); // Default angle is 90, can be adjusted as needed
        angles[servoIndex] = angle;

        if (controllerIndex >= 0 && controllerIndex < controllerAddresses.length) {
            this.moveServos(controllerAddresses[controllerIndex], angles);
        } else {
            console.error("Invalid servo index.");
        }
    }
}
/*
const servo = new ServoController();
servo.init();
const a = 75;
servo.moveServos(0x07, [a, a, a, a, a, a])
*/
module.exports = ServoController;
