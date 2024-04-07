


class Canvas {
    constructor(canvas) {
        this.canvas = canvas;
    }

    // DRAWING
    circle(x, y, r, c='#000000', f='rgba(0,0,0,0)', s=1, a=0.5) {
        x = x*2;
        y = y*2;
        r = r*2;
        let ctx = this.getCTX();
        ctx.globalAlpha = a;
        ctx.strokeStyle = c;
        ctx.lineWidth = s;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = f;
        ctx.fill();
        ctx.stroke();
    }

    line(fromX, fromY, toX, toY, c = '#000000', s = 1, a = 0.5) {
        fromX = fromX*2;
        fromY = fromY*2;
        toX = toX*2;
        toY = toY*2;
        let ctx = this.getCTX();
        ctx.globalAlpha = a;
        ctx.strokeStyle = c;
        ctx.lineWidth = s;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
    }

    polygon(x, y, points, c='#000000', f='#ff0000', s=1, a=0.5) {
        x = x*2;
        y = y*2;
        let ctx = this.getCTX();
        ctx.globalAlpha = a;
        ctx.strokeStyle = c;
        ctx.lineWidth = s;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            ctx.lineTo(x + points[i].x*2, y + points[i].y*2);
        }
        ctx.closePath();
        ctx.fillStyle = f;
        ctx.fill();
        ctx.stroke();
    }

    write(text, x, y, size, color) {
        x = x*2;
        y = y*2;
        let ctx = this.getCTX();
        ctx.font = size + 'px Arial'; // Set the font size and family
        ctx.fillStyle = color; // Set the text color
        ctx.fillText(text, x, y); // Draw the text on the canvas
    }

    // UTILS
    getCTX() {
        return this.canvas.get(0).getContext('2d');
    }
    clear() {
        this.getCTX().clearRect(0, 0, this.canvas.get(0).width, this.canvas.get(0).height);
    }
}


class Control {
    constructor(canvas, gait, onToggle, onRotate) {
        this.canvas = canvas;
        this.gait = gait;
        this.active = true;
        this.onToggle = onToggle;
        this.onRotate = onRotate;
        this.radius = 0;

        this.vector = {
            angle: 0,
            distance: 0,
            rotationAngle: 0,
            turnVector: 0,
            percent: 0,
            x: this.radius,
            y: this.radius,
        }

        let scope = this;
        
        $('#canvas').click(function(e) {
            // Get the canvas offset on the page
            var offset = $(this).offset();
            
            // Calculate the x and y coordinates
            var x = e.pageX - offset.left;
            var y = e.pageY - offset.top;
            
            // Now you have the mouse coordinates relative to the canvas
            console.log('Click: Mouse X: ' + x + ', Mouse Y: ' + y);
            if (Maths.isWithinCircle(x, y, scope.radius, scope.radius, scope.radius)) {
                let coords = Maths.polarCoordinates(scope.radius, scope.radius, x, y);
                scope.vector = _.extend(scope.vector, {
                    x,
                    y,
                    distance: coords.radius,
                    percent: coords.radius/scope.radius*100,
                    angle: coords.angle
                });
            } else {
                scope.active = !scope.active;
                scope.onToggle(scope.active);
            }
        });

        $('#canvas').mousemove(function(e) {
            var offset = $(this).offset();
            var x = e.pageX - offset.left;
            var y = e.pageY - offset.top;

            /*if (Maths.isWithinCircle(x, y, scope.radius, scope.radius, scope.radius) && scope.active) {
                let coords = Maths.polarCoordinates(scope.radius, scope.radius, x, y);
                scope.vector = _.extend(scope.vector, {
                    x,
                    y,
                    distance: coords.radius,
                    percent: coords.radius/scope.radius*100,
                    angle: coords.angle
                });
            }*/
        });
        $(document).keydown(function(event) {
            switch(event.which) {
                case 37: // left
                    scope.vector.angle -= 1;
                    scope.onRotate(-1);
                    break;
                case 39: // right
                    scope.vector.angle += 1;
                    scope.onRotate(1);
                    break;
                case 38: // up
                    scope.vector.percent += 10;
                    if (scope.vector.percent>100) scope.vector.percent = 100;
                    break;
                case 40: // down
                    scope.vector.percent -= 10;
                    if (scope.vector.percent<0) scope.vector.percent = 0;
                    break;
                case 32: // space
                    //scope.gait.body.rest();
                    /*let i;
                    for (i=0;i<scope.gait.body.legs.length;i++) {
                        scope.gait.body.legs[i].lift.max = 0;
                    }*/
                    break;
                default: 
                    // Do nothing for other keys
                    break;
            }
            scope.updateDisplay();
        });
    }

    updateDisplay() {
        this.vector.distance = this.vector.percent*this.radius/100;
        this.vector = _.extend(this.vector, Maths.pointCoord(this.radius, this.radius, this.vector.distance, this.vector.angle))
    }

    render() {
        this.canvas.circle(this.radius,this.radius,this.radius,'#263238', this.active ? 'rgba(3, 155, 229, 0.5)' : 'rgba(96, 125, 139, 0.5)');
        this.canvas.circle(this.radius,this.radius,2,'#263238');
        this.canvas.line(this.radius, this.radius, this.vector.x, this.vector.y, '#263238')
        let angle = this.vector.angle.toFixed(1);
        this.canvas.write(`${angle}deg`, this.radius-25, this.radius+this.radius+20, 12, 'blue')
    }
}