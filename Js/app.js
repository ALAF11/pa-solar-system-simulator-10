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

    // Create a camera
    const fov = 75;
    const  near = 0.1;
    const far = 5;

    const aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = cameraPositionZ;

    // Render
    renderer.render(scene, camera);
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

    // TODO: Draw the scene
    renderer.render(scene, camera);

    // Make the new frame
    requestAnimationFrame(render);
}
