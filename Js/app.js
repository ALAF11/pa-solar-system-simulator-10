// On loading the page, run the init function
import {OBJLoader} from "./OBJLoader.js";

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
const PLANET_TEXTURES = ['earth', 'mars', 'jupiter', 'mercury','moon', 'neptune', 'venus'];
const SUN_TEXTURE = 'sun';
let loadedModels = [];
let maxModels = 5;
let modelLoader;
let availableModelTypes = {
    satellite: { name: 'satellite', file: 'models/Satellite.obj', scale: 0.5 },
    rocket: { name: 'rocket', file: 'models/rocket.obj', scale: 0.5 },
    spaceman: { name: 'spaceman', file: 'models/spaceman.obj', scale: 0.5 },
    asteroid: { name: 'asteroid', file: 'models/asteroid.obj', scale: 0.4 },
    probe: { name: 'probe', file: 'models/probe.obj', scale: 0.2 }
};
let selectedObject = null;
let selectedObjectType = null;
let sunLight;
let skyboxSphere = null;
let planetLabels = [];
let orbitLines = [];
let comets = [];
let maxComets = 5;
let labelsContainer;

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

    setupBackground();

    createSolarSystem();
    initTextureSystem();
    initModelSystem();

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
    setupModelControls();

    // Render
    render();
    setupUIControls();
    setupObjectEditor();

}

