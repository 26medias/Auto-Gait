import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";


const textures = {
    servo: new THREE.MeshStandardMaterial( {
        color: 0x0D47A1,
        metalness: 0.1,
        roughness: 0.6
    }),
    limb: new THREE.MeshStandardMaterial( {
        color: 0xB71C1C,
        metalness: 0.1,
        roughness: 0.6
    }),
    body: new THREE.MeshStandardMaterial( {
        color: 0x263238,
        metalness: 0.1,
        roughness: 0.6
    }),
    default: new THREE.MeshStandardMaterial( {
        color: 0x9E9E9E,
        metalness: 0.1,
        roughness: 0.2
    }),
    metal: new THREE.MeshStandardMaterial({
        color: 0xcccccc, // Gray color
        metalness: 0.9,
        roughness: 0.2,
    }),
    basicFloor: new THREE.MeshStandardMaterial( {
        color: 0x212121,
        metalness: 0.1,
        roughness: 0.8
    }),
    hud: new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 8,
        metalness: 0.0,
        roughness: 0.0,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }),
    hudRed: new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        emissive: 0xFF0000,
        emissiveIntensity: 8,
        metalness: 0.0,
        roughness: 0.0,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }),
    hudBlue: new THREE.MeshStandardMaterial({
        color: 0x0000FF,
        emissive: 0x0000FF,
        emissiveIntensity: 8,
        metalness: 0.0,
        roughness: 0.0,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }),
    floor: (function(sx=200, sz=200) {
        const textureLoader = new THREE.TextureLoader();
    
        // Load each texture map
        const baseColorTexture = textureLoader.load('assets/textures/floor/Gravel_001_BaseColor.jpg');
        baseColorTexture.wrapS = baseColorTexture.wrapT = THREE.RepeatWrapping;
        baseColorTexture.repeat.set(sx, sz);
    
        const normalTexture = textureLoader.load('assets/textures/floor/Gravel_001_Normal.jpg');
        normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
        normalTexture.repeat.set(sx, sz);
    
        const aoTexture = textureLoader.load('assets/textures/floor/Gravel_001_AmbientOcclusion.jpg');
        aoTexture.wrapS = aoTexture.wrapT = THREE.RepeatWrapping;
        aoTexture.repeat.set(sx, sz);
    
        const roughnessTexture = textureLoader.load('assets/textures/floor/Gravel_001_Roughness.jpg');
        roughnessTexture.wrapS = roughnessTexture.wrapT = THREE.RepeatWrapping;
        roughnessTexture.repeat.set(sx, sz);
    
        const heightTexture = textureLoader.load('assets/textures/floor/Gravel_001_Height.png');
        heightTexture.wrapS = heightTexture.wrapT = THREE.RepeatWrapping;
        heightTexture.repeat.set(sx, sz);
    
        // Create a MeshStandardMaterial with the loaded textures
        const gravelMaterial = new THREE.MeshStandardMaterial({
            map: baseColorTexture,
            //normalMap: normalTexture,
            //aoMap: aoTexture,
            //roughnessMap: roughnessTexture,
            //displacementMap: heightTexture,
            metalness: 0.1,
            roughness: 0.8,
            displacementScale: 2, // Adjust this value for visible displacement
        });
    
        return gravelMaterial;
    })(5,5),
}


export const ServoData = {
    servo: {
        w: 1.2,
        h: 2.2,
        l: 2.2,
        ch: 0.6,
        pd: 0.46,
        ph: 0.4,
    }
};

class Render3D {
    constructor(gait) {
        this.gait = gait;
        this.init();
    }

    async init() {
        let scope = this;

        /*let world = new CANNON.World();
        world.quatNormalizeSkip = 0;
        world.quatNormalizeFast = false;

        world.gravity.set(0,-10,0);
        world.broadphase = new CANNON.NaiveBroadphase();

        this.world = world;*/

        let loader = new THREE.FontLoader();
        return new Promise((resolve, reject) => {
            loader.load('assets/fonts/helvetiker_regular.typeface.json', function (font) {
                scope.font = font;
                resolve(true);
            }, undefined, function (error) {
                console.error('An error occurred while loading the font:', error);
                reject(false);
            });
        });
    }

