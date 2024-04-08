import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js";
//import createRobot from './robot.js';
import Render3D, { ServoData } from './robot.js';
import ControlUI from './control.js'

/*
60      1
120
180     2
240     3
300
360     4
*/

class CreepyBot {
    constructor(options) {
        this.options = _.extend({
            fps: 30,
            render2D: true,
            render3D: true,
            robot: {
                body: {
                    type: 'custom',
                    radius: 7,     // Body Radius
                    legRadius: 7,   // Location of the leg anchors
                    height: 0.5,    // Body tickness
                    angle: 0,       // Body Y rotation
                    streamline: 0, // oval deformation in the vector direction
                    z: 2,           // Body height from ground
                    builder: function(body, Leg) {
                        let legConfigs = [{
                            anchorAngle: 330
                        },{
                            anchorAngle: 30
                        },{
                            anchorAngle: 150
                        },{
                            anchorAngle: 210
                        }]
                        for (let i=0;i<body.options.leg.count;i++) {
                            let legConfig = legConfigs[i];
                            let legAngle = legConfig.anchorAngle;
                            let legAnchor = Maths.pointCoord(0, 0, body.options.body.legRadius, legAngle);
                            let legPosition = Maths.pointCoord(0, 0, body.options.leg.distance, legAngle);
                            let leg = new Leg(body, legAnchor, legPosition, body.options.leg, body.canvas);
                            leg.n = i;
                            leg.legAngle = legAngle;
                            leg.lift.lifted = i % 2 == 0; // Default initial state for the legs
                            body.legs.push(leg);
                        }
                    }
                },
                leg: {
                    count: 4,       // Number of legs
                    decayRate: 1,   // Smoothing decay rate [0;1]
                    distance: 12,   // Distance of the movement center
                    radius: 3,      // Movement area radius
                    maxRadius: 3,   // Max Movement area radius to be able to reach coordinates
                    maxZ: 4,        // Max Y distance (Z in 2D coords, but Y in 3D)
                    mirror: [false, true, false, true],
                    upper: {
                        offset: [-ServoData.servo.w/2, ServoData.servo.ch+ServoData.servo.w/2, 0],
                        length: 5.5,
                        width: 0.5,
                        height: 0.5
                    },
                    tip: {
                        offset: [ServoData.servo.l/2 - ServoData.servo.w/2, 0, 0],
                        length: 7,
                        width: 0.5,
                        height: 0.5
                    }
                },
                gait: {
                    steps: 7,
                    maxTurnAngle: 0.2,
                    maxSpeed: 1, 
                    logic: function(body, legs) {
                        let minLegs = legs.length-1;
                        let liftedCount = _.filter(legs, function(item) {
                            return item.lift.lifted;
                        }).length;
                        let liftAllowedCount = Math.max(0, legs.length - minLegs - liftedCount);

                        if (liftAllowedCount > 0) {
                            /*let allowedToLift = function(i) {
                                return !legs[body.cycle(i-1, 0, legs.length)].lift.lifted && !legs[body.cycle(i+1, 0, legs.length)].lift.lifted;
                            }*/
                            let priorities = legs.map(function(l, n) {
                                return [n, l.priority]
                            }).filter(function(l) {
                                return l[1] || l[1]===0;
                            }).sort(function(a, b) {
                                return a[1] - b[1];
                            })
                            
                            if (priorities.length > 0) {
                                for (let i=0;i<=priorities.length;i++) {
                                    //console.log("Lift:", priorities[i][0], JSON.stringify(priorities))
                                    //console.log("distanceFromCenter", legs[priorities[i][0]].foot.distanceFromCenter)
                                    legs[priorities[i][0]].liftLeg();
                                    liftAllowedCount -= 1;
                                    if (liftAllowedCount <=0) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }, options);

        this.ws = new WS();

        this.setup3D();
    }

    async reset() {
        if (this.robot && this.scene) {
            this.scene.remove(this.robot.robot.body.mesh);
            this.scene.remove(this.robot.info.mesh);
            this.scene.remove(this.robot.floor);
        }
        this.stop();
        delete this.gait;
        delete this.control;
        delete this.ik;
        delete this.robot;
    }

    setupKeyboard() {
        let scope = this;

        $(document).keydown(function(event) {
            switch(event.which) {
                case 37: // left
                    
                    break;
                case 39: // right
                    
                    break;
                case 38: // up
                    break;
                case 40: // down
                    break;
                case 32: // space
                    scope.started ? scope.stop() : scope.start();
                    break;
                default: 
                    // Do nothing for other keys
                    break;
            }
        });
    }

    async init() {
        let scope = this;

        this.reset();
        this.setupKeyboard();

        // Gait
        this.gait = new AutoGait('#canvas', {
            render: true,
            width: 400,
            height: 300,
            ...this.options.robot
        }, function(gait) {
            // on tick
            if (gait.control.active) {
                scope.gait.body.applyTranslationVector({
                    angle: gait.control.vector.angle,
                    distance: gait.control.vector.percent,
                });
                scope.gait.body.applyRotationVector({
                    angle: gait.control.vector.rotationAngle,
                });
            }
        });
    
        this.control = new ControlUI(this);
        this.ik = new IK(this.gait);
        this.control.init();

        // Robot
        let render3D = new Render3D(this.gait);
        await render3D.init();
        this.robot = render3D.createRobot(this.gait);

        this.scene.add(this.robot.robot.body.mesh);
        this.scene.add(this.robot.info.mesh);
        this.scene.add(this.robot.floor);

        console.log(this.robot)
        console.log(this.ik)

        this.start();
    }

    start() {
        let scope = this;
        this.started = true;
        this.itv = setInterval(function() {
            requestAnimationFrame(function(t) {
                scope.render(t);
            });
            //scope.stop();
        }, 1000/this.options.fps)
    }
    stop() {
        this.started = false;
        clearInterval(this.itv);
    }


    // Real world angle to Sim Angle
    convertAngle(l, n, angle) {
        if (n==0) {
            angle = -this.gait.body.legs[l].legAngle - 90 + angle;
            angle = Math.min(180, Math.max(angle, 0));
            /*if (this.gait.body.legs[l].mirrored.shoulder) {
                angle = 180 - angle;
            }*/
        }
        if (n==1) {
            angle = angle;
            angle = Math.min(180, Math.max(angle, 0));
            /*if (this.gait.body.legs[l].mirrored.upper) {
                angle = 180 - angle;
            }*/
        }
        if (n==2) {
            angle = -angle;
            angle = Math.min(180, Math.max(angle, 0));
            /*if (this.gait.body.legs[l].mirrored.tip) {
                angle = 180 - angle;
            }*/
        }
        return Math.round(angle);
    }

    // Sim angle to Real world angle
    getOriginalAngle_old(l, n, correctedAngle) {
        let out;
        if (n === 0) {
            let x = correctedAngle + this.gait.body.legs[l].legAngle;
            if (x > 180) {
                x = x - 360;
            }
            out = x + 90;
        }
        if (n === 1) {
            out = correctedAngle;
        }
        if (n === 2) {
            out = 180-correctedAngle;
        }
        return Math.abs(Math.round(out));
    }

    // Sim angle to Real world angle
    getOriginalAngle(l, n, correctedAngle) {
        let out;
        if (n === 0) {
            let x = correctedAngle + this.gait.body.legs[l].legAngle;
            if (x > 180) {
                x = x - 360;
            }
            out = x * (this.gait.options.leg.mirror[l] ? -1 : 1) - 30;// - (60 * this.gait.options.leg.mirror[l] ? 1 : -1)
            if (this.gait.options.leg.mirror[l]) {
                out = 180 - out;
            }
        }
        if (n === 1) {
            out = correctedAngle;
            if (this.gait.options.leg.mirror[l]) {
                out = 180 - out;
            }
        }
        if (n === 2) {
            out = 180-correctedAngle;
            if (this.gait.options.leg.mirror[l]) {
                out = correctedAngle;
            }
        }
        return Math.abs(Math.round(out));
    }


    updateBotRender() {
        if (this.robot) {
            this.robot.info.update();
            this.robot.robot.body.update();

            // Render the body centers
            this.robot.robot.body.body.info.center.position.x = this.gait.body.centers.center.x;
            this.robot.robot.body.body.info.center.position.z = this.gait.body.centers.center.y;
            this.robot.robot.body.body.info.downCenter.position.x = this.gait.body.centers.down.x;
            this.robot.robot.body.body.info.downCenter.position.z = this.gait.body.centers.down.y;

            // Render the body
            //this.robot.robot.body.mesh.position.x = this.gait.body.offset.x;
            //this.robot.robot.body.mesh.position.z = this.gait.body.offset.y;
    
            let angles = [];

            for (let i=0;i<this.robot.robot.legs.length;i++) {
                this.robot.robot.legs[i].parts.shoulder.rotate(this.ik.legs[i].angles.shoulder);
                this.robot.robot.legs[i].parts.upper.rotate(this.ik.legs[i].angles.upper);
                this.robot.robot.legs[i].parts.tip.rotate(this.ik.legs[i].angles.tip);

                if (true || i==0 || i == 2 || i == 4) {
                    angles.push(this.getOriginalAngle(i, 0, this.ik.legs[i].angles.shoulder));
                    angles.push(this.getOriginalAngle(i, 1, this.ik.legs[i].angles.upper));
                    angles.push(this.getOriginalAngle(i, 2, this.ik.legs[i].angles.tip));
                } else {
                    angles.push(90);
                    angles.push(90);
                    angles.push(90);
                }
                

                let pos = this.toScreenPosition(this.robot.robot.legs[i].parts.shoulder.mesh, this.camera, this.renderer);
                let _debug = {
                    angle: this.gait.body.legs[i].legAngle,
                    render: Math.round(this.ik.legs[i].angles.shoulder),
                    real: this.getOriginalAngle(i, 0, this.ik.legs[i].angles.shoulder),
                    //angle: this.robot.robot.legs[i].angle,
                };

                //console.log(i, this.ik.gait.body.legs[i].foot.distanceFromCenter)

                $(`#debug-${i}`).show().css({left: pos.x, top: pos.y}).text(JSON.stringify(_debug, null, 4));
                
                /*if (this.gait.body.legs[i].priority || this.gait.body.legs[i].priority==0) {
                    $(`#debug-${i}`).show().css({left: pos.x, top: pos.y}).text(JSON.stringify(this.gait.body.legs[i].priority, null, 4));
                } else {
                    $(`#debug-${i}`).hide();
                }*/
            }
            //console.log(">>", JSON.stringify(angles))
            //this.ws.send(angles);
        }
    }


    testBot(angle0=90, angle1=90, angle2=90) {
        if (this.robot) {
            let angles = [];

            for (let i=0;i<this.robot.robot.legs.length;i++) {
                this.robot.robot.legs[i].parts.shoulder.rotate(this.convertAngle(i, 0, angle0));
                this.robot.robot.legs[i].parts.upper.rotate(this.convertAngle(i, 1, angle1));
                this.robot.robot.legs[i].parts.tip.rotate(this.convertAngle(i, 2, angle2));
                
                angles.push(Math.abs(Math.round(angle0)));
                angles.push(Math.abs(Math.round(angle1)));
                angles.push(Math.abs(Math.round(angle2)));

                let pos = this.toScreenPosition(this.robot.robot.legs[i].parts.shoulder.mesh, this.camera, this.renderer);
                let _debug = {
                    render: angle0,
                    real0: this.getOriginalAngle(i, 2, angle0)
                };

                $(`#debug-${i}`).show().css({left: pos.x, top: pos.y}).text(JSON.stringify(_debug, null, 4));
            }

            //this.ws.send(angles);
        }
    }
    
    render(time) {
        this.gait.tick();
        this.ik.update();
        //this.testBot(180, 180, 0);
        this.updateBotRender();

        let l = 0

        /*for (l=0;l<6;l++) {
            console.log("--------- "+l+" ---------")
            let valid = true;
            for (let i=0;i<180;i++) {
                var a = this.convertAngle(l, 2, i);
                var b = this.getOriginalAngle(l, 2, a);
                valid = valid && i==b;
                if (i!=b) {
                    console.log(i, '->', a, '->', b)
                }
            }
            console.log(valid)
        }*/

        if (this.resizeRendererToDisplaySize(this.renderer)) {
            const canvas = this.renderer.domElement;
            this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
            this.camera.updateProjectionMatrix();
        }

        this.renderer.render(this.scene, this.camera);
    }

    toScreenPosition(obj, camera, renderer) {
        const vector = new THREE.Vector3();
    
        // Convert the object's position to world space
        const position = obj.getWorldPosition(vector);
    
        // Project the world position to screen space
        position.project(camera);
    
        // Convert the normalized position (-1 to 1 on both axes) to screen coordinates
        const x = (position.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = -(position.y * 0.5 - 0.5) * renderer.domElement.clientHeight;
    
        return { x, y };
    }

    setup3D() {
        const canvas = document.querySelector('#c');
        this.renderer = new THREE.WebGLRenderer({canvas});
    
        // Turn on shadows in renderer
        this.renderer.shadowMap.enabled = true;
        
        // Camera
        const fov = 55;
        const aspect = window.innerWidth/window.innerHeight;
        const near = 0.2;
        const far = 1000;
        this.camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
        this.camera.position.set( 30, 30, -30);
        
        // Recovery of the previous position
        const savedCameraPosition = localStorage.getItem('cameraPosition');
        if (savedCameraPosition) {
            const position = JSON.parse(savedCameraPosition);
            this.camera.position.set(position.x, position.y, position.z);
        }
    
        // Controls
        const controls = new OrbitControls(this.camera, canvas);
        controls.addEventListener('change', () => {
            const p = this.camera.position;
            localStorage.setItem('cameraPosition', JSON.stringify({x: p.x, y: p.y, z: p.z}));
        });
    
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xB1ABA7);
    
        // Grid
        const grid = new THREE.GridHelper( 100, 100, 0x888888, 0x444444 );
        grid.material.opacity = 0.5;
        grid.material.depthWrite = false;
        grid.material.transparent = true;
        this.scene.add( grid );
    
        // Light
        // Ambient light for overall illumination with a soft light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    
        // Directional light for simulating sunlight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50); // Elevated and distanced to cover the entire scene
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    
        // Configure the shadow camera frustum to cover the entire grid
        const shadowSize = 50; // Half the size of the grid
        directionalLight.shadow.camera.left = -shadowSize;
        directionalLight.shadow.camera.right = shadowSize;
        directionalLight.shadow.camera.top = shadowSize;
        directionalLight.shadow.camera.bottom = -shadowSize;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 200;
    
        // Increase the shadow map resolution
        directionalLight.shadow.mapSize.width = 2048; // Higher resolution
        directionalLight.shadow.mapSize.height = 2048; // Higher resolution
    
    
        // Hemisphere light for subtle environment lighting
        const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.8);
        this.scene.add(hemisphereLight);
    }

    resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }
}


setTimeout(function() {
    let bot = new CreepyBot({});
    bot.init();
}, 500)

