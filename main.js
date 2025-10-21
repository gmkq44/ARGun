
// Add a global error listener to catch any uncaught exceptions
window.addEventListener('error', function(event) {
    console.error('UNCAUGHT ERROR:', event.message, event.filename, event.lineno, event.colno, event.error);
});
console.log("AR Ghost Shooter: Script loaded.");

import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container;
let camera, scene, renderer;
let controller;
let score = 0;
let ghosts = [];
const bullets = [];
const clock = new THREE.Clock();
let ghostSpawnerInterval;

// UI Elements
const ui = document.getElementById('ui');
const scoreElement = document.getElementById('score');
const fireButton = document.getElementById('fire-button');

console.log("AR Ghost Shooter: Starting init()...");
init();
console.log("AR Ghost Shooter: init() finished.");


function init() {
    try {
        container = document.getElementById('container');
        console.log("AR Ghost Shooter: Container element found.");

        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        console.log("AR Ghost Shooter: Scene and camera initialized.");

        // Renderer setup
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        container.appendChild(renderer.domElement);
        console.log("AR Ghost Shooter: WebGL Renderer initialized and XR enabled.");

        // Lighting
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);
        console.log("AR Ghost Shooter: Lighting added to scene.");

        // AR Button
        console.log("AR Ghost Shooter: Creating ARButton...");
        const arButton = ARButton.createButton(renderer, {
            requiredFeatures: ['hit-test', 'dom-overlay'],
            domOverlay: { root: document.body }
        });
        document.body.appendChild(arButton);
        console.log("AR Ghost Shooter: ARButton created and appended to body.");

        // Controller setup for input
        controller = renderer.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.add(controller);
        console.log("AR Ghost Shooter: XR Controller initialized.");

        // Fire button event listener
        fireButton.addEventListener('click', onSelect);

        // Start the render loop
        renderer.setAnimationLoop(render);
        console.log("AR Ghost Shooter: Animation loop started.");

        // Event listeners for session start/end
        renderer.xr.addEventListener('sessionstart', onSessionStart);
        renderer.xr.addEventListener('sessionend', onSessionEnd);
        console.log("AR Ghost Shooter: Session event listeners added.");

        window.addEventListener('resize', onWindowResize);
    } catch (e) {
        console.error("AR Ghost Shooter: Error in init() function:", e);
    }
}

function onSessionStart() {
    console.log("AR Ghost Shooter: XR session started!");
    ui.style.display = 'block';
    fireButton.style.display = 'block';
    spawnGhosts();
}

function onSessionEnd() {
    console.log("AR Ghost Shooter: XR session ended.");
    ui.style.display = 'none';
    fireButton.style.display = 'none';

    // Cleanup logic
    if (ghostSpawnerInterval) {
        clearInterval(ghostSpawnerInterval);
        console.log("AR Ghost Shooter: Ghost spawner cleared.");
    }
    ghosts.forEach(ghost => scene.remove(ghost));
    ghosts.length = 0;
    bullets.forEach(bullet => scene.remove(bullet));
    bullets.length = 0;
    score = 0;
    scoreElement.textContent = `Score: ${score}`;
    console.log("AR Ghost Shooter: Scene cleaned up.");
}

function onWindowResize() {
    console.log("AR Ghost Shooter: Window resized.");
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
    if (!renderer.xr.isPresenting) {
        console.log("AR Ghost Shooter: onSelect called, but not in AR session. Ignoring.");
        return;
    }
    console.log("AR Ghost Shooter: onSelect fired (shoot action).");

    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );

    bullet.position.copy(controller.position);
    const direction = new THREE.Vector3();
    controller.getWorldDirection(direction);
    bullet.velocity = direction.multiplyScalar(-5);

    scene.add(bullet);
    bullets.push(bullet);
}

function spawnGhosts() {
    console.log("AR Ghost Shooter: Starting ghost spawner...");
    const textureLoader = new THREE.TextureLoader();
    const ghostTexture = textureLoader.load('ghost.png');
    console.log("AR Ghost Shooter: Ghost texture loaded.");

    ghostSpawnerInterval = setInterval(() => {
        if (renderer.xr.isPresenting) {
            const ghost = new THREE.Mesh(
                new THREE.PlaneGeometry(0.2, 0.2),
                new THREE.MeshBasicMaterial({ map: ghostTexture, transparent: true })
            );

            const spawnPosition = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 2,
                -2 - Math.random() * 2
            );

            ghost.position.copy(spawnPosition);
            ghost.lookAt(camera.position);

            scene.add(ghost);
            ghosts.push(ghost);
            console.log("AR Ghost Shooter: Spawned a ghost.");
        }
    }, 2000);
}

let frameCount = 0;
function render(timestamp, frame) {
    if (frameCount === 0) {
        console.log("AR Ghost Shooter: First render frame.");
    }
    frameCount++;

    const delta = clock.getDelta();

    if (renderer.xr.isPresenting) {
        if(frameCount % 300 === 0) { // Log every 5 seconds approx
            console.log(`AR Ghost Shooter: Rendering frame ${frameCount} in AR mode.`);
        }
        // Update bullet positions and check for collisions
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));

            if (bullet.position.length() > 20) {
                scene.remove(bullet);
                bullets.splice(i, 1);
            }

            for (let j = ghosts.length - 1; j >= 0; j--) {
                const ghost = ghosts[j];
                if (bullet.position.distanceTo(ghost.position) < 0.1) {
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    scene.remove(ghost);
                    ghosts.splice(j, 1);
                    score++;
                    scoreElement.textContent = `Score: ${score}`;
                    break;
                }
            }
        }
    }

    try {
        renderer.render(scene, camera);
    } catch (e) {
        console.error("AR Ghost Shooter: Error in render loop:", e);
    }
}