//Create a sun.
const createSun = () => {
    // Remove objeto atual se existir
    if (currentObject) {
        scene.remove(currentObject);
    }

    if (sunLight) {
        scene.remove(sunLight);
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

    sunLight = new THREE.PointLight(0xFFFFAA, 2, 100);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    scene.add(sunLight);

    currentObject = sun;
    return sun;
};

const createPlanet = (planetInfo) => {
    const geometry = new THREE.SphereGeometry(planetInfo.radius, 32, 32);
    const material = new THREE.MeshLambertMaterial({ color: planetInfo.color });
    const planet = new THREE.Mesh(geometry, material);

    planet.userData = {
        name: planetInfo.name,
        semiMajorAxis: planetInfo.semiMajorAxis,
        eccentricity: planetInfo.eccentricity,
        inclination: planetInfo.inclination * Math.PI / 180,
        orbitSpeed: planetInfo.speed,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.02 + 0.01,
        originalColor: planetInfo.color,
        currentTexture: null,
        orbitRadius: planetInfo.semiMajorAxis
    };

    const position = calculateEllipticalPosition(planet.userData);
    planet.position.set(position.x, position.y, position.z);

    planet.castShadow = true;
    planet.receiveShadow = true;

    scene.add(planet);
    planets.push(planet);

    return planet;
};

const calculateEllipticalPosition = (userData) => {
    const { semiMajorAxis, eccentricity, angle, inclination } = userData;

    const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

    const x = semiMajorAxis * Math.cos(angle);
    const z = semiMinorAxis * Math.sin(angle);

    const inclinationRad = inclination || 0;
    const xFinal = x * Math.cos(inclinationRad);
    const yFinal = x * Math.sin(inclinationRad);
    const zFinal = z;

    return { x: xFinal, y: yFinal, z: zFinal };
};

const createSolarSystem = () => {
    // Create Sol
    sun = createSun();

    initLabelsContainer();

    // Create planets
    planetData.forEach(data => {
        const planet = createPlanet(data);
        createPlanetLabel(planet);
    });

    createOrbitVisualization();

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

    document.getElementById('add-planet').addEventListener('click', addPlanet);

    document.getElementById('remove-object').addEventListener('click', removePlanet);

    updateInfoDisplay();

    setupMoonControls();
    setupCometControls();
};

const updateInfoDisplay = () => {
    document.getElementById('scale-display').textContent = currentScale.toFixed(1);
    document.getElementById('object-count').textContent = scene.children.length;
    document.getElementById('camera-x').textContent = camera.position.x.toFixed(1);
    document.getElementById('camera-y').textContent = camera.position.y.toFixed(1);
    document.getElementById('camera-z').textContent = camera.position.z.toFixed(1);

    updatePlanetCounter();
    updateModelCounter();
    updateCometCounter();
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

        const position = calculateEllipticalPosition(userData);
        planet.position.set(position.x, position.y, position.z);

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
        sun: 'textures/sun.jpg',
        mercury: 'textures/mercury.jpg',
        neptune: 'textures/neptune.jpg',
        venus: 'textures/venus.jpg',
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
        sun: '#FFD700',
        mercury: '#bfc7c1',
        neptune: '#5e99db',
        venus: '#ed802d'
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

    const planetTextureMap = {
        "Mercúrio": "mercury",
        "Vénus": "venus",
        "Terra": "earth",
        "Marte": "mars",
        "Júpiter": "jupiter"
    };

    planets.forEach((planet) => {
        const planetName = planet.userData.name;
        const textureName = planetTextureMap[planetName];

        if (textureName && availableTextures[textureName]) {
            applyTextureToPlanet(planet, textureName);
        } else {

            const randomTexture = PLANET_TEXTURES[Math.floor(Math.random() * PLANET_TEXTURES.length)];
            if (availableTextures[randomTexture]) {
                applyTextureToPlanet(planet, randomTexture);
            }
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
                jupiter: '🌑',
                moon: '🌙',
                mercury: '⚪',
                neptune: '🔵',
                venus: '🟠'
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

    if (sun) {
        const option = document.createElement('option');
        option.value = 'sun';
        option.textContent = '☀️ Sol';
        objectList.appendChild(option);
    }

    planets.forEach((planet, index) => {
        const option = document.createElement('option');
        option.value = `planet-${index}`;
        option.textContent = `🪐 ${planet.userData.name}`;
        if (planet.userData.currentTexture) {
            option.textContent += ` (${planet.userData.currentTexture})`;
        }
        objectList.appendChild(option);

        if (planet.userData.moons && planet.userData.moons.length > 0) {
            planet.userData.moons.forEach((moon, moonIndex) => {
                const moonOption = document.createElement('option');
                moonOption.value = `moon-${index}-${moonIndex}`;
                moonOption.textContent = `🌙 ${moon.userData.name} (${planet.userData.name})`;
                objectList.appendChild(moonOption);
            });
        }
    });

    comets.forEach((comet, index) => {
        const option = document.createElement('option');
        option.value = `comet-${index}`;
        option.textContent = `☄️ ${comet.userData.name}`;
        objectList.appendChild(option);
    });


    loadedModels.forEach((model, index) => {
        const option = document.createElement('option');
        option.value = `model-${index}`;
        option.textContent = `🚀 ${model.userData.name}`;
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

    if (objectName === 'sun') {
        return sun;
    }

    if (objectName.startsWith('planet-')) {
        const index = parseInt(objectName.split('-')[1]);
        return planets[index];
    }

    if (objectName.startsWith('model-')) {
        const index = parseInt(objectName.split('-')[1]);
        return loadedModels[index];
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

const addPlanet = () => {
    if (planets.length >= maxPlanets) {
        alert('Máximo de planetas atingido (10)');
        return;
    }

    // Pedir nome personalizado ao utilizador
    const planetName = prompt('Insira o nome do novo planeta:', `Planeta-${planets.length + 1}`);

    // Se o utilizador cancelar ou inserir nome vazio
    if (!planetName || planetName.trim() === '') {
        return;
    }

    // Verificar se o nome já existe
    const nameExists = planets.some(planet =>
        planet.userData.name.toLowerCase() === planetName.trim().toLowerCase()
    );

    if (nameExists) {
        alert('Já existe um planeta com esse nome. Escolha outro nome.');
        return;
    }

    const nextOrbitRadius = calculateNextOrbitRadius();
    const newPlanetData = generateRandomPlanetData(nextOrbitRadius, planetName.trim());
    const newPlanet = createPlanet(newPlanetData);

    // Criar label para o planeta
    createPlanetLabel(newPlanet);

    const randomTexture = PLANET_TEXTURES[Math.floor(Math.random() * PLANET_TEXTURES.length)];
    if (availableTextures[randomTexture]) {
        applyTextureToPlanet(newPlanet, randomTexture);
    }

    updateObjectList();
    updateInfoDisplay();
};


const calculateNextOrbitRadius = () => {
    if (planets.length === 0) {
        return 4;
    }

    const maxCurrentRadius = Math.max(...planets.map(p => p.userData.semiMajorAxis || p.userData.orbitRadius));

    return maxCurrentRadius + 3;
};

const generateRandomPlanetData = (orbitRadius, customName = null) => {
    const planetNames = [
        "Kepler-442b", "HD 40307g", "Gliese 667Cc", "Kepler-438b",
        "Wolf 1061c", "Proxima Centauri b", "Trappist-1e", "LHS 1140b",
        "K2-18b", "TOI-715b"
    ];

    const planetColors = [
        0x4169E1, 0xFF4500, 0x32CD32, 0xFFD700, 0x9370DB,
        0xFF6347, 0x20B2AA, 0xDDA0DD, 0xF0E68C, 0x87CEEB
    ];

    // Usar nome personalizado se fornecido, senão usar nome automático
    let finalName;
    if (customName) {
        finalName = customName;
    } else {
        const usedNames = planets.map(p => p.userData.name);
        const availableNames = planetNames.filter(name => !usedNames.includes(name));
        finalName = availableNames.length > 0 ?
            availableNames[Math.floor(Math.random() * availableNames.length)] :
            `Planeta-${planets.length + 1}`;
    }

    return {
        name: finalName,
        radius: 0.3 + Math.random() * 0.8,
        semiMajorAxis: orbitRadius,
        eccentricity: Math.random() * 0.3,
        orbitRadius: orbitRadius,
        color: planetColors[Math.floor(Math.random() * planetColors.length)],
        speed: 0.3 + Math.random() * 1.5,
        inclination: Math.random() * 10
    };
};


const removePlanet = () => {
    const objectList = document.getElementById('object-list');
    const selectedObject = objectList.value;

    if (!selectedObject) {
        alert('Selecione um objeto para remover.');
        return;
    }

    if (selectedObject.startsWith('comet-')) {
        const cometIndex = parseInt(selectedObject.split('-')[1]);
        const comet = comets[cometIndex];

        const confirmRemoval = confirm(`Remover cometa "${comet.userData.name}"?`);
        if (!confirmRemoval) return;

        const success = removeComet(cometIndex);
        if (success) {
            updateObjectList();
            updateInfoDisplay();
            objectList.value = '';
        }
        return;
    }

    if (selectedObject.startsWith('moon-')) {
        const parts = selectedObject.split('-');
        const planetIndex = parseInt(parts[1]);
        const moonIndex = parseInt(parts[2]);

        const planet = planets[planetIndex];
        const moon = planet.userData.moons[moonIndex];

        const confirmRemoval = confirm(`Remover lua "${moon.userData.name}" do planeta "${planet.userData.name}"?`);
        if (!confirmRemoval) return;

        const success = removeMoonFromPlanet(planetIndex, moonIndex);
        if (success) {
            updateObjectList();
            updateInfoDisplay();
            objectList.value = '';

            const parentSelect = document.getElementById('parent-planet-select');
            if (parentSelect) {
                setupMoonControls();
            }
        }
        return;
    }

    if (!selectedObject.startsWith('planet-')) {
        alert('Selecione um planeta para remover.');
        return;
    }

    const planetIndex = parseInt(selectedObject.split('-')[1]);
    const planet = planets[planetIndex];

    if (!planet) {
        return;
    }

    const confirmRemoval = confirm(`Remover planeta "${planet.userData.name}"?`);
    if (!confirmRemoval) return;


    if (planet.userData.moons && planet.userData.moons.length > 0) {
        planet.userData.moons.forEach(moon => {
            scene.remove(moon);
        });
        planet.userData.moons = [];
    }

    removePlanetLabel(planet);
    scene.remove(planet);
    planets.splice(planetIndex, 1);

    updateObjectList();
    updateInfoDisplay();
    objectList.value = '';
};



const updatePlanetCounter = () => {
    const planetCountElement = document.getElementById('planet-count');
    if (planetCountElement) {
        planetCountElement.textContent = planets.length;
    }

    const maxOrbitElement = document.getElementById('max-orbit');
    if (maxOrbitElement) {
        if (planets.length > 0) {
            const maxOrbit = Math.max(...planets.map(p => p.userData.semiMajorAxis || p.userData.orbitRadius));
            maxOrbitElement.textContent = maxOrbit.toFixed(1);
        } else {
            maxOrbitElement.textContent = '0.0';
        }
    }
};

const updateModelCounter = () => {
    const modelCountElement = document.getElementById('model-count');
    if (modelCountElement) {
        modelCountElement.textContent = loadedModels.length;
    }
};

const initModelSystem = () => {

    setTimeout(() => {
        if (window.THREE && window.THREE.OBJLoader) {
            modelLoader = new THREE.OBJLoader();
            console.log('OBJLoader inicializado com sucesso');
        } else {
            console.warn('OBJLoader não disponível - usando fallbacks');
        }
        updateModelDropdown();
    }, 100);
};

const loadModel = (modelType) => {
    if (loadedModels.length >= maxModels) {
        return;
    }

    const modelInfo = availableModelTypes[modelType];
    if (!modelInfo) {
        return;
    }

    if (!modelLoader) {
        const fallbackModel = createFallbackModel(modelInfo, modelType);
        loadedModels.push(fallbackModel);
        updateObjectList();
        updateInfoDisplay();
        return;
    }

    modelLoader.load(
        modelInfo.file,
        // onLoad
        (object) => {
            const model = setupLoadedModel(object, modelInfo, modelType);
            loadedModels.push(model);
            updateObjectList();
            updateInfoDisplay();
        },
        // onProgress
        undefined,
        // onError
        (error) => {
            const fallbackModel = createFallbackModel(modelInfo, modelType);
            loadedModels.push(fallbackModel);
            updateObjectList();
            updateInfoDisplay();
        }
    );
};


const setupLoadedModel = (object, modelInfo, modelType) => {

    object.scale.setScalar(modelInfo.scale);

    const randomX = (Math.random() - 0.5) * 40;
    const randomY = (Math.random() - 0.5) * 10;
    const randomZ = (Math.random() - 0.5) * 40;

    object.position.set(randomX, randomY, randomZ);

    object.userData = {
        name: `${modelInfo.name}-${loadedModels.length + 1}`,
        type: 'model',
        modelType: modelType,
        isStatic: true,
        rotationSpeed: {
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.01
        },
        originalScale: modelInfo.scale,
        currentScale: modelInfo.scale
    };

    object.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshLambertMaterial({
                color: 0xaaaaaa,
                wireframe: false
            });
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(object);
    return object;
};

const createFallbackModel = (modelInfo, modelType) => {
    let geometry;
    switch(modelType) {
        case 'satellite':
            geometry = new THREE.BoxGeometry(0.5, 0.2, 0.5);
            break;
        case 'rocket':
            geometry = new THREE.ConeGeometry(0.2, 1, 8);
            break;
        case 'spaceman':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 8);
            break;
        default:
            geometry = new THREE.IcosahedronGeometry(0.3);
    }

    const material = new THREE.MeshLambertMaterial({
        color: 0x666666,
        wireframe: true
    });

    const model = new THREE.Mesh(geometry, material);

    return setupLoadedModel(model, modelInfo, modelType);
};

const updateModels = (deltaTime) => {
    loadedModels.forEach(model => {
        const userData = model.userData;

        if (userData.rotationSpeed) {
            model.rotation.x += userData.rotationSpeed.x;
            model.rotation.y += userData.rotationSpeed.y;
            model.rotation.z += userData.rotationSpeed.z;
        }

    });
};

const setupModelControls = () => {
    const modelSelect = document.getElementById('model-select');
    const loadModelBtn = document.getElementById('load-model');

    if (!modelSelect || !loadModelBtn) return;

    loadModelBtn.addEventListener('click', () => {
        const selectedModel = modelSelect.value;

        if (!selectedModel) {
            return;
        }

        loadModel(selectedModel);
    });
};

const updateModelDropdown = () => {
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) return;

    modelSelect.innerHTML = '<option value="">Selecionar modelo...</option>';

    Object.entries(availableModelTypes).forEach(([key, info]) => {
        const option = document.createElement('option');
        option.value = key;

        const emojis = {
            satellite: '🛰️',
            rocket: '🚀',
            spaceman: '🏭',
            asteroid: '🪨',
            probe: '🚀'
        };

        option.textContent = `${emojis[key] || '🔧'} ${info.name}`;
        modelSelect.appendChild(option);
    });
};

const generateRandomStaticPosition = () => {

    const minDistance = 18;
    const maxDistance = 35;

    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);

    return {
        x: Math.cos(angle) * distance,
        y: (Math.random() - 0.5) * 8,
        z: Math.sin(angle) * distance
    };
};

const setupObjectEditor = () => {
    const objectList = document.getElementById('object-list');

    if (!objectList) return;

    objectList.addEventListener('change', (e) => {
        const selectedValue = e.target.value;

        if (!selectedValue) {
            hideObjectEditor();
            return;
        }

        showObjectEditor(selectedValue);
    });

    setupEditorControls();
};

const showObjectEditor = (objectValue) => {
    const editor = document.getElementById('object-editor');
    const planetControls = document.getElementById('planet-controls');
    const sunControls = document.getElementById('sun-controls');
    const objectInfo = document.getElementById('selected-object-name');

    if (!editor) return;

    planetControls.style.display = 'none';
    sunControls.style.display = 'none';

    if (objectValue === 'sun') {
        selectedObject = sun;
        selectedObjectType = 'sun';
        objectInfo.textContent = 'Sol';
        sunControls.style.display = 'block';
        loadSunControls();
    } else if (objectValue.startsWith('planet-')) {
        const planetIndex = parseInt(objectValue.split('-')[1]);
        selectedObject = planets[planetIndex];
        selectedObjectType = 'planet';
        objectInfo.textContent = selectedObject.userData.name;
        planetControls.style.display = 'block';
        loadPlanetControls();
    }

    editor.style.display = 'block';
};

const hideObjectEditor = () => {
    const editor = document.getElementById('object-editor');
    if (editor) {
        editor.style.display = 'none';
    }
    selectedObject = null;
    selectedObjectType = null;
};

const loadPlanetControls = () => {
    if (!selectedObject || selectedObjectType !== 'planet') return;

    const userData = selectedObject.userData;

    document.getElementById('orbit-speed').value = userData.orbitSpeed || 1.0;
    document.getElementById('orbit-speed-display').textContent = (userData.orbitSpeed || 1.0).toFixed(1);

    document.getElementById('planet-scale').value = selectedObject.scale.x;
    document.getElementById('planet-scale-display').textContent = selectedObject.scale.x.toFixed(1);

    const rotationX = (selectedObject.rotation.x * 180 / Math.PI) % 360;
    const rotationY = (selectedObject.rotation.y * 180 / Math.PI) % 360;
    const rotationZ = (selectedObject.rotation.z * 180 / Math.PI) % 360;

    document.getElementById('rotation-x').value = Math.round(rotationX);
    document.getElementById('rotation-x-display').textContent = Math.round(rotationX) + '°';

    document.getElementById('rotation-y').value = Math.round(rotationY);
    document.getElementById('rotation-y-display').textContent = Math.round(rotationY) + '°';

    document.getElementById('rotation-z').value = Math.round(rotationZ);
    document.getElementById('rotation-z-display').textContent = Math.round(rotationZ) + '°';
};

const loadSunControls = () => {
    if (!selectedObject || selectedObjectType !== 'sun' || !sunLight) return;

    document.getElementById('sun-intensity').value = sunLight.intensity;
    document.getElementById('sun-intensity-display').textContent = sunLight.intensity.toFixed(1);

    const color = sunLight.color.getHex();
    document.getElementById('sun-color').value = '#' + color.toString(16).padStart(6, '0');
};

const setupEditorControls = () => {

    const orbitSpeedSlider = document.getElementById('orbit-speed');
    const planetScaleSlider = document.getElementById('planet-scale');
    const rotationXSlider = document.getElementById('rotation-x');
    const rotationYSlider = document.getElementById('rotation-y');
    const rotationZSlider = document.getElementById('rotation-z');

    const sunIntensitySlider = document.getElementById('sun-intensity');
    const sunColorPicker = document.getElementById('sun-color');

    if (orbitSpeedSlider) {
        orbitSpeedSlider.addEventListener('input', (e) => {
            document.getElementById('orbit-speed-display').textContent = parseFloat(e.target.value).toFixed(1);
        });
    }

    if (planetScaleSlider) {
        planetScaleSlider.addEventListener('input', (e) => {
            document.getElementById('planet-scale-display').textContent = parseFloat(e.target.value).toFixed(1);
        });
    }

    if (rotationXSlider) {
        rotationXSlider.addEventListener('input', (e) => {
            document.getElementById('rotation-x-display').textContent = e.target.value + '°';
        });
    }

    if (rotationYSlider) {
        rotationYSlider.addEventListener('input', (e) => {
            document.getElementById('rotation-y-display').textContent = e.target.value + '°';
        });
    }

    if (rotationZSlider) {
        rotationZSlider.addEventListener('input', (e) => {
            document.getElementById('rotation-z-display').textContent = e.target.value + '°';
        });
    }

    if (sunIntensitySlider) {
        sunIntensitySlider.addEventListener('input', (e) => {
            document.getElementById('sun-intensity-display').textContent = parseFloat(e.target.value).toFixed(1);
        });
    }

    const applyBtn = document.getElementById('apply-changes');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyObjectChanges);
    }

    const resetBtn = document.getElementById('reset-object');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSelectedObject);
    }
};

const applyObjectChanges = () => {
    if (!selectedObject) return;

    if (selectedObjectType === 'planet') {

        const newOrbitSpeed = parseFloat(document.getElementById('orbit-speed').value);
        selectedObject.userData.orbitSpeed = newOrbitSpeed;

        const newScale = parseFloat(document.getElementById('planet-scale').value);
        selectedObject.scale.setScalar(newScale);

        const rotX = parseFloat(document.getElementById('rotation-x').value) * Math.PI / 180;
        const rotY = parseFloat(document.getElementById('rotation-y').value) * Math.PI / 180;
        const rotZ = parseFloat(document.getElementById('rotation-z').value) * Math.PI / 180;

        selectedObject.rotation.set(rotX, rotY, rotZ);

    } else if (selectedObjectType === 'sun' && sunLight) {

        const newIntensity = parseFloat(document.getElementById('sun-intensity').value);
        sunLight.intensity = newIntensity;

        const newColor = document.getElementById('sun-color').value;
        sunLight.color.setHex(parseInt(newColor.replace('#', ''), 16));

    }
};

const resetSelectedObject = () => {
    if (!selectedObject) return;

    if (selectedObjectType === 'planet') {

        selectedObject.userData.orbitSpeed = planetData.find(p => p.name === selectedObject.userData.name)?.speed || 1.0;
        selectedObject.scale.setScalar(1.0);
        selectedObject.rotation.set(0, 0, 0);

        loadPlanetControls();

    } else if (selectedObjectType === 'sun' && sunLight) {

        sunLight.intensity = 2.0;
        sunLight.color.setHex(0xFFFFAA);

        loadSunControls();
    }
};

const setupBackground = () => {
    const loader = new THREE.TextureLoader();

    loader.load(
        'stars_milky.jpg',
        function(texture) {
            createSkyboxSphere(texture);
        }
    );
};

const createSkyboxSphere = (texture) => {
    if (skyboxSphere) {
        scene.remove(skyboxSphere);
    }

    const skyboxGeometry = new THREE.SphereGeometry(500, 60, 40);

    const skyboxMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        fog: false
    });

    skyboxSphere = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    skyboxSphere.name = "Skybox";

    scene.add(skyboxSphere);
};

