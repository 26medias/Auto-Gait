var isNode = false;
if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // Node.js environment detected
    isNode = true;
}

import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js";
import Render3D, { ServoData } from './RobotModel.js';

export default class Render {
    constructor(robot, options) {
        this.robot = robot;
        this.options = _.extend({
            fps: 10
        }, options);

        this.setup3D();
    }

    async reset() {
        if (this.robotModel && this.scene) {
            this.scene.remove(this.robotModel.robot.body.mesh);
            this.scene.remove(this.robotModel.info.mesh);
            this.scene.remove(this.robotModel.floor);
        }
        this.stop();
        delete this.gait;
        delete this.control;
        delete this.ik;
        delete this.robotModel;
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

        // Robot
        let render3D = new Render3D(this.robot);
        await render3D.init();
        this.robotModel = render3D.createRobot();

        this.scene.add(this.robotModel.robot.body.mesh);
        this.scene.add(this.robotModel.info.mesh);
        this.scene.add(this.robotModel.floor);

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
        }, 1000/this.options.fps)
    }
    stop() {
        this.started = false;
        clearInterval(this.itv);
    }
    
    // Real world angle to Sim Angle
    convertAngle(l, n, angle, fixed) {
        return angle;
        if (!fixed) {
            return angle;
        }
        if (n==1) {
            if (!this.robot.legs[l].mirror) {
                angle = 180 - angle;
            }
        }
        if (n==2) {
            if (this.robot.legs[l].mirror) {
                angle = 180 - angle;
            }
        }
        angle = Math.round(angle);
        angle = Math.min(180, Math.max(angle, 0));
        return angle;
    }


    updateBotRender() {
        if (this.robotModel) {
            this.robotModel.info.update();
            this.robotModel.robot.body.update();

            // Render the body centers
            //this.robotModel.robot.body.body.info.center.position.x = this.gait.body.centers.center.x;
            //this.robotModel.robot.body.body.info.center.position.z = this.gait.body.centers.center.y;
            //this.robotModel.robot.body.body.info.downCenter.position.x = this.gait.body.centers.down.x;
            //this.robotModel.robot.body.body.info.downCenter.position.z = this.gait.body.centers.down.y;
    
            let angles = [];

            for (let i=0;i<this.robotModel.robot.legs.length;i++) {
                let a0 = this.convertAngle(i, 0, Math.round(this.robot.legs[i].angles.shoulder), true);
                let a1 = this.convertAngle(i, 1, Math.round(this.robot.legs[i].angles.upper), true);
                let a2 = this.convertAngle(i, 2, Math.round(this.robot.legs[i].angles.tip), true);

                this.robotModel.robot.legs[i].parts.shoulder.rotate(a0);
                this.robotModel.robot.legs[i].parts.upper.rotate(a1);
                this.robotModel.robot.legs[i].parts.tip.rotate(a2);

                angles.push(a0);
                angles.push(a1);
                angles.push(a2);

                let tipPos = this.toScreenPosition(this.robotModel.robot.legs[i].parts.tip.mesh, this.camera, this.renderer);
                $(`#debug-tip-${i}`).show().css({left: tipPos.x, top: tipPos.y}).text(JSON.stringify(this.robot.legs[i].anchor, null, 4));
            }
        }
    }
    
    render(time) {
        this.updateBotRender();

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

if (isNode) {
    module.exports = Render;
}