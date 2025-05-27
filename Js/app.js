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
let cameraControls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false
};
let cameraSpeed = 5;
let isMouseLocked = false;
let cameraRotation = { x: 0, y: 0 };
const mouseSensitivity = 0.002;
let lastTime = 0;
let sun;
let planets = [];
let maxPlanets = 10;
let simulationSpeed = 30;
let textureLoader;
let availableTextures = {};
let texturesLoaded = 0;
let totalTextures = 0;
const PLANET_TEXTURES = ['earth', 'mars', 'jupiter', 'moon'];
const SUN_TEXTURE = 'sun';

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

    createSolarSystem();

    initTextureSystem();

    // Create a camera
    const fov = 75;
    const  near = 0.1;
    const far = 1000;

    const aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 5, cameraPositionZ);
    camera.lookAt(0, 0, 0);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    setupKeyboardControls();
    setupMouseControls();
    setupTextureControls();
    setupObjectSelection();

    // Render
    render();
    setupUIControls();

}

//Create a sun.
const createSun = () => {
    // Remove objeto atual se existir
    if (currentObject) {
        scene.remove(currentObject);
    }

    //geometry
    const sunRadius = 2;
    const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);

    //light
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700, // Dourado
        emissive: 0xFFAA00 // Emissão de luz laranja
    });

    // create mesh
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.name = "Sol";
    scene.add(sun);

    const sunLight = new THREE.PointLight(0xFFFFAA, 2, 100);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    scene.add(sunLight);

    currentObject = sun;
    return sun;
};

const planetData = [
    { name: "Mercúrio", radius: 0.3, orbitRadius: 4, color: 0x8C7853, speed: 2.0 },
    { name: "Vénus", radius: 0.4, orbitRadius: 6, color: 0xFFA500, speed: 1.5 },
    { name: "Terra", radius: 0.5, orbitRadius: 8, color: 0x4169E1, speed: 1.0 },
    { name: "Marte", radius: 0.4, orbitRadius: 10, color: 0xFF4500, speed: 0.8 },
    { name: "Júpiter", radius: 1.2, orbitRadius: 14, color: 0xD2691E, speed: 0.5 }
];

const createPlanet = (planetInfo) => {
    const geometry = new THREE.SphereGeometry(planetInfo.radius, 32, 32);
    const material = new THREE.MeshLambertMaterial({ color: planetInfo.color });
    const planet = new THREE.Mesh(geometry, material);

    planet.userData = {
        name: planetInfo.name,
        orbitRadius: planetInfo.orbitRadius,
        orbitSpeed: planetInfo.speed,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.02 + 0.01,
        originalColor: planetInfo.color,
        currentTexture: null
    };

    // Initial position
    planet.position.x = Math.cos(planet.userData.angle) * planetInfo.orbitRadius;
    planet.position.z = Math.sin(planet.userData.angle) * planetInfo.orbitRadius;

    planet.castShadow = true;
    planet.receiveShadow = true;

    scene.add(planet);
    planets.push(planet);

    return planet;
};

const createSolarSystem = () => {
    // Create Sol
    sun = createSun();

    // Create planets
    planetData.forEach(data => createPlanet(data));

};

