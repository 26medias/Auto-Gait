# Auto-Gait
 Bio-inspired gait + IK for many-legged robots

~/code/Auto-Gait/raspberry-pi

## 3D sim

    cd sim && http-server -c-1

go to http://127.0.0.1:8080/3D/

## Pi code

    node main -op start
    node main -op test -angle 90
    node main -op start -fps 20 -streamline 10 -distance 10 -radius 3.8
    node main -op start -disabled false -fps 20


## How it works

- Main setups the robot config and gait rules
- Gait defines the location of the leg tips
- IK converts those coordinates into servo angles
- Robot creates a 3D sim of the robot and applies the IK angles
