const i2c = require('i2c-bus');

function setAngle(a) {
    const i2cAddress = 0x07; // Replace this with your I2C address
    const busNumber = 1; // Typically 1 on Raspberry Pi but could be different based on your setup
    const dataBuffer = Buffer.from([a, a, a, a, a, a]); // Replace 'a' with the actual byte value you want to send

    const i2cBus = i2c.openSync(busNumber);

    try {
        i2cBus.i2cWriteSync(i2cAddress, dataBuffer.length, dataBuffer);
    } catch (error) {
        console.error('Failed to write to I2C device:', error);
    } finally {
        i2cBus.closeSync();
    }
}

setAngle(75);