    // Create a three object from data
    newObject(data, name='') {
        let base_box_geometry;
        switch(data.type) {
            default:
            case "box":
                base_box_geometry = new THREE.BoxGeometry(data.size[0], data.size[1], data.size[2], 32);
            break;
            case "cylinder":
                base_box_geometry = new THREE.CylinderGeometry(data.size[0], data.size[1], data.size[2], 32, 32);
            break;
        }
        const base_box = new THREE.Mesh(base_box_geometry, data.texture || textures.default);
        base_box.position.set(data.pos[0], data.pos[1], data.pos[2]);
        if (data.rot) {
            base_box.rotation.set(data.rot[0], data.rot[1], data.rot[2]);
        }
        base_box.castShadow = true;
        base_box.receiveShadow = true;
        base_box.name = name;
        return base_box;
    }




    getGroupSize(group) {
        var box = new THREE.Box3().setFromObject(group);
        var size = box.getSize(new THREE.Vector3());
        return size;
    }
    getGroupBox(group) {
        var box = new THREE.Box3().setFromObject(group);
        return box;
    }

    // meshA.position.set(pA[0]-pB[0], pA[1]-pB[1], pA[2]-pB[2]);
    // Attach 2 objects at their anchor points with proper pivot point
    attach(name, meshA, meshB) {
        let scope = this;

        let pA = 'end';
        let pB = 'start';

        let anchorA = meshA.anchors[pA];
        let anchorB = meshB.anchors[pB];

        let x, y, z;
        x = meshB.mesh.position.x + anchorA[0] - anchorB[0];
        y = meshB.mesh.position.y + anchorA[1] - anchorB[1];
        z = meshB.mesh.position.z + anchorA[2] - anchorB[2];

        meshB.mesh.position.set(x, y, z);

        const group = new THREE.Group();
        group.add(meshA.mesh);
        group.add(meshB.mesh);
        group.name = name;

        return {
            mesh: group,
            anchors: {
                start: meshA.anchors.start,
                end: [
                    x + meshB.anchors.end[0],
                    y + meshB.anchors.end[1],
                    z + meshB.anchors.end[2]
                ]
            },
            rotate: function(v) {
                group.rotation.y = scope.deg(v);
            },
            rotation: function() {
                return scope.rad(group.rotation.y);
            },
        };
    }



    moveMeshRotCenter(mesh, x, y, z) {
        for (let i=0;i<mesh.mesh.children.length;i++) {
            mesh.mesh.children[i].position.x += x;
            mesh.mesh.children[i].position.y += y;
            mesh.mesh.children[i].position.z += z;
        }
        ['start', 'end'].forEach((k) => {
            [0,1,2].forEach((n) => {
                mesh.anchors[k][n] += [x, y, z][n];
            })
        })
        return mesh;
    }

    reverseAnchors(mesh) {
        mesh.anchors = {
            start: mesh.anchors.end,
            end: mesh.anchors.start
        }
        return mesh;
    }


    deg(v) {
        return v * (Math.PI / 180);
    }
    rad(value) {
        return value * (180 / Math.PI);
    }

    createTest(position) {

        let radius = 0.2;
        let lineRadius = 0.1;
        let texture = textures.hudRed;

        var m0 = new THREE.Mesh(new THREE.TorusGeometry(radius, lineRadius, 64, 100), texture);
        var m1 = new THREE.Mesh(new THREE.TorusGeometry(radius, lineRadius, 64, 100), texture);
        var m2 = new THREE.Mesh(new THREE.TorusGeometry(radius, lineRadius, 64, 100), texture);

        m1.rotation.x = this.deg(90);
        m2.rotation.y = this.deg(90);

        const group = new THREE.Group();
        group.add(m0);
        group.add(m1);
        group.add(m2);

        group.position.set(position.x, position.y, position.z);

        // Return the created mesh
        return group;
    }

    create3DCircle(position, radius, lineRadius, texture) {
        var torusGeometry = new THREE.TorusGeometry(radius, lineRadius, 64, 100);

        // Add an emissive material to the torus that glows
        var torusMaterial = texture || textures.hud;

        var torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
        torusMesh.castShadow = true;
        torusMesh.receiveShadow = true;

        torusMesh.rotation.x = this.deg(90);
        torusMesh.position.set(position.x, position.y, position.z);

        // Return the created mesh
        return torusMesh;
    }

