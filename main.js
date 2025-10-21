
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container;
let camera, scene, renderer;
let controller;
let score = 0; // We'll keep score internally for now
let ghosts = [];
const bullets = [];
const clock = new THREE.Clock();
let ghostSpawnerInterval;

init();
animate();

function init() {
    container = document.getElementById('container');

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    scene.add(camera); // Add camera to the scene

    // 3D Crosshair
    const crosshairGeometry = new THREE.RingGeometry(0.01, 0.015, 32);
    const crosshairMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
    const crosshair = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
    crosshair.position.z = -0.5; // Position it in front of the camera
    camera.add(crosshair); // Attach crosshair to the camera

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Light
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // AR Button (most basic version)
    document.body.appendChild(ARButton.createButton(renderer));

    // Controller for tap-to-shoot
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect); // 'select' is the tap event
    scene.add(controller);

    // Start ghost spawning once the session starts
    renderer.xr.addEventListener('sessionstart', spawnGhosts);
    renderer.xr.addEventListener('sessionend', () => {
        if (ghostSpawnerInterval) clearInterval(ghostSpawnerInterval);
    });

    window.addEventListener('resize', onWindowResize);
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

    // The controller's position/rotation is the user's device
    bullet.position.setFromMatrixPosition(controller.matrixWorld);
    bullet.quaternion.setFromRotationMatrix(controller.matrixWorld);

    // Move the bullet forward from the controller's direction
    bullet.velocity = new THREE.Vector3(0, 0, -1).applyQuaternion(bullet.quaternion).multiplyScalar(5);
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

            // Position ghost in front of the user
            const spawnPosition = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 2 + 1, // Spawn a bit higher
                -2 - Math.random() * 2
            );

            // Get camera position and apply offset
            const cameraPosition = new THREE.Vector3();
            camera.getWorldPosition(cameraPosition);
            spawnPosition.add(cameraPosition);

            ghost.position.copy(spawnPosition);
            ghost.lookAt(cameraPosition); // Make ghost face the camera

            scene.add(ghost);
            ghosts.push(ghost);
        }
    }, 2000);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    const delta = clock.getDelta();

    if (renderer.xr.isPresenting) {
        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));

            // Remove distant bullets
            if (bullet.position.length() > 20) {
                scene.remove(bullet);
                bullets.splice(i, 1);
                continue;
            }

            // Check for collision
            for (let j = ghosts.length - 1; j >= 0; j--) {
                const ghost = ghosts[j];
                if (bullet.position.distanceTo(ghost.position) < 0.15) {
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    scene.remove(ghost);
                    ghosts.splice(j, 1);
                    score++;
                    // In the future, we can add a 3D score display here
                    break;
                }
            }
        }
    }

    renderer.render(scene, camera);
}
