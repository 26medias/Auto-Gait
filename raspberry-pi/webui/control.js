
class ControlUI {
    constructor(options) {
        this.data = [{
            name: 'Gait',
            content: [{
                id: 'areaDistance',
                label: 'Area Distance',
                type:  'slider',
                range: [0,30, options.areaDistance, 0.1]
            },{
                id: 'areaRadius',
                label: 'Area Radius',
                type:  'slider',
                range: [0,30, options.areaRadius, 0.1]
            },{
                id: 'streamline',
                label: 'Streamline',
                type:  'slider',
                range: [0,100, options.streamline]
            },{
                id: 'steps',
                label: 'Steps',
                type:  'slider',
                range: [0,30, options.steps]
            }]
        },
        {
            name: 'Translation Vector',
            content: [{
                id: 'translationAngle',
                label: 'Angle',
                type:  'slider',
                range: [-180,180, options.translationAngle]
            },
            {
                id: 'translationRadius',
                label: 'Radius',
                type:  'slider',
                range: [0,99, options.translationRadius]
            }]
        },
        {
            name: 'Body Angles',
            content: [{
                id: 'yaw',
                label: 'Yaw',
                type:  'slider',
                range: [-35,35, options.yaw, 1]
            }, {
                id: 'pitch',
                label: 'Pitch',
                type:  'slider',
                range: [-45,45, options.pitch, 1]
            }, {
                id: 'roll',
                label: 'Roll',
                type:  'slider',
                range: [-45,45, options.roll, 1]
            }, {
                id: 'z',
                label: 'Ground Distance',
                type:  'slider',
                range: [1,60, options.z, 0.1]
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
        let scope = this;
        // Create the input
        let output;
        let setValue = function(e) {
            let value = $(e.target).val();
            //data.onChange(parseFloat(value));
            scope.updateData({
                name: data.id,
                value: parseFloat(value)
            })
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

    updateData(data) {
        const url = '/update';
    
        if (data && Object.keys(data).length > 0) {
            // Send a POST request with data
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        } else {
            // Send a GET request
            fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log('Received:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        }
    }
}