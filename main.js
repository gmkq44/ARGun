
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

// Global error listener
window.addEventListener('error', function(event) {
    alert(`UNCAUGHT ERROR: ${event.message}\nFile: ${event.filename}\nLine: ${event.lineno}`);
});

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

init();

function init() {
    container = document.getElementById('container');

    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // AR Button - Make DOM Overlay an OPTIONAL feature
    const arButton = ARButton.createButton(renderer, {
        optionalFeatures: ['dom-overlay'], // Changed from requiredFeatures
        domOverlay: { root: document.body }
    });
    document.body.appendChild(arButton);

    // Controller setup for input
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Fire button event listener
    fireButton.addEventListener('click', onSelect);

    // Start the render loop
    renderer.setAnimationLoop(render);

    // Event listeners for session start/end
    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    window.addEventListener('resize', onWindowResize);
}

function onSessionStart() {
    ui.style.display = 'block';
    fireButton.style.display = 'block';
    spawnGhosts();
}

function onSessionEnd() {
    ui.style.display = 'none';
    fireButton.style.display = 'none';

    // Cleanup logic
    if (ghostSpawnerInterval) {
        clearInterval(ghostSpawnerInterval);
    }
    ghosts.forEach(ghost => scene.remove(ghost));
    ghosts.length = 0;
    bullets.forEach(bullet => scene.remove(bullet));
    bullets.length = 0;
    score = 0;
    scoreElement.textContent = `Score: ${score}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
    if (!renderer.xr.isPresenting) return;

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
    const textureLoader = new THREE.TextureLoader();
    const ghostTexture = textureLoader.load('ghost.png');

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
        }
    }, 2000);
}

function render(timestamp, frame) {
    const delta = clock.getDelta();

    if (renderer.xr.isPresenting) {
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

    renderer.render(scene, camera);
}