    createText(position, label, size) {

        const textGeometry = new THREE.TextGeometry(label, {
            font: this.font,
            size: size || 1,
            height: 0.02,
        });

        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.copy(position);

        return textMesh;
    }


    // Servo Creator
    createServo() {
        let cylinderZ = ServoData.servo.h+ServoData.servo.ch/2;
        let servo = {
            body: {
                type:           'box',
                size:           [ServoData.servo.w, ServoData.servo.l, ServoData.servo.h], 
                pos:            [0,ServoData.servo.h/2,ServoData.servo.l/2],
                texture:        textures.servo,
            },
            cylinder: {
                type:           'cylinder',
                size:           [ServoData.servo.w/2, ServoData.servo.w/2, ServoData.servo.ch], 
                pos:            [0, cylinderZ, ServoData.servo.w/2],
                texture:        textures.servo,
            },
            pin: {
                type:           'cylinder',
                //size:           [ServoData.servo.pd/2, ServoData.servo.ph, ServoData.servo.pd/2], 
                size:           [ServoData.servo.pd/2, ServoData.servo.pd/2, ServoData.servo.ph], 
                pos:            [0, cylinderZ+ServoData.servo.ph, ServoData.servo.w/2],
                texture:        textures.metal,
            }
        }
        const group = new THREE.Group();

        let body = this.newObject(servo.body, 'body');
        let cylinder = this.newObject(servo.cylinder, 'cylinder');
        let pin = this.newObject(servo.pin, 'pin');

        let setPos = function(v) {
            body.position.z += v;
            cylinder.position.z += v;
            pin.position.z += v;
        }
        let offset = -ServoData.servo.w/2; // Correct the center of rotation to match the pin
        setPos(offset);

        group.add(body);
        group.add(cylinder);
        group.add(pin);
        group.name = 'servo';

        return {
            mesh: group,
            anchors: {
                start: [0, 0, ServoData.servo.l/2 + offset],
                end: [pin.position.x, pin.position.y, pin.position.z + servo.pin.size[2] + offset],
            },
            rotate: function(v) {
                group.rotation.y = this.deg(v);
            },
            rotation: function() {
                return this.rad(group.rotation.y);
            },
        };
    }

    // Limb Creator
    createLimb(w, h, l, offset) {
        const group = new THREE.Group();
        let limb = {
            size:               [w, h, l],
            pos:                [0,0,0],
            rot:                [0, 0, 0],
            density:            1,
            restitution:        0.1,
            move:               false,
            texture:            textures.limb,
        }
        group.add(this.newObject(limb));
        group.name = 'limb';
        return {
            mesh: group,
            anchors: {
                start: [0, -h/2, l/2 - w],
                end:   [0, -h/2, -l/2],
            },
            rotate: function(v) {
                group.rotation.y = this.deg(v);
            },
            rotation: function() {
                return this.rad(group.rotation.y);
            },
        };
    }

    // Create the robot Body
    createBody(options) {
        let bodyData = {
            type:           'cylinder',
            size:           [options.body.radius, options.body.radius, options.body.height], 
            pos:            [0, 0, 0],
            texture:        textures.body,
        }
        let body = this.newObject(bodyData, 'body');
        let bodyCenter = this.create3DCircle({
            x: 0,
            y: options.body.height/2,
            z: 0
        }, 0.1, 0.1)

        let robotCenter = this.create3DCircle({
            x: 0,
            y: options.body.height/2,
            z: 0
        }, 0.1, 0.1, textures.hudRed)
        let robotDownCenter = this.create3DCircle({
            x: 0,
            y: options.body.height/2,
            z: 0
        }, 0.1, 0.1, textures.hudBlue)

        const group = new THREE.Group();
        group.add(body);
        group.add(bodyCenter);
        group.add(robotCenter);
        group.add(robotDownCenter);

        return {
            mesh: group,
            info: {
                center: robotCenter,
                downCenter: robotDownCenter
            },
            anchors: {
                start: [0,0,0],
                end: [0,0,0],
            },
            rotate: function(v) {
                body.rotation.y = this.deg(v);
            },
            rotation: function() {
                return this.rad(body.rotation.y);
            },
        }
    }

