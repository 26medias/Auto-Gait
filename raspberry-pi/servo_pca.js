const i2cBus = require("i2c-bus");
const { Pca9685Driver } = require("pca9685");


class ServoController {
    constructor(address = 0x40, frequency = 50) {
        this.options = {
            i2c: i2cBus.openSync(1),
            address: address,
            frequency: frequency,
            debug: false
        };
        this.pwm = null;
        this.lastValues = Array(16).fill(0); // Keep track of the last set values
    }

    init() {
        return new Promise((resolve, reject) => {
            this.pwm = new Pca9685Driver(this.options, (err) => {
                if (err) {
                    console.error("Error initializing PCA9685");
                    reject(err);
                } else {
                    console.log("Initialization done");
                    resolve();
                }
            });
        });
    }

    setAllAngles(angles) {
        if (!this.pwm) {
            console.error("PWM driver not initialized");
            return;
        }
        
        // Only update provided angles
        angles.forEach((angle, index) => {
            this.lastValues[index] = angle;
        });

        const buffer = Buffer.alloc(4 * 16); // 4 bytes per channel, 16 channels
        this.lastValues.forEach((angle, index) => {
            const onTime = 0;
            const offTime = this.calculatePulseLength(angle);
            buffer.writeUInt16LE(onTime, index * 4);
            buffer.writeUInt16LE(offTime, index * 4 + 2);
        });
        this.pwm.i2cWriteSync(this.options.address, 0x06, buffer.length, buffer);
    }

    calculatePulseLength(angle) {
        const minPulse = 500;
        const maxPulse = 2500;
        return Math.round(minPulse + (angle / 180) * (maxPulse - minPulse));
    }

    move(servo, angle) {
        if (!this.pwm) {
            console.error("PWM driver not initialized");
            return;
        }
        if (angle < 0 || angle > 180) {
            console.error("Angle must be between 0 and 180 degrees");
            return;
        }
        const pulseLength = this.calculatePulseLength(angle);
        this.pwm.setPulseLength(servo, pulseLength);
    }
}
