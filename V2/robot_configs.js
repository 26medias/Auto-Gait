const legSize = {
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
};


export const robot_configs = {
    hexapod: {
        mirrors: [false, true, false, true, false, true],
        legs: [{
            angle: 300,
            centerDistance: 8,
            y: -4.5,
            x: 3.7,
            size: legSize
        },{
            angle: 0,
            centerDistance: 6,
            y: 0,
            x: 3.7,
            size: legSize
        },{
            angle: 60,
            centerDistance: 8,
            y: 4.5,
            x: 3.7,
            size: legSize
        },{
            angle: 120,
            centerDistance: 8,
            y: 4.5,
            x: -3.7,
            size: legSize
        },{
            angle: 180,
            centerDistance: 6,
            y: 0,
            x: -3.7,
            size: legSize
        },{
            angle: 240,
            centerDistance: 8,
            y: -4.5,
            x: -3.7,
            size: legSize
        }],
        body: {
            radius: 6,
            height: 0.1
        },
        offsets: {
            x: 0,
            y: 0,
            angle: 0
        },
        angleTweaks: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ],
    },
    quadrupede: {
        mirrors: [false, true, false, true],
        legs: [{
            angle: 300,
            angleOffset: 30,
            centerDistance: 8,
            y: -4.5,
            x: 3.7,
            size: legSize
        },{
            angle: 60,
            angleOffset: -30,
            centerDistance: 8,
            y: 4.5,
            x: 3.7,
            size: legSize
        },{
            angle: 120,
            angleOffset: 30,
            centerDistance: 8,
            y: 4.5,
            x: -3.7,
            size: legSize
        },{
            angle: 240,
            angleOffset: -30,
            centerDistance: 8,
            y: -4.5,
            x: -3.7,
            size: legSize
        }],
        body: {
            radius: 6,
            height: 0.1
        },
        offsets: {
            x: 0,
            y: 0,
            angle: 0
        },
        angleTweaks: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
    },
    quadrupede_2: {
        mirrors: [false, true, false, true],
        legs: [{
            angle: 300,
            centerDistance: 8,
            y: -4.5,
            x: 3.7,
            size: legSize
        },{
            angle: 60,
            centerDistance: 8,
            y: 4.5,
            x: 3.7,
            size: legSize
        },{
            angle: 120,
            centerDistance: 8,
            y: 4.5,
            x: -3.7,
            size: legSize
        },{
            angle: 240,
            centerDistance: 8,
            y: -4.5,
            x: -3.7,
            size: legSize
        }],
        body: {
            radius: 6,
            height: 0.1
        },
        offsets: {
            x: 0,
            y: 0,
            angle: 0
        },
        angleTweaks: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
    }
}