    // Create the tip
    createTip(n, options) {
        let scope = this;
        //console.log(this)
        let limb = this.createLimb(this.gait.options.leg.tip.width, this.gait.options.leg.tip.height, this.gait.options.leg.tip.length, this.gait.options.leg.tip.offset);
        let servo = this.createServo();
        let group = this.attach('LegTip', limb, servo);
        limb.mesh.position.y += 1.3; // servo constant, need to adjust

        let size = this.getGroupSize(group.mesh);

        group = this.moveMeshRotCenter(group, 0, 0, size.z/2)

        return {
            ...group,
            rotate: function(v) {
                if (!scope.gait.options.leg.mirror[n]) {
                    v -= 180;
                } else {

                }
                group.mesh.rotation.y = scope.deg(180-v);
            },
            rotation: function() {
                return scope.rad(group.mesh.rotation.y);
            },
            parts: {
                limb,
                servo
            }
        };
    }

    // Create a robot leg
    createLeg(n, options) {
        let scope = this;
        let parts = {};
        
        const mirror = this.gait.options.leg.mirror[n];

        let flipAngle = mirror ? 180 : 0;

        // Create the tip (tip + servo)
        let tip = this.createTip(n);

        // Create the upper limb
        let limb = this.createLimb(this.gait.options.leg.upper.width, this.gait.options.leg.upper.height, this.gait.options.leg.upper.length, this.gait.options.leg.upper.offset);

        // Attach the upper limb to the tip assembly
        let upperGroup = this.attach('UpperGroup', tip, limb)
        upperGroup.rotate = function(v) {
            if (scope.gait.options.leg.mirror[n]) {
                v += 180;
            }
            upperGroup.mesh.rotation.y = scope.deg(v);
        }

        let size = this.getGroupSize(upperGroup.mesh);
        //upperGroup = this.moveMeshRotCenter(upperGroup, 0, 0, size.z/2 - ServoData.servo.ch)
        upperGroup = this.moveMeshRotCenter(upperGroup, 0, 0, this.gait.options.leg.upper.length - ServoData.servo.ch)

        // Create the UP/DOWN shoulder joint
        let servoA = this.reverseAnchors(this.createServo());
        
        // Group the leg & shoulderA
        let shoulderLeg = this.attach('LegBlock', upperGroup, servoA)

        shoulderLeg.mesh.rotateX(this.deg(flipAngle))
        shoulderLeg.mesh.rotateY(this.deg(flipAngle))
        if (mirror) {
            shoulderLeg.mesh.position.y += ServoData.servo.h + ServoData.servo.ch - 0.1;
        }

        // Create the LEFT/RIGHT shoulder joint
        let servoB = this.createServo();
        servoB.mesh.rotateX(this.deg(90))
        servoB.mesh.rotateZ(this.deg(180))
        servoB.mesh.rotateY(this.deg(flipAngle))

        servoB.mesh.position.x -= ServoData.servo.w;
        servoB.mesh.position.y += ServoData.servo.h - ServoData.servo.ch;
        servoB.mesh.position.z += ServoData.servo.l - ServoData.servo.ch;

        // Group the leg & shoulderB
        let shoulder = this.attach('LegShoulder', shoulderLeg, servoB)

        shoulder.mesh.rotation.x = this.deg(-90);
        shoulder.rotate = function(v) {
            let degAngle = v + scope.gait.body.legs[n].legAngle + 90;
            if (scope.gait.options.leg.mirror[n]) {
                //degAngle = 180 + degAngle;
            }
            shoulder.mesh.rotation.z = scope.deg(degAngle);
        }
        shoulder.rotation = function() {
            return scope.rad(shoulder.mesh.rotation.z);
        }
        shoulder = this.moveMeshRotCenter(shoulder, ServoData.servo.w, -1.3, 1.4); // servo constant, need to adjust

        parts.tip = tip;
        parts.upper = upperGroup;
        parts.shoulder = shoulder;
        
        // Rotate upside down, pin up
        shoulder.mesh.rotation.y = scope.deg(180);

        return {
            mesh: shoulder.mesh,
            anchors: {
                start: [0,0,0],
                end: [0,0,0]
            },
            parts: parts,
            rotate: function(v) {
                shoulder.mesh.rotation.z = scope.deg(v);
            },
            rotation: function() {
                return scope.rad(shoulder.mesh.rotation.z);
            }
        };
    }

