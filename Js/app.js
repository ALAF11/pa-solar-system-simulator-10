// On loading the page, run the init function
window.onload = () => init();

//Global variables
let canvas, currentObject, renderer, scene, camera;
const cameraPositionZ = 10;
const angle = 0.02; // rotation in radians
let currentScale = 1; // current scale
let scaleFactor = 0.1; // scale increase/decrease factor
let minScale = 0.3; // minimum size
let maxScale = 2.5; // maximum size
let mouseX, mouseY; // mouse position

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


// The render loop.
const render = () => {
    //  Apply translation
    currentObject.position.set(mouseX, mouseY);

    //  Apply rotation
    currentObject.rotation.x += angle;
    currentObject.rotation.y += angle;

    // Apply scaling
    currentObject.scale.set(currentScale, currentScale, currentScale);

    // Draw the scene
    renderer.render(scene, camera);

    // Make the new frame
    requestAnimationFrame(render);
}
