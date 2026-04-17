/*-------------------------------------------------------------------------
11_CameraFP.js (First Person Camera)

- Viewing a unit 3D cube at origin with perspective projection
- View transformation
   1) w, a, s, d keys: move the camera forward, left, backward, and right
   2) mouse horizontal movement: rotate the camera around the y-axis (yaw)
   3) mouse vertical movement: rotate the camera around the x-axis (pitch)
- Pointer lock
   1) At first, click the canvas to lock the pointer
   2) Move the mouse to rotate the camera, WASD keys to move the camera
   3) Escape key: Unlock the pointer
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, Axes, updateText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { Cube } from '../util/cube.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader;
let startTime;  // start time of the program
let lastFrameTime;  // time of the last frame
let isInitialized = false;  // program initialization flag

let modelMatrix = mat4.create();  // model matrix
let viewMatrix = mat4.create();  // view matrix
let topDownViewMatrix = mat4.create();  // view matrix
let projMatrix = mat4.create();  // projection matrix
let persProjMatrix = mat4.create();  // projection matrix
const cube = [new Cube(gl), new Cube(gl), new Cube(gl), new Cube(gl), new Cube(gl)];  // create 5 Cube objects
const axes = new Axes(gl, 2.0); // create an Axes object

// Global variables for camera position and orientation
let cameraPos = vec3.fromValues(0, 0, 5);  // camera position initialization
let cameraFront = vec3.fromValues(0, 0, -1); // camera front vector initialization
let cameraUp = vec3.fromValues(0, 1, 0); // camera up vector (invariant)
let yaw = -90;  // yaw angle, rotation about y-axis (degree)
let pitch = 0;  // pitch angle, rotation about x-axis (degree)
const mouseSensitivity = 0.1;  // mouse sensitivity
const cameraSpeed = 2.5;  // camera speed (unit distance/sec)
let textOverlay = setupText(canvas, "", 1); // text overlay for displaying camera information

// global variables for keyboard input
const keys = {
    'w': false,
    'a': false,
    's': false,
    'd': false
};

// mouse 쓸 때 main call 방법
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('program terminated');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('program terminated with error:', error);
    });
});

// keyboard event listener for document
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;
    }
});

// mouse event listener for canvas
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
    // Changing the pointer lock state
    console.log("Canvas clicked, requesting pointer lock");
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        console.log("Pointer is locked");
        document.addEventListener("mousemove", updateCamera);
    } else {
        console.log("Pointer is unlocked");
        document.removeEventListener("mousemove", updateCamera);
    }
});

// camera update function
function updateCamera(e) {
    const xoffset = e.movementX * mouseSensitivity;  // movementX 사용
    const yoffset = -e.movementY * mouseSensitivity; // movementY 사용

    yaw += xoffset;
    pitch += yoffset;

    // pitch limit
    if (pitch > 89.0) pitch = 89.0;
    if (pitch < -89.0) pitch = -89.0;

    // camera direction calculation
    // sperical coordinates (r, theta, phi) = (r, yaw, pitch) = (sx, sy, sz)
    // sx = cos(yaw) * cos(pitch)
    // sy = sin(pitch)
    // sz = sin(yaw) * cos(pitch)
    const direction = vec3.create();
    direction[0] = Math.cos(glMatrix.toRadian(yaw)) * Math.cos(glMatrix.toRadian(pitch));
    direction[1] = Math.sin(glMatrix.toRadian(pitch));
    direction[2] = Math.sin(glMatrix.toRadian(yaw)) * Math.cos(glMatrix.toRadian(pitch));
    vec3.normalize(cameraFront, direction);
}

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 1400;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function render() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    lastFrameTime = currentTime;
    const elapsedTime = (currentTime - startTime) / 1000.0;
    
    // camera movement based on keyboard input
    const cameraSpeedWithDelta = cameraSpeed * deltaTime;
    
    // vec3.scaleAndAdd(v1, v2, v3, s): v1 = v2 + v3 * s
    if (keys['w']) { // move camera forward (to the +cameraFront direction)
        vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, cameraSpeedWithDelta);
    }
    if (keys['s']) { // move camera backward (to the -cameraFront direction)
        vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, -cameraSpeedWithDelta);
    }
    if (keys['a']) { // move camera to the left (to the -cameraRight direction)
        const cameraRight = vec3.create();
        vec3.cross(cameraRight, cameraFront, cameraUp);
        vec3.normalize(cameraRight, cameraRight);
        vec3.scaleAndAdd(cameraPos, cameraPos, cameraRight, -cameraSpeedWithDelta);
    }
    if (keys['d']) { // move camera to the right (to the +cameraRight direction)
        const cameraRight = vec3.create();
        vec3.cross(cameraRight, cameraFront, cameraUp);
        vec3.normalize(cameraRight, cameraRight);
        vec3.scaleAndAdd(cameraPos, cameraPos, cameraRight, cameraSpeedWithDelta);
    }

    // update view matrix
    mat4.lookAt(viewMatrix, 
        cameraPos, // from position (camera position)
        vec3.add(vec3.create(), cameraPos, cameraFront), // target position (camera position + cameraFront)
        cameraUp); // up vector (camera up vector, usually (0, 1, 0) and invariant)
    
    // top-down view matrix
    mat4.lookAt(topDownViewMatrix, 
        vec3.fromValues(0, 15, 0), // from position (top-down view)
        vec3.fromValues(0, 0, 0), // target position (looking at the origin)
        vec3.fromValues(0, 0, -1)); // up vector (pointing towards negative z-axis)
    
    mat4.ortho(persProjMatrix, -10, 10, -10, 10, 0.1, 100); // orthographic projection for top-down view
    
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.SCISSOR_TEST);

    // left viewport
    gl.viewport(0, 0, canvas.width/2, canvas.height);
    gl.scissor(0, 0, canvas.width/2, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawPersCube(cube[0], shader, [0, 0, 0]);
    drawPersCube(cube[1], shader, [2.0, 0.5, -3.0]);
    drawPersCube(cube[2], shader, [-1.5, -0.5, -2.5]);
    drawPersCube(cube[3], shader, [3.0, 0.0, -4.0]);
    drawPersCube(cube[4], shader, [-3.0, 0.0, 1.0]);
    axes.draw(viewMatrix, projMatrix);

    // right viewport
    gl.viewport(canvas.width/2, 0, canvas.width/2, canvas.height);
    gl.scissor(canvas.width/2, 0, canvas.width/2, canvas.height);
    gl.clearColor(0.05, 0.15, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawTopDownCube(cube[0], shader, [0, 0, 0]);
    drawTopDownCube(cube[1], shader, [2.0, 0.5, -3.0]);
    drawTopDownCube(cube[2], shader, [-1.5, -0.5, -2.5]);
    drawTopDownCube(cube[3], shader, [3.0, 0.0, -4.0]);
    drawTopDownCube(cube[4], shader, [-3.0, 0.0, 1.0]);
    axes.draw(topDownViewMatrix, persProjMatrix);
        
    updateText(textOverlay, "Camera pos: (" + cameraPos[0].toFixed(1) + ", " + cameraPos[1].toFixed(1) + ", " + cameraPos[2].toFixed(1) + ")"
+ " | Yaw: " + yaw.toFixed(1) + "° | Pitch: " + pitch.toFixed(1) + "°");
    setupText(canvas, "WASD: move | Mouse: rotate (click to lock) | ESC: unlock", 2);
    setupText(canvas, "Left: Perspective | Right: Orthographic (Top-Down)", 3);

    requestAnimationFrame(render);
}

// draw left viewport cube with perspective projection
function drawPersCube(cube, shader, [x, y, z]) {
    modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(x, y, z)); // translate to specified position
    shader.use();
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setMat4('u_projection', projMatrix);
    cube.draw(shader);
}

// draw right viewport cube with orthographic projection (top-down view)
function drawTopDownCube(cube, shader, [x, y, z]) {
    modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(x, y, z)); // translate to specified position
    shader.use();
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', topDownViewMatrix);
    shader.setMat4('u_projection', persProjMatrix);
    cube.draw(shader);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('Failed to initialize WebGL');
        }
        
        await initShader();

        // Projection transformation matrix (invariant in the program)
        mat4.perspective(
            projMatrix,
            glMatrix.toRadian(60),  // field of view (fov, degree)
            (canvas.width/2) / canvas.height, // aspect ratio
            0.1, // near
            100.0 // far
        );

        // 시작 시간과 마지막 프레임 시간 초기화
        startTime = Date.now();
        lastFrameTime = startTime;

        requestAnimationFrame(render);

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program');
        return false;
    }
}