    createFloor() {
        let floor = this.newObject({
            type:           'box',
            size:           [200, 0.1, 200], 
            pos:            [0, 0, 0],
            texture:        textures.basicFloor,
        });
        floor.position.y = 0;
        return floor;
    }



    updateInfo(gait, robot) {
        for (let i=0;i<gait.body.legs.length;i++) {
            robot.info.parts[i].footPosition.position.x = gait.body.legs[i].foot.ax;
            robot.info.parts[i].footPosition.position.z = gait.body.legs[i].foot.ay;
            robot.info.parts[i].footPosition.position.y = gait.body.legs[i].lift.z;
            
            let legCenter = gait.body.legs[i].getCenter();
            robot.info.parts[i].area.position.x = legCenter.x;
            robot.info.parts[i].area.position.z = legCenter.y;
            robot.info.parts[i].areaCenter.position.x = legCenter.x;
            robot.info.parts[i].areaCenter.position.z = legCenter.y;


            if (gait.body.legs[i].integratedVector) {
                let vectorCoords = Maths.pointCoord(legCenter.x, legCenter.y, gait.body.legs[i].options.radius, gait.body.legs[i].integratedVector.angle)
                robot.info.parts[i].areaVector.position.x = vectorCoords.x;
                robot.info.parts[i].areaVector.position.z = vectorCoords.y;
            }

        }
    }


    // Assemble the robot
    createRobot(gait) {
        let scope = this;
        const output = {
            floor: null,
            robot: {},
            info: {
                mesh: null,
                parts: []
            }
        }
        output.floor = this.createFloor();

        const robotBody = new THREE.Group();
        const robotInfo = new THREE.Group();

        // Create the body
        let body = this.createBody(gait.options);
        robotBody.add(body.mesh);


        // Create the legs
        output.robot.legs = [];
        for (let i=0;i<gait.body.legs.length;i++) {
            // Create the leg
            let leg = this.createLeg(i, gait.options);
            let angle = scope.gait.body.legs[i].legAngle; //(360/gait.options.leg.count)*i + gait.body.angle;
            leg.angle = angle;
            leg.mesh.position.x = gait.body.legs[i].anchor.x;
            leg.mesh.position.z = gait.body.legs[i].anchor.y;
            //leg.mesh.rotation.z = -this.deg(angle);
            output.robot.legs.push(leg);  // Add to the output
            robotBody.add(leg.mesh);    // Attach to the body

            // Create the visual info
            let legAreaCenter = gait.body.legs[i].getCenter();

            // Movement area
            let area = this.create3DCircle({
                x: legAreaCenter.x,
                y: 0,
                z: legAreaCenter.y
            }, gait.body.legs[i].options.radius, 0.1)
            // Movement area center
            let areaCenter = this.create3DCircle({
                x: legAreaCenter.x,
                y: 0,
                z: legAreaCenter.y
            }, 0.1, 0.1)
            // Movement area center Vector
            let areaVector = this.create3DCircle({
                x: legAreaCenter.x,
                y: 0,
                z: legAreaCenter.y
            }, 0.1, 0.1, textures.hudBlue)
            // Desired Foot Position
            let footPosition = this.create3DCircle({
                x: gait.body.legs[i].foot.ax,
                y: 0,
                z: gait.body.legs[i].foot.ay
            }, 0.5, 0.2, textures.hudRed)

            let label = this.createText({
                x: legAreaCenter.x,
                y: 0,
                z: legAreaCenter.y
            }, `#${i}`, 1)

            robotInfo.add(area);
            robotInfo.add(areaCenter);
            robotInfo.add(areaVector);
            robotInfo.add(footPosition);
            robotInfo.add(label);

            output.info.parts.push({
                area,
                areaCenter,
                areaVector,
                footPosition
            });
        }

        robotBody.position.y = gait.options.body.z + ServoData.servo.h + ServoData.servo.ch + ServoData.servo.ph;

        output.robot.body = {
            mesh: robotBody,
            body
        };
        output.robot.body.update = function() {
            robotBody.position.y = gait.body.z + ServoData.servo.h + ServoData.servo.ch + ServoData.servo.ph;
            robotBody.rotation.y = -scope.deg(gait.body.angle);
        }

        output.info.mesh = robotInfo;

        output.info.update = function() {
            scope.updateInfo(gait, output)
        };

        return output
    }
}



export default Render3D;