export default class ControlUI {
    constructor(root) {
        this.root = root;
        this.data = [{
            name: 'Robot',
            content: [{
                id: 'legCount',
                label: 'Leg Count',
                type:  'slider',
                range: [4,32, root.options.robot.leg.count, 2],
                onChange: function(value) {
                    root.options.robot.leg.count = value;
                    root.init();
                }
            },
            {
                id: 'bodyRadius',
                label: 'Body Radius',
                type:  'slider',
                range: [0,30, root.options.robot.body.radius, 0.1],
                onChange: function(value) {
                    root.options.robot.body.radius = value;
                    root.init();
                }
            },
            {
                id: 'legRadius',
                label: 'Leg Radius',
                type:  'slider',
                range: [0,30, root.options.robot.body.legRadius, 0.1],
                onChange: function(value) {
                    root.options.robot.body.legRadius = value;
                    root.init();
                }
            },
            {
                id: 'upperLength',
                label: 'Limb Length',
                type:  'slider',
                range: [2,20, root.options.robot.leg.upper.length, 0.1],
                onChange: function(value) {
                    root.options.robot.leg.upper.length = value;
                    root.init();
                }
            },
            {
                id: 'tipLength',
                label: 'Tip Length',
                type:  'slider',
                range: [2,20, root.options.robot.leg.tip.length, 0.1],
                onChange: function(value) {
                    root.options.robot.leg.tip.length = value;
                    root.init();
                }
            }]
        },
        {
            name: 'Gait',
            content: [{
                id: 'gaitSteps',
                label: 'Steps',
                type:  'slider',
                range: [0,30, root.options.robot.gait.steps],
                onChange: function(value) {
                    root.options.robot.gait.steps = value;
                    root.init();
                }
            }, {
                id: 'areaDistance',
                label: 'Area Distance',
                type:  'slider',
                range: [0,30, root.options.robot.leg.distance, 0.1],
                onChange: function(value) {
                    root.options.robot.leg.distance = value;
                    root.init();
                    
                }
            },{
                id: 'areaRadius',
                label: 'Area Radius',
                type:  'slider',
                range: [0,30, root.options.robot.leg.radius, 0.1],
                onChange: function(value) {
                    root.options.robot.leg.radius = value;
                    root.init();
                    
                }
            },{
                id: 'streamline',
                label: 'Streamline',
                type:  'slider',
                liveChange: true,
                range: [0,100, root.gait.body.streamline],
                onChange: function(value) {
                    root.gait.body.streamline = value;
                    root.options.robot.body.streamline = value;
                    //root.init();
                }
            },{
                id: 'gaitOffsetX',
                label: 'gaitOffsetX',
                type:  'slider',
                liveChange: true,
                range: [-5,5, root.options.robot.leg.gaitOffsetX, 0.1],
                onChange: function(value) {
                    root.options.robot.leg.gaitOffsetX = value;
                }
            },{
                id: 'gaitOffsetY',
                label: 'gaitOffsetY',
                type:  'slider',
                liveChange: true,
                range: [-5,5, root.options.robot.leg.gaitOffsetY, 0.1],
                onChange: function(value) {
                    root.options.robot.leg.gaitOffsetY = value;
                }
            }]
        },
        {
            name: 'Speed',
            content: [{
                id: 'maxSpeed',
                label: 'Max Speed',
                type:  'slider',
                range: [0,2, root.gait.options.gait.maxSpeed, 0.02],
                liveChange: true,
                onChange: function(value) {
                    root.gait.options.gait.maxSpeed = value;
                    root.options.robot.gait.maxSpeed = value;
                    root.gait.control.updateDisplay();
                }
            }]
        },
        {
            name: 'Translation Vector',
            content: [{
                id: 'translationAngle',
                label: 'Angle',
                type:  'slider',
                range: [-180,180, root.gait.control.vector.angle],
                liveChange: true,
                onChange: function(value) {
                    root.gait.control.vector.angle = value;
                    root.gait.control.updateDisplay();
                }
            },
            {
                id: 'translationRadius',
                label: 'Radius',
                type:  'slider',
                range: [0,99, root.gait.control.vector.percent],
                liveChange: true,
                onChange: function(value) {
                    //root.gait.control.vector.percent = value;
                    //root.gait.control.updateDisplay();
                    root.setVar({name: 'translationRadius', value});
                }
            }]
        },
        {
            name: 'Body Angles',
            content: [{
                id: 'turn',
                label: 'Yaw',
                type:  'slider',
                range: [-35,35, root.gait.control.vector.turnVector, 1],
                liveChange: true,
                onChange: function(value) {
                    root.gait.control.vector.turnVector = value;
                    //root.gait.control.vector.rotationAngle = value;
                    root.gait.control.vector.angle = value;
                    root.gait.body.angle = value;
                    root.gait.control.updateDisplay();
                }
            }, {
                id: 'pitch',
                label: 'Pitch',
                type:  'slider',
                range: [-45,45, root.gait.body.pitch, 1],
                liveChange: true,
                onChange: function(value) {
                    root.gait.body.pitch = value;
                    //root.gait.control.updateDisplay();
                }
            }, {
                id: 'roll',
                label: 'Roll',
                type:  'slider',
                range: [-45,45, root.gait.body.roll, 1],
                liveChange: true,
                onChange: function(value) {
                    root.gait.body.roll = value;
                    //root.gait.control.updateDisplay();
                }
            }, {
                id: 'bodyHeight',
                label: 'Ground Distance',
                type:  'slider',
                range: [1,60, root.gait.body.z, 0.1],
                liveChange: true,
                onChange: function(value) {
                    //root.options.robot.body.z = value;
                    //root.gait.body.z = value;
                    root.setVar({name: 'z', value});
                }
            }]
        }]
        this.container = $("#control")
    }

