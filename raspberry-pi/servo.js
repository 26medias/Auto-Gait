const i2cBus = require("i2c-bus");
const { Pca9685Driver } = require("pca9685");

class ServoController {
    constructor(address = 0x40, frequency = 50) {
        try  {
            this.options = {
                i2c: i2cBus.openSync(1),
                address: address,
                frequency: frequency,
                debug: false
            };
        } catch (e) {
            
        }
        
        this.pwm = null;
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

    move(servo, angle) {
        if (!this.pwm) {
            console.error("PWM driver not initialized");
            return;
        }
        if (angle<0 || angle>180) {
            return;
        }
        this.pwm.setPulseLength(servo, 1500+Math.ceil((angle-90)/180*1499));
    }
}

module.exports = ServoController;