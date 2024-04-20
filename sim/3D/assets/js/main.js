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
    constructor(options, params) {
        params = _.extend({}, params);
        this.params = params;
        this.options = _.extend({
            fps: params.fps || 10,
            render2D: true,
            render3D: true,
            robot: {
                body: {
                    type: 'custom',
                    radius: 7,     // Body Radius
                    legRadius: 7,   // Location of the leg anchors
                    height: 0.5,    // Body tickness
                    angle: 0,       // Body Y rotation
                    streamline: params.streamline || 18, // oval deformation in the vector direction
                    z: 4,           // Body height from ground
                    builder: function(body, Leg) {
                        let legConfigs = [{
                            anchorAngle: 300
                        },{
                            anchorAngle: 60
                        },{
                            anchorAngle: 120
                        },{
                            anchorAngle: 240
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
                    distance: params.areaDistance || 12,   // Distance of the movement center
                    radius: params.areaRadius || 4.2,      // Movement area radius
                    maxRadius: params.areaRadius || 4.2,   // Max Movement area radius to be able to reach coordinates
                    maxZ: params.maxZ || 5,        // Max Y distance (Z in 2D coords, but Y in 3D)
                    gaitOffsetX: params.gaitOffsetX || 0, // tip center offset
                    gaitOffsetY: params.gaitOffsetY || 0, // tip center offset
                    mirror: [false, true, false, true], // Servo mirrors
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
                    steps: params.steps || 10,
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

    setVar(data) {

        //console.log("setVar", data)
        let scope = this;

        let i;

        switch (data.name) {
            case "fps":
                scope.setFPS(data.value);
            break;
            case "z":
                scope.gait.body.z = data.value;
            break;
            case "roll":
                scope.gait.body.roll = data.value;
            break;
            case "pitch":
                scope.gait.body.pitch = data.value;
            break;
            case "yaw":
                scope.gait.body.yaw = data.value;
            break;
            case "areaRadius":
                for (i=0;i<scope.gait.body.legs.length;i++) {
                    scope.gait.body.legs[i].center = Maths.pointCoord(0, 0, data.value, scope.gait.body.legs[i].legAngle);
                }
            break;
            case "areaDistance":
                scope.gait.body.updateLegRadius(data.value);
            break;
            case "steps":
                scope.options.gait.steps = data.value;
            break;
            case "streamline":
                scope.gait.body.streamline = data.value;
            break;
            case "translationAngle":
                scope.params.translationAngle = data.value;
            break;
            case "translationRadius":
                scope.params.translationRadius = data.value;
                if (!data.value || data.value == 0) {
                    console.log("REST")
                    scope.gait.body.rest(); // Rest position when vector is 0
                }
            break;
        }

        return {received: data}
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

    async init(onTick) {
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
                    angle: scope.params.translationAngle || 0,
                    distance: scope.params.translationRadius || 0,
                });
                scope.gait.body.applyRotationVector({
                    angle: 0,
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


        // Head
        this.head = new Head({
            min: 0,
            max: 180
        },{
            min: 0,
            max: 180
        },{
            min: 0,
            max: 180
        },{
            min: 0,
            max: 180
        });


        this.start(onTick);
    }

    start(onTick) {
        let scope = this;
        this.started = true;
        this.itv = setInterval(function() {
            requestAnimationFrame(function(t) {
                onTick && onTick();
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
    convertAngle(l, n, angle, fixed) {
        if (!fixed) {
            return angle;
        }
        if (n==1) {
            if (!this.gait.options.leg.mirror[l]) {
                angle = 180 - angle;
            }
        }
        if (n==2) {
            if (this.gait.options.leg.mirror[l]) {
                angle = 180 - angle;
            }
        }
        angle = Math.round(angle);
        angle = Math.min(180, Math.max(angle, 0));
        return angle;
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
    
            let angles = [];

            for (let i=0;i<this.robot.robot.legs.length;i++) {
                let a0 = this.convertAngle(i, 0, Math.round(this.ik.legs[i].angles.shoulder), true);
                let a1 = this.convertAngle(i, 1, Math.round(this.ik.legs[i].angles.upper), true);
                let a2 = this.convertAngle(i, 2, Math.round(this.ik.legs[i].angles.tip), true);

                this.robot.robot.legs[i].parts.shoulder.rotate(a0);
                this.robot.robot.legs[i].parts.upper.rotate(a1);
                this.robot.robot.legs[i].parts.tip.rotate(a2);

                angles.push(a0);
                angles.push(a1);
                angles.push(a2);

                /*let shoulderPos = this.toScreenPosition(this.robot.robot.legs[i].parts.shoulder.mesh, this.camera, this.renderer);
                $(`#debug-shoulder-${i}`).show().css({left: shoulderPos.x, top: shoulderPos.y}).text(JSON.stringify({
                    angle: this.gait.body.legs[i].legAngle,
                    Real: Math.round(this.ik.legs[i].angles.shoulder),
                    fixed: a0
                }, null, 4));*/

                /*let upperPos = this.toScreenPosition(this.robot.robot.legs[i].parts.upper.mesh, this.camera, this.renderer);
                $(`#debug-upper-${i}`).show().css({left: upperPos.x, top: upperPos.y}).text(JSON.stringify({
                    Real: Math.round(this.ik.legs[i].angles.upper),
                    fixed: a1
                }, null, 4));

                let tipPos = this.toScreenPosition(this.robot.robot.legs[i].parts.tip.mesh, this.camera, this.renderer);
                $(`#debug-tip-${i}`).show().css({left: tipPos.x, top: tipPos.y}).text(JSON.stringify({
                    Real: Math.round(this.ik.legs[i].angles.tip),
                    fixed: a2
                }, null, 4));*/
            }
        }
    }


    testBot(angle0=90, angle1=90, angle2=90, fixed) {
        if (this.robot) {
            let angles = [];

            for (let i=0;i<this.robot.robot.legs.length;i++) {
                let a0 = this.convertAngle(i, 0, angle0, fixed);
                let a1 = this.convertAngle(i, 1, angle1, fixed);
                let a2 = this.convertAngle(i, 2, angle2, fixed);


                this.robot.robot.legs[i].parts.shoulder.rotate(a0);
                this.robot.robot.legs[i].parts.upper.rotate(a1);
                this.robot.robot.legs[i].parts.tip.rotate(a2);
                
                angles.push(a0);
                angles.push(a1);
                angles.push(a2);

                let pos = this.toScreenPosition(this.robot.robot.legs[i].parts.upper.mesh, this.camera, this.renderer);
                let _debug = {
                    Real: angle1,
                    IK: a1
                };

                $(`#debug-${i}`).show().css({left: pos.x, top: pos.y}).text(JSON.stringify(_debug, null, 4));
            }

            //this.ws.send(angles);
        }
    }
    
    render(time) {
        this.gait.tick();
        this.ik.update();
        let a = 125;
        //this.testBot(a, a, a, true);
        this.updateBotRender();

        let l = 0

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
    let args = {
        fps: 20,
        disabled: true,
        areaDistance: 12,
        areaRadius: 6,
        streamline: 0,
        steps: 10,
        translationAngle: 0,
        translationRadius: 0,
        yaw: 0,
        pitch: 0,
        roll: 0,
        z: 4,
        gaitOffsetX: -0.4,
        gaitOffsetY: 1.2
    };

    console.log("args", args)

    // Random behavior
    const variablesConfig = [
        { name: 'z', valueMin: 2, valueMax: 6, durationMin: 30, durationMax: 60, probability: 5 },
        { name: 'roll', valueMin: -10, valueMax: 10, durationMin: 30, durationMax: 120, probability: 30 },
        { name: 'yaw', valueMin: -25, valueMax: 25, durationMin: 10, durationMax: 60, probability: 10 },
        { name: 'pitch', valueMin: -15, valueMax: 15, durationMin: 10, durationMax: 60, probability: 10 },
        { name: 'translationAngle', valueMin: -45, valueMax: 45, durationMin: 30, durationMax: 60, probability: 1 },
        { name: 'translationRadius', valueMin: 0, valueMax: 100, durationMin: 30, durationMax: 60, probability: 1 },
    ];

    const robot = new RobotVariables(variablesConfig);

    let bot = new CreepyBot({}, args);
    bot.init(function() {
        /*const newVars = robot.tick();
        for (let k in newVars) {
            bot.setVar({
                name: k,
                value: newVars[k]
            })
        }*/
    });
    bot.gait.body.rest();



}, 500)