const setupUIControls = () => {

    const speedSlider = document.getElementById('rotation-speed');
    const speedDisplay = document.getElementById('speed-display');

    speedSlider.min = 0;
    speedSlider.max = 180;
    speedSlider.value = 30;
    speedSlider.step = 1;

    speedSlider.addEventListener('input', (e) => {
        simulationSpeed = parseFloat(e.target.value);
        speedDisplay.textContent = `${simulationSpeed}°/s`;
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

        if(currentObject) {
            currentObject.rotation.set(0, 0, 0);
            currentObject.position.set(0, 0, 0);
            currentScale = 1;
            currentObject.scale.set(1, 1, 1);
        }

        // Camera reset
        camera.position.set(0, 5, cameraPositionZ);
        camera.rotation.set(0, 0, 0);
        cameraRotation.x = 0;
        cameraRotation.y = 0;

        planets.forEach(planet => {
            planet.userData.angle = Math.random() * Math.PI * 2;
        });

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
    document.getElementById('camera-x').textContent = camera.position.x.toFixed(1);
    document.getElementById('camera-y').textContent = camera.position.y.toFixed(1);
    document.getElementById('camera-z').textContent = camera.position.z.toFixed(1);
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

const setupKeyboardControls = () => {
    document.addEventListener('keydown', (event) => {
        switch(event.code) {
            case 'KeyW':
                cameraControls.moveForward = true;
                event.preventDefault();
                break;
            case 'KeyS':
                cameraControls.moveBackward = true;
                event.preventDefault();
                break;
            case 'KeyA':
                cameraControls.moveLeft = true;
                event.preventDefault();
                break;
            case 'KeyD':
                cameraControls.moveRight = true;
                event.preventDefault();
                break;
            case 'KeyQ':
                cameraControls.moveUp = true;
                event.preventDefault();
                break;
            case 'KeyR':
                cameraControls.moveDown = true;
                event.preventDefault();
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch(event.code) {
            case 'KeyW':
                cameraControls.moveForward = false;
                break;
            case 'KeyS':
                cameraControls.moveBackward = false;
                break;
            case 'KeyA':
                cameraControls.moveLeft = false;
                break;
            case 'KeyD':
                cameraControls.moveRight = false;
                break;
            case 'KeyQ':
                cameraControls.moveUp = false;
                break;
            case 'KeyR':
                cameraControls.moveDown = false;
                break;
        }
    });
};

const updateCameraMovement = (deltaTime) => {
    const moveDistance = cameraSpeed * deltaTime;

    if (cameraControls.moveForward) {
        camera.translateZ(-moveDistance);
    }
    if (cameraControls.moveBackward) {
        camera.translateZ(moveDistance);
    }
    if (cameraControls.moveLeft) {
        camera.translateX(-moveDistance);
    }
    if (cameraControls.moveRight) {
        camera.translateX(moveDistance);
    }
    if (cameraControls.moveUp) {
        camera.translateY(moveDistance);
    }
    if (cameraControls.moveDown) {
        camera.translateY(-moveDistance);
    }
};

const setupMouseControls = () => {
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isMouseLocked = document.pointerLockElement === canvas;
        console.log(isMouseLocked ? 'Mouse locked' : 'Mouse unlocked');
    });

    document.addEventListener('mousemove', (event) => {
        if (isMouseLocked) {
            cameraRotation.y -= event.movementX * mouseSensitivity;
            cameraRotation.x -= event.movementY * mouseSensitivity;

            cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation.x));

            camera.rotation.set(cameraRotation.x, cameraRotation.y, 0);
        }
    });
};

const updatePlanets = (deltaTime) => {
    planets.forEach(planet => {
        const userData = planet.userData;

        userData.angle += userData.orbitSpeed * simulationSpeed * deltaTime * (Math.PI / 180);

        planet.position.x = Math.cos(userData.angle) * userData.orbitRadius;
        planet.position.z = Math.sin(userData.angle) * userData.orbitRadius;

        planet.rotation.y += userData.rotationSpeed;
    });
};

const initTextureSystem = () => {
    textureLoader = new THREE.TextureLoader();

    const textureFiles = {
        earth: 'textures/earth.jpg',
        mars: 'textures/mars.jpg',
        jupiter: 'textures/jupiter.jpg',
        moon: 'textures/moon.jpg',
        sun: 'textures/sun.jpg'
    };

    totalTextures = Object.keys(textureFiles).length;

    loadExternalTextures(textureFiles);
};

const loadExternalTextures = (textureFiles) => {
    Object.entries(textureFiles).forEach(([name, path]) => {
        textureLoader.load(
            path,
            // on load
            (texture) => {

                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                availableTextures[name] = texture;
                texturesLoaded++;

                if (texturesLoaded === totalTextures) {
                    onAllTexturesLoaded();
                }
            },
            // onProgress
            undefined,
            // onError
            (error) => {
                console.warn(`❌ Erro ao carregar textura ${name}:`, error);
                // Cria textura de fallback
                availableTextures[name] = createFallbackTexture(name);
                texturesLoaded++;

                if (texturesLoaded === totalTextures) {
                    onAllTexturesLoaded();
                }
            }
        );
    });
};

const createFallbackTexture = (name) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const colors = {
        earth: '#4169E1',
        mars: '#CD5C5C',
        jupiter: '#D2691E',
        moon: '#C0C0C0',
        sun: '#FFD700'
    };

    ctx.fillStyle = colors[name] || '#808080';
    ctx.fillRect(0, 0, 256, 256);

    return new THREE.CanvasTexture(canvas);
};

const onAllTexturesLoaded = () => {
    updateTextureDropdown();
    applyDefaultTextures();
    updateObjectList();
};

const applyDefaultTextures = () => {

    planets.forEach((planet, index) => {
        const textureIndex = index % PLANET_TEXTURES.length;
        const textureName = PLANET_TEXTURES[textureIndex];

        if (availableTextures[textureName]) {
            applyTextureToPlanet(planet, textureName);
        }
    });

    if (sun && availableTextures[SUN_TEXTURE]) {
        applyTextureToSun(availableTextures[SUN_TEXTURE]);
    }
};