const updateSkybox = () => {
    if (skyboxSphere && camera) {

        skyboxSphere.position.copy(camera.position);
    }
};

const initLabelsContainer = () => {
    labelsContainer = document.getElementById('planet-labels-container');
    if (!labelsContainer) {
        console.error('Container de labels não encontrado');
        return false;
    }
    return true;
};


const createPlanetLabel = (planet) => {
    if (!labelsContainer) {
        console.warn('Container de labels não inicializado');
        return null;
    }

    const labelElement = document.createElement('div');
    labelElement.className = 'planet-label';
    labelElement.textContent = planet.userData.name;
    labelElement.id = `label-${planet.userData.name.replace(/\s+/g, '-')}`;

    labelsContainer.appendChild(labelElement);

    const labelData = {
        element: labelElement,
        planet: planet,
        visible: true
    };

    planetLabels.push(labelData);
    console.log(`Label criado para planeta: ${planet.userData.name}`);

    return labelData;
};

const worldToScreen = (worldPosition, camera, canvas) => {
    const vector = worldPosition.clone();
    vector.project(camera);

    const screenX = (vector.x + 1) * canvas.width / 2;
    const screenY = (-vector.y + 1) * canvas.height / 2;
    const screenZ = vector.z;

    return {
        x: screenX,
        y: screenY,
        z: screenZ,
        inFront: screenZ < 1 && screenZ > -1
    };
};


