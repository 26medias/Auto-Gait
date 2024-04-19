var isNode = false;

if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // Node.js environment detected
    isNode = true;
}

class EasingVariable {
    constructor(name, valueMin, valueMax, durationMin, durationMax, probability) {
        this.name = name;
        this.valueMin = valueMin;
        this.valueMax = valueMax;
        this.durationMin = durationMin;
        this.durationMax = durationMax;
        this.probability = probability;
        this.currentValue = (valueMin + valueMax) / 2; // start at midpoint for simplicity
        this.targetValue = this.currentValue;
        this.duration = 0;
        this.elapsed = 0;
    }

    get() {
        return this.currentValue;
    }

    updateTarget() {
        if (this.elapsed < this.duration) {
            return; // still easing to a previous target
        }
        this.targetValue = this.valueMin + Math.random() * (this.valueMax - this.valueMin);
        this.duration = this.durationMin + Math.random() * (this.durationMax - this.durationMin);
        this.elapsed = 0;
    }

    tick() {
        if (this.elapsed < this.duration) {
            this.elapsed++;
            let t = this.elapsed / this.duration;
            let t2 = (t < 0.5) ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            this.currentValue = this.currentValue + (this.targetValue - this.currentValue) * t2;
        } else {
            this.currentValue = this.targetValue; // ensure it precisely reaches the target
        }
    }
}

class RobotVariables {
    constructor(variablesConfig) {
        this.variables = variablesConfig.map(config => new EasingVariable(
            config.name, config.valueMin, config.valueMax, config.durationMin, config.durationMax, config.probability
        ));
    }

    tick() {
        const updates = {};
        this.variables.forEach(variable => {
            if (Math.random() * 100 < variable.probability) {
                variable.updateTarget();
            }
            variable.tick();
            updates[variable.name] = variable.get();
        });
        return updates;
    }
}


/*
// Example configuration
const variablesConfig = [
    { name: 'speed', valueMin: 0, valueMax: 100, durationMin: 10, durationMax: 300, probability: 30 },
    { name: 'direction', valueMin: -180, valueMax: 180, durationMin: 50, durationMax: 250, probability: 20 }
];

const robot = new RobotVariables(variablesConfig);

// Simulate ticking
setInterval(() => {
    console.log(robot.tick());
}, 100); // Adjust interval as needed
*/


if (isNode) {
    module.exports = RobotVariables;
}