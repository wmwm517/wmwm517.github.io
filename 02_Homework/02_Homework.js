import { resizeAspectRatio, setupText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader = null;
let vao = null;
let textOverlay = null;

// Initialize WebGL stuffs
function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    // Set canvas dimensions
    canvas.width = 600;
    canvas.height = 600;
    
    // add resize handler
    resizeAspectRatio(gl, canvas);

    // set viewport (the first time)
    gl.viewport(0, 0, canvas.width, canvas.height);

    // set the background color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    return true;
}

// Loading the shader source files
async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

// Create and setup buffers
function setupBuffers() {
    // Rectangle vertices
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,
        -0.1, 0.1, 0.0,
        0.1, 0.1, 0.0,
        0.1, -0.1, 0.0
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
}

// Variables to track the rectangle's position
let deltaX = 0;
let deltaY = 0;

// Render function
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.setVec2('uOffset', deltaX, deltaY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render());
}

// move coordinates of the rectangle
window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const translation = 0.01;
        switch (event.key) {
            case 'ArrowUp':
                deltaY += translation;
                break;
            case 'ArrowDown':
                deltaY -= translation;
                break;
            case 'ArrowLeft':
                deltaX -= translation;
                break;
            case 'ArrowRight':
                deltaX += translation;
                break;
        }
        // Limit the movement to stay within the canvas
        deltaX = Math.max(-0.9, Math.min(0.9, deltaX));
        deltaY = Math.max(-0.9, Math.min(0.9, deltaY));
    }
});

// Main function
async function main() {
    try {      
        textOverlay = setupText(canvas, "Use arrow keys to move the rectangle");

        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        await initShader();

        shader.use();
        setupBuffers();

        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// Run the main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});