const updatePlanetLabels = () => {
    if (!labelsContainer || !camera) return;

    planetLabels.forEach(labelData => {
        const planet = labelData.planet;
        const labelElement = labelData.element;

        const planetWorldPosition = new THREE.Vector3();
        planet.getWorldPosition(planetWorldPosition);

        const labelPosition = planetWorldPosition.clone();
        labelPosition.y += planet.geometry.parameters.radius + 0.5;

        const screenPos = worldToScreen(labelPosition, camera, canvas);

        const isVisible = screenPos.inFront &&
            screenPos.x >= 0 && screenPos.x <= canvas.width &&
            screenPos.y >= 0 && screenPos.y <= canvas.height;

        if (isVisible) {
            labelElement.style.left = `${screenPos.x}px`;
            labelElement.style.top = `${screenPos.y}px`;
            labelElement.classList.remove('hidden');
        } else {
            labelElement.classList.add('hidden');
        }
    });
};


const removePlanetLabel = (planet) => {
    const labelIndex = planetLabels.findIndex(label => label.planet === planet);

    if (labelIndex !== -1) {
        const labelData = planetLabels[labelIndex];

        if (labelData.element && labelData.element.parentNode) {
            labelData.element.parentNode.removeChild(labelData.element);
        }

        planetLabels.splice(labelIndex, 1);

        console.log(`Label removido para planeta: ${planet.userData.name}`);
    }
};

