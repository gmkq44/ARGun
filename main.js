
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container;
let camera, scene, renderer;
let controller;
let score = 0;
let ghosts = [];
const bullets = [];
const clock = new THREE.Clock();

const scoreElement = document.getElementById('score');
const startMessage = document.getElementById('start-message');
const ui = document.getElementById('ui');
const fireButton = document.getElementById('fire-button');

init();
animate();

function init() {
    container = document.getElementById('container');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    document.body.appendChild(ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    }));

    startMessage.addEventListener('click', () => {
        startMessage.style.display = 'none';
        ui.style.display = 'block';
        fireButton.style.display = 'block';
        if (renderer.xr.isPresenting) {
            spawnGhosts();
        }
    });

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    fireButton.addEventListener('click', onSelect);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
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

    setInterval(() => {
        if (renderer.xr.isPresenting) {
            const ghost = new THREE.Mesh(
                new THREE.PlaneGeometry(0.2, 0.2),
                new THREE.MeshBasicMaterial({ map: ghostTexture, transparent: true })
            );

            ghost.position.set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 2,
                -2 - Math.random() * 2
            );

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

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));

        if (bullet.position.length() > 10) {
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

    renderer.render(scene, camera);
}
