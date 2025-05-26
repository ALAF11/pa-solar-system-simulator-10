// On loading the page, run the init function
window.onload = () => init();

//Global variables
let canvas, currentObject, renderer, scene, camera;
const cameraPositionZ = 10;
let angle = 0.02; // rotation in radians
let currentScale = 1; // current scale
let scaleFactor = 0.1; // scale increase/decrease factor
let minScale = 0.3; // minimum size
let maxScale = 2.5; // maximum size
let mouseX = 0, mouseY = 0; // mouse position
let animationSpeed = 0.01;
let isPaused = false;
let frameCount = 0;
let lastFPSUpdate = 0;
let animationId;

// Sets listeners for the mouse position
document.getElementById("gl-canvas").onmousemove = function (event) {
    mouseX = (event.x / canvas.width) * cameraPositionZ - cameraPositionZ / 2;
    mouseY = -(event.y / canvas.height) * cameraPositionZ + cameraPositionZ / 2;
}

// Sets listeners for the mouse wheel
document.getElementById("gl-canvas").onwheel = function (event) {
    if (event.deltaY > 0) {
        currentScale += scaleFactor;
        if (currentScale > maxScale) {
            currentScale = maxScale;
        }
    } else {
        currentScale -= scaleFactor;
        if (currentScale < minScale) {
            currentScale = minScale;
        }
    }
}

//Initializes the WebGL application
const init = () => {

    // Get canvas
    canvas = document.getElementById('gl-canvas');

    // Create a render
    // Render is the main object of three.js used to draw scenes to a canvas
    renderer = new THREE.WebGLRenderer({canvas});
    renderer.setClearColor(0x000011, 1);
    renderer.setSize(800, 800);

    // Create a scene
    // Scene defines properties like the background, and defines the objects to be rendered
    scene = new THREE.Scene();

    makeSphere();

    // Create a camera
    const fov = 75;
    const  near = 0.1;
    const far = 1000;

    const aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = cameraPositionZ;

    // Render
    render();
    setupUIControls();

}

//Draws a sphere.
const makeSphere = () => {
    // Create a sphere
    const SphereRadius = 1;
    //
    const geometry = new THREE.SphereGeometry(SphereRadius);
    //
    const materials = new THREE.MeshBasicMaterial({color: 0xffffff});
    //
    const sphere = new THREE.Mesh(geometry, materials);
    //
    scene.add(sphere);
    //
    currentObject = sphere;
}

const setupUIControls = () => {

    const speedSlider = document.getElementById('rotation-speed');
    const speedDisplay = document.getElementById('speed-display');

    speedSlider.addEventListener('input', (e) => {
        angle = parseFloat(e.target.value);
        speedDisplay.textContent = angle.toFixed(3);
    });

    const pauseBtn = document.getElementById('pause-btn');

    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? 'Continue' : 'Pause';

        if (isPaused) {
            cancelAnimationFrame(animationId);
        } else {
            render();
        }
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {

        currentObject.rotation.set(0, 0, 0);
        currentObject.position.set(0, 0, 0);
        currentScale = 1;
        currentObject.scale.set(1, 1, 1);

        speedSlider.value = 0.02;
        speedDisplay.textContent = '0.020';
        angle = 0.02;

        isPaused = false;
        pauseBtn.textContent = 'Pause';

        updateInfoDisplay();
    });

    updateInfoDisplay();
};

const updateInfoDisplay = () => {
    document.getElementById('scale-display').textContent = currentScale.toFixed(1);

    document.getElementById('object-count').textContent = scene.children.length;
};

const updateFPS = () => {
    frameCount++;
    const now = performance.now();

    if (now - lastFPSUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFPSUpdate));
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
        document.getElementById('fps-display').textContent = fps;
        frameCount = 0;
        lastFPSUpdate = now;
    }
};


// The render loop.
const render = () => {
    if (isPaused) return;

    //  Apply translation
    currentObject.position.set(mouseX, mouseY);

    //  Apply rotation
    currentObject.rotation.x += angle;
    currentObject.rotation.y += angle;

    // Apply scaling
    currentObject.scale.set(currentScale, currentScale, currentScale);

    updateInfoDisplay();
    updateFPS();

    // Draw the scene
    renderer.render(scene, camera);

    // Make the new frame
    animationId = requestAnimationFrame(render);
}