const applyTextureToPlanet = (planet, textureType) => {
    if (textureType === SUN_TEXTURE) {
        return;
    }

    if (!PLANET_TEXTURES.includes(textureType)) {
        return;
    }

    if (!availableTextures[textureType]) {
        return;
    }

    const material = new THREE.MeshLambertMaterial({
        map: availableTextures[textureType]
    });

    planet.material = material;
    planet.userData.currentTexture = textureType;

    updateObjectList();
};

const applyTextureToSun = (texture) => {
    if (!sun) return;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        emissive: 0xFFAA00,
        emissiveIntensity: 0.3
    });

    sun.material = material;
};

const updateTextureDropdown = () => {
    const textureSelect = document.getElementById('texture-select');
    const objectList = document.getElementById('object-list');

    if (!textureSelect) return;

    textureSelect.innerHTML = '<option value="none">Sem Textura</option>';

    const selectedObject = objectList ? objectList.value : '';

    if (!selectedObject || !selectedObject.startsWith('planet-')) {
        return;
    }

    PLANET_TEXTURES.forEach(textureName => {
        if (availableTextures[textureName]) {
            const option = document.createElement('option');
            option.value = textureName;

            const emojis = {
                earth: '🌍',
                mars: '🔴',
                jupiter: '🟠',
                moon: '🌙'
            };

            option.textContent = `${emojis[textureName] || '🪐'} ${textureName.charAt(0).toUpperCase() + textureName.slice(1)}`;
            textureSelect.appendChild(option);
        }
    });
};

const setupTextureControls = () => {
    const textureSelect = document.getElementById('texture-select');
    const applyTextureBtn = document.getElementById('apply-texture');
    const objectList = document.getElementById('object-list');

    if (!textureSelect || !applyTextureBtn || !objectList) {
        return;
    }

    applyTextureBtn.addEventListener('click', () => {
        const selectedObject = objectList.value;
        const selectedTexture = textureSelect.value;

        if (!selectedObject || !selectedObject.startsWith('planet-')) {
            return;
        }

        if (selectedTexture === SUN_TEXTURE) {
            return;
        }

        if (selectedTexture === 'none') {
            removeTextureFromObject(selectedObject);
            return;
        }

        if (!availableTextures[selectedTexture]) {
            return;
        }

        const planet = findObjectByName(selectedObject);
        if (planet) {
            applyTextureToPlanet(planet, selectedTexture);
        }
    });
};

const updateObjectList = () => {
    const objectList = document.getElementById('object-list');
    if (!objectList) return;

    objectList.innerHTML = '<option value="">Selecionar objeto...</option>';


    planets.forEach((planet, index) => {
        const option = document.createElement('option');
        option.value = `planet-${index}`;
        option.textContent = `🪐 ${planet.userData.name}`;
        if (planet.userData.currentTexture) {
            option.textContent += ` (${planet.userData.currentTexture})`;
        }
        objectList.appendChild(option);
    });
};

const removeTextureFromObject = (objectName) => {
    if (!objectName.startsWith('planet-')) {
        return;
    }

    const object = findObjectByName(objectName);
    if (!object) return;

    object.material = new THREE.MeshLambertMaterial({
        color: object.userData.originalColor || 0xffffff
    });
    object.userData.currentTexture = null;

    updateObjectList();
};

const findObjectByName = (objectName) => {

    if (objectName.startsWith('planet-')) {
        const index = parseInt(objectName.split('-')[1]);
        return planets[index];
    }

    return null;
};

const setupObjectSelection = () => {
    const objectList = document.getElementById('object-list');

    if (!objectList) return;

    objectList.addEventListener('change', () => {

        updateTextureDropdown();

        const textureSelect = document.getElementById('texture-select');
        if (textureSelect) {
            textureSelect.value = 'none';
        }
    });
};

const addNewPlanet = (planetInfo) => {

    if (planets.length >= maxPlanets) {
        return;
    }

    const newPlanet = createPlanet(planetInfo);

    const randomTexture = PLANET_TEXTURES[Math.floor(Math.random() * PLANET_TEXTURES.length)];

    if (availableTextures[randomTexture]) {
        applyTextureToPlanet(newPlanet, randomTexture);
    }

    updateObjectList();
};

// The render loop.
const render = (currentTime = 0) => {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (!isPaused) {
        updateCameraMovement(deltaTime);
        updatePlanets(deltaTime);

        if(currentObject){
            //  Apply rotation
            currentObject.rotation.y += angle;
        }
    }

    updateInfoDisplay();
    updateFPS();

    // Draw the scene
    renderer.render(scene, camera);

    // Make the new frame
    animationId = requestAnimationFrame(render);
}
