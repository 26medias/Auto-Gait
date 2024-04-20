var isNode = false;

if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // Node.js environment detected
    isNode = true;
}


class Servo {
    constructor(minAngle, maxAngle) {
        this.minAngle = minAngle;
        this.maxAngle = maxAngle;
        this.angle = minAngle; // Initialize servo at min angle
    }

    setByPercent(percent) {
        percent = Math.max(0, Math.min(100, percent)); // Clamp percent to [0, 100]
        this.angle = this.minAngle + (percent / 100) * (this.maxAngle - this.minAngle);
    }

    setByAngle(angle) {
        this.angle = Math.max(this.minAngle, Math.min(this.maxAngle, angle)); // Clamp angle between minAngle and maxAngle
    }

    getAngle() {
        return this.angle;
    }
}

class Head {
    constructor(neckHorizontal, neckVertical, mouthVertical, eyelidsVertical) {
        this.neckVertical = new Servo(neckVertical.min, neckVertical.max);
        this.neckHorizontal = new Servo(neckHorizontal.min, neckHorizontal.max);
        this.mouthVertical = new Servo(mouthVertical.min, mouthVertical.max);
        this.eyelidsVertical = new Servo(eyelidsVertical.min, eyelidsVertical.max);
    }

    setNeckVerticalPercent(percent) {
        this.neckVertical.setByPercent(percent);
    }

    setNeckHorizontalPercent(percent) {
        this.neckHorizontal.setByPercent(percent);
    }

    setMouthVerticalPercent(percent) {
        this.mouthVertical.setByPercent(percent);
    }

    setEyelidsVerticalPercent(percent) {
        this.eyelidsVertical.setByPercent(percent);
    }

    setNeckVerticalAngle(angle) {
        this.neckVertical.setByAngle(angle);
    }

    setNeckHorizontalAngle(angle) {
        this.neckHorizontal.setByAngle(angle);
    }

    setMouthVerticalAngle(angle) {
        this.mouthVertical.setByAngle(angle);
    }

    setEyelidsVerticalAngle(angle) {
        this.eyelidsVertical.setByAngle(angle);
    }

    getCurrentAngles() {
        return {
            neckVertical: this.neckVertical.getAngle(),
            neckHorizontal: this.neckHorizontal.getAngle(),
            mouthVertical: this.mouthVertical.getAngle(),
            eyelidsVertical: this.eyelidsVertical.getAngle()
        };
    }
}

/*
// Example Usage:
const head = new Head(
    {min: 0, max: 180},  // neck vertical
    {min: -90, max: 90}, // neck horizontal
    {min: 10, max: 80},  // mouth vertical
    {min: 0, max: 50}    // eyelids vertical
);

head.setNeckVerticalPercent(50);
head.setNeckHorizontalAngle(45);
head.setMouthVerticalPercent(75);
head.setEyelidsVerticalAngle(25);

console.log(head.getCurrentAngles());
*/

if (isNode) {
    module.exports = Head;
}