    init() {
        this.container.empty();
        this.build(this.data, this.container);
    }

    build(data, container) {
        for (let i=0;i<data.length;i++) {
            if (data[i].content) {
                // Group
                container.append(this.buildGroup(data[i].name, data[i].content));
            } else {
                // Input
                container.append(this.createRow(data[i].label, data[i]));
            }
        }
    }

    buildGroup(label, content) {
        let groupDiv = $('<div>', {
            class: 'control__group'
        });

        let labelDiv = $('<div>', {
            class: 'control__group__label'
        });
        labelDiv.append(label)

        let contentDiv = $('<div>', {
            class: 'control__group__content'
        });
        this.build(content, contentDiv);

        groupDiv.append(labelDiv);
        groupDiv.append(contentDiv);
        return groupDiv;
    }

    buildRows(data) {
        let container = $('<div>', {
            class: 'control__content_)container'
        });
        for (let i=0;i<data.length;i++) {
            let row = this.createRow(data[i].label, data[i]);
            container.append(row);
        }
        return container;
    }

    createRow(label, content) {
        let rowDiv = $('<div>', {
            class: 'control__row'
        });

        let labelDiv = $('<div>', {
            class: 'control__row__label'
        });
        labelDiv.append(label)

        let contentDiv = $('<div>', {
            class: 'control__row__content'
        });
        let input = this.createInput(content)
        contentDiv.append(input)

        
        let valueDiv = $('<div>', {
            class: 'control__row__label',
            id: `value_${content.id}`
        });
        valueDiv.text(content.range[2]);

        rowDiv.append(labelDiv);
        rowDiv.append(contentDiv);
        rowDiv.append(valueDiv);
        return rowDiv;
    }

    createInput(data) {
        // Create the input
        let output;
        let setValue = function(e) {
            let value = $(e.target).val();
            data.onChange(parseFloat(value));
            $('#value_'+data.id).text(value);
        }
        switch (data.type) {
            case 'number':
                output = $('<input>', {
                    type: 'number',
                    id: data.id,
                    min: data.range[0],
                    max: data.range[1],
                    value: data.range[2],
                });
                output.on('change', setValue);
            break;
            case 'slider':
                output = $('<input>', {
                    type: 'range',
                    id: data.id,
                    min: data.range[0],
                    max: data.range[1],
                    value: data.range[2],
                    step: data.range[3] || 1,
                });
                output.on('change', setValue);
                if (data.liveChange) {
                    output.on('input', setValue);
                } else {
                    output.on('input', function(e) {
                        let value = $(e.target).val();
                        $('#value_'+data.id).text(value);
                    });
                }
            break;
        }
        return output;
    }
}