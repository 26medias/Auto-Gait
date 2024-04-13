const i2cBus = require("i2c-bus");
const { Pca9685Driver } = require("pca9685");

class ServoController {
    constructor(address = 0x40, frequency = 50) {
        this.options = {
            i2c: i2cBus.open(1), // This now returns a Promise
            address: address,
            frequency: frequency,
            debug: false
        };
        this.pwm = null;
    }

    async init() {
        try {
            const bus = await this.options.i2c;
            this.pwm = new Pca9685Driver({ ...this.options, i2c: bus }, (err) => {
                if (err) {
                    console.error("Error initializing PCA9685");
                    throw err;
                }
                console.log("Initialization done");
            });
        } catch (e) {
            console.error("Failed to open I2C bus", e);
        }
    }

    async move(servo, angle) {
        if (!this.pwm) {
            console.error("PWM driver not initialized");
            return;
        }
        angle = Math.max(0, Math.min(angle, 180));  // Constrain angle to 0-180
        await this.pwm.setPulseLength(servo, 1500 + Math.ceil((angle - 90) / 180 * 1499));
    }
}

module.exports = ServoController;