const clearAllLabels = () => {
    planetLabels.forEach(labelData => {
        if (labelData.element && labelData.element.parentNode) {
            labelData.element.parentNode.removeChild(labelData.element);
        }
    });
    planetLabels = [];
};

const planetData = [
    {
        name: "Mercúrio",
        radius: 0.3,
        semiMajorAxis: 4,
        eccentricity: 0.2,
        color: 0x8C7853,
        speed: 2.0,
        inclination: 0
    },
    {
        name: "Vénus",
        radius: 0.4,
        semiMajorAxis: 6,
        eccentricity: 0.01,
        color: 0xFFA500,
        speed: 1.5,
        inclination: 3.4
    },
    {
        name: "Terra",
        radius: 0.5,
        semiMajorAxis: 8,
        eccentricity: 0.017,
        color: 0x4169E1,
        speed: 1.0,
        inclination: 0
    },
    {
        name: "Marte",
        radius: 0.4,
        semiMajorAxis: 10,
        eccentricity: 0.09,
        color: 0xFF4500,
        speed: 0.8,
        inclination: 1.85
    },
    {
        name: "Júpiter",
        radius: 1.2,
        semiMajorAxis: 14,
        eccentricity: 0.05,
        color: 0xD2691E,
        speed: 0.5,
        inclination: 1.3
    }
];

const createOrbitVisualization = () => {
    planetData.forEach((data, index) => {
        const points = [];
        const segments = 100;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const tempUserData = {
                semiMajorAxis: data.semiMajorAxis,
                eccentricity: data.eccentricity,
                inclination: data.inclination * Math.PI / 180,
                angle: angle
            };

            const position = calculateEllipticalPosition(tempUserData);
            points.push(new THREE.Vector3(position.x, position.y, position.z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.6
        });

        const orbitLine = new THREE.Line(geometry, material);
        orbitLine.name = `orbit-${data.name}`;
        orbitLine.userData = {
            baseOpacity: 0.6,
            pulseSpeed: 1 + Math.random() * 2
        };

        scene.add(orbitLine);
        orbitLines.push(orbitLine);
    });
};


const updateOrbitLines = (currentTime) => {
    orbitLines.forEach(line => {
        const userData = line.userData;
        const pulse = Math.sin(currentTime * userData.pulseSpeed * 0.001) * 0.3 + 0.7;
        line.material.opacity = userData.baseOpacity * pulse;
    });
};


const createMoon = (name, size, orbitRadius, orbitSpeed, textureName, parentPlanet) => {
    const geometry = new THREE.SphereGeometry(size, 16, 16);

    let material;
    if (textureName && availableTextures[textureName]) {
        material = new THREE.MeshLambertMaterial({ map: availableTextures[textureName] });
    } else {
        material = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    }

    const moon = new THREE.Mesh(geometry, material);

    moon.userData = {
        name: name,
        type: 'moon',
        parentPlanet: parentPlanet,
        orbitRadius: orbitRadius,
        orbitSpeed: orbitSpeed,
        orbitAngle: Math.random() * Math.PI * 2,
        rotationSpeed: Math.random() * 0.02 + 0.01,
        originalColor: 0xcccccc,
        currentTexture: textureName
    };

    moon.castShadow = true;
    moon.receiveShadow = true;

    scene.add(moon);

    return moon;
};


const addMoonToPlanet = (planetIndex, moonName, moonSize = 0.3, textureName = 'moon') => {
    if (planetIndex < 0 || planetIndex >= planets.length) {
        return false;
    }

    const planet = planets[planetIndex];

    if (!planet.userData.moons) {
        planet.userData.moons = [];
    }

    if (planet.userData.moons.length >= 3) {
        return false;
    }

    const planetRadius = planet.geometry.parameters.radius * planet.scale.x;
    const baseRadius = planetRadius * 2.5;
    const orbitRadius = baseRadius + (planet.userData.moons.length * planetRadius);

    const orbitSpeed = 1 + Math.random() * 2;

    const moon = createMoon(moonName, moonSize, orbitRadius, orbitSpeed, textureName, planet);

    planet.userData.moons.push(moon);

    return true;
};


const removeMoonFromPlanet = (planetIndex, moonIndex) => {
    if (planetIndex < 0 || planetIndex >= planets.length) return false;

    const planet = planets[planetIndex];
    if (!planet.userData.moons || moonIndex < 0 || moonIndex >= planet.userData.moons.length) {
        return false;
    }

    const moon = planet.userData.moons[moonIndex];
    scene.remove(moon);
    planet.userData.moons.splice(moonIndex, 1);

    updateObjectList();
    return true;
};


const updateMoons = (deltaTime) => {
    planets.forEach(planet => {
        if (!planet.userData.moons) return;

        planet.userData.moons.forEach(moon => {
            const userData = moon.userData;
            const parentPlanet = userData.parentPlanet;

            userData.orbitAngle += userData.orbitSpeed * simulationSpeed * deltaTime * (Math.PI / 180);

            const x = Math.cos(userData.orbitAngle) * userData.orbitRadius;
            const z = Math.sin(userData.orbitAngle) * userData.orbitRadius;

            moon.position.set(
                parentPlanet.position.x + x,
                parentPlanet.position.y,
                parentPlanet.position.z + z
            );

            moon.rotation.y += userData.rotationSpeed;
        });
    });
};


const setupMoonControls = () => {
    const parentPlanetSelect = document.getElementById('parent-planet-select');
    const moonSizeSlider = document.getElementById('moon-size');
    const addMoonBtn = document.getElementById('add-moon-btn');
    const removeMoonSelect = document.getElementById('moon-to-remove');
    const removeMoonBtn = document.getElementById('remove-moon-btn');


    const updateParentPlanetDropdown = () => {
        parentPlanetSelect.innerHTML = '<option value="">Selecionar planeta...</option>';
        planets.forEach((planet, index) => {
            const moonCount = planet.userData.moons ? planet.userData.moons.length : 0;
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${planet.userData.name} (${moonCount}/3 luas)`;
            parentPlanetSelect.appendChild(option);
        });
    };

    const updateMoonRemovalDropdown = () => {
        if (!removeMoonSelect) return;

        removeMoonSelect.innerHTML = '<option value="">Selecionar lua...</option>';

        planets.forEach((planet, planetIndex) => {
            if (planet.userData.moons && planet.userData.moons.length > 0) {
                planet.userData.moons.forEach((moon, moonIndex) => {
                    const option = document.createElement('option');
                    option.value = `${planetIndex}-${moonIndex}`;
                    option.textContent = `${moon.userData.name} (${planet.userData.name})`;
                    removeMoonSelect.appendChild(option);
                });
            }
        });
    };

    if (moonSizeSlider) {
        moonSizeSlider.addEventListener('input', (e) => {
            document.getElementById('moon-size-display').textContent = e.target.value;
        });
    }

    if (addMoonBtn) {
        addMoonBtn.addEventListener('click', () => {
            const planetIndex = parseInt(parentPlanetSelect.value);
            const moonName = document.getElementById('moon-name').value.trim();
            const moonSize = parseFloat(moonSizeSlider.value);

            if (isNaN(planetIndex) || !moonName) {
                return;
            }

            const success = addMoonToPlanet(planetIndex, moonName, moonSize, 'moon');
            if (success) {
                document.getElementById('moon-name').value = '';
                updateParentPlanetDropdown();
                updateMoonRemovalDropdown();
                updateObjectList();
            }
        });
    }

    if (removeMoonBtn) {
        removeMoonBtn.addEventListener('click', () => {
            const selectedValue = removeMoonSelect.value;

            if (!selectedValue) {
                return;
            }

            const [planetIndex, moonIndex] = selectedValue.split('-').map(Number);
            const planet = planets[planetIndex];
            const moon = planet.userData.moons[moonIndex];

            const confirmRemoval = confirm(`Remover lua "${moon.userData.name}" do planeta "${planet.userData.name}"?`);
            if (!confirmRemoval) return;

            const success = removeMoonFromPlanet(planetIndex, moonIndex);
            if (success) {
                updateParentPlanetDropdown();
                updateMoonRemovalDropdown();
                updateObjectList();
                removeMoonSelect.value = '';
            }
        });
    }

    updateParentPlanetDropdown();
    updateMoonRemovalDropdown();
};

const createComet = (name, orbitRadius, orbitSpeed, lightColor = 0x00ffff, lightIntensity = 1, lightDistance = 20) => {
    // Geometria visual do cometa (núcleo pequeno)
    const cometGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const cometMaterial = new THREE.MeshBasicMaterial({
        color: lightColor,
        emissive: lightColor,
        emissiveIntensity: 0.3
    });

    const cometMesh = new THREE.Mesh(cometGeometry, cometMaterial);

    // Luz do cometa
    const cometLight = new THREE.PointLight(lightColor, lightIntensity, lightDistance);
    cometLight.castShadow = true;

    // Grupo para conter mesh e luz
    const cometGroup = new THREE.Group();
    cometGroup.add(cometMesh);
    cometGroup.add(cometLight);

    // Dados do cometa
    cometGroup.userData = {
        name: name,
        type: 'comet',
        orbitRadius: orbitRadius,
        orbitSpeed: orbitSpeed,
        orbitAngle: Math.random() * Math.PI * 2, // Posição inicial aleatória
        lightColor: lightColor,
        lightIntensity: lightIntensity,
        lightDistance: lightDistance,
        mesh: cometMesh,
        light: cometLight,
        originalColor: lightColor
    };

    // Posição inicial
    const x = Math.cos(cometGroup.userData.orbitAngle) * orbitRadius;
    const z = Math.sin(cometGroup.userData.orbitAngle) * orbitRadius;
    cometGroup.position.set(x, 0, z);

    scene.add(cometGroup);
    comets.push(cometGroup);

    return cometGroup;
};

const addComet = (cometName, orbitRadius, orbitSpeed, colorHex = '#00ffff', intensity = 1, distance = 20) => {
    if (comets.length >= maxComets) {
        alert(`Máximo de ${maxComets} cometas atingido`);
        return false;
    }

    // Verificar se o nome já existe
    const nameExists = comets.some(comet =>
        comet.userData.name.toLowerCase() === cometName.toLowerCase()
    );

    if (nameExists) {
        alert('Já existe um cometa com esse nome');
        return false;
    }

    // Converter cor hex para number
    const lightColor = parseInt(colorHex.replace('#', ''), 16);

    const comet = createComet(cometName, orbitRadius, orbitSpeed, lightColor, intensity, distance);

    updateObjectList();
    updateInfoDisplay();

    console.log(`Cometa ${cometName} adicionado ao sistema`);
    return true;
};

const removeComet = (cometIndex) => {
    if (cometIndex < 0 || cometIndex >= comets.length) {
        return false;
    }

    const comet = comets[cometIndex];
    scene.remove(comet);
    comets.splice(cometIndex, 1);

    updateObjectList();
    updateInfoDisplay();

    return true;
};


const updateComets = (deltaTime) => {
    comets.forEach(comet => {
        const userData = comet.userData;

        // Atualizar ângulo orbital
        userData.orbitAngle += userData.orbitSpeed * simulationSpeed * deltaTime * (Math.PI / 180);

        // Calcular nova posição
        const x = Math.cos(userData.orbitAngle) * userData.orbitRadius;
        const z = Math.sin(userData.orbitAngle) * userData.orbitRadius;

        comet.position.set(x, 0, z);

        // Pulsação da luz (efeito visual)
        const pulseIntensity = userData.lightIntensity * (0.8 + 0.4 * Math.sin(Date.now() * 0.005));
        userData.light.intensity = pulseIntensity;
    });
};

const calculateNextCometOrbitRadius = () => {
    // Cometas têm órbitas mais excêntricas e distantes
    const minCometRadius = 20; // Distância mínima dos planetas

    if (comets.length === 0) {
        return minCometRadius;
    }

    const maxCurrentRadius = Math.max(...comets.map(c => c.userData.orbitRadius));
    return maxCurrentRadius + 8; // Espaçamento maior para cometas
};

const generateRandomCometData = (customName = null) => {
    const cometNames = [
        "Halley", "Hale-Bopp", "Encke", "Biela", "Swift-Tuttle",
        "Tempel-Tuttle", "Hyakutake", "McNaught", "Lovejoy", "NEOWISE"
    ];

    const cometColors = [
        '#00ffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
        '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894', '#fdcb6e'
    ];

    // Nome do cometa
    let finalName;
    if (customName) {
        finalName = customName;
    } else {
        const usedNames = comets.map(c => c.userData.name);
        const availableNames = cometNames.filter(name => !usedNames.includes(name));
        finalName = availableNames.length > 0 ?
            availableNames[Math.floor(Math.random() * availableNames.length)] :
            `Cometa-${comets.length + 1}`;
    }

    return {
        name: finalName,
        orbitRadius: calculateNextCometOrbitRadius(),
        orbitSpeed: 0.2 + Math.random() * 0.8, // Velocidade mais lenta
        color: cometColors[Math.floor(Math.random() * cometColors.length)],
        intensity: 0.5 + Math.random() * 1.5,
        distance: 15 + Math.random() * 15
    };
};

const setupCometControls = () => {
    const cometOrbitRadiusSlider = document.getElementById('comet-orbit-radius');
    const cometSpeedSlider = document.getElementById('comet-speed');
    const cometIntensitySlider = document.getElementById('comet-intensity');
    const addCometBtn = document.getElementById('add-comet-btn');
    const randomCometBtn = document.getElementById('random-comet-btn');

    // Event listeners para sliders
    if (cometOrbitRadiusSlider) {
        cometOrbitRadiusSlider.addEventListener('input', (e) => {
            document.getElementById('comet-orbit-radius-display').textContent = e.target.value;
        });
    }

    if (cometSpeedSlider) {
        cometSpeedSlider.addEventListener('input', (e) => {
            document.getElementById('comet-speed-display').textContent = e.target.value;
        });
    }

    if (cometIntensitySlider) {
        cometIntensitySlider.addEventListener('input', (e) => {
            document.getElementById('comet-intensity-display').textContent = e.target.value;
        });
    }

    // Botão adicionar cometa
    if (addCometBtn) {
        addCometBtn.addEventListener('click', () => {
            const cometName = document.getElementById('comet-name').value.trim();
            const orbitRadius = parseFloat(cometOrbitRadiusSlider.value);
            const orbitSpeed = parseFloat(cometSpeedSlider.value);
            const color = document.getElementById('comet-color').value;
            const intensity = parseFloat(cometIntensitySlider.value);

            if (!cometName) {
                alert('Digite um nome para o cometa');
                return;
            }

            const success = addComet(cometName, orbitRadius, orbitSpeed, color, intensity, 25);
            if (success) {
                document.getElementById('comet-name').value = '';
                updateCometCounter();
            }
        });
    }

    // Botão cometa aleatório
    if (randomCometBtn) {
        randomCometBtn.addEventListener('click', () => {
            const cometData = generateRandomCometData();
            const success = addComet(
                cometData.name,
                cometData.orbitRadius,
                cometData.orbitSpeed,
                cometData.color,
                cometData.intensity,
                cometData.distance
            );

            if (success) {
                updateCometCounter();
            }
        });
    }
};


const updateCometCounter = () => {
    const cometCountElement = document.getElementById('comet-count');
    if (cometCountElement) {
        cometCountElement.textContent = comets.length;
    }
};

// The render loop.
const render = (currentTime = 0) => {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (!isPaused) {
        updateCameraMovement(deltaTime);
        updatePlanets(deltaTime);
        updateMoons(deltaTime);
        updateComets(deltaTime);
        updateModels(deltaTime);
        updateSkybox();
        updateOrbitLines(currentTime);

        if(currentObject){
            //  Apply rotation
            currentObject.rotation.y += angle;
        }
    }

    updateInfoDisplay();
    updateFPS();

    updatePlanetLabels();

    // Draw the scene
    renderer.render(scene, camera);

    // Make the new frame
    animationId = requestAnimationFrame(render);
}