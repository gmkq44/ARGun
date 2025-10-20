import * as THREE from 'three';
import { ARButton } from './ARButton.js';

let scene, camera, renderer, controller;
let projectiles = [];
let ghosts = [];
let score = 0;
const clock = new THREE.Clock();

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const gun = new THREE.Group();
    const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    handle.position.y = -0.2;
    gun.add(handle);

    const barrel = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    barrel.position.z = -0.3;
    gun.add(barrel);

    gun.position.z = -0.5;
    gun.position.y = -0.5;
    camera.add(gun);
    scene.add(camera);

    const button = ARButton.createButton(renderer);
    document.body.appendChild(button);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', shoot);
    scene.add(controller);

    renderer.setAnimationLoop(render);
}

function shoot() {
    const projectile = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    projectile.position.setFromMatrixPosition(controller.matrixWorld);
    projectile.quaternion.setFromRotationMatrix(controller.matrixWorld);
    projectile.velocity = new THREE.Vector3(0, 0, -1).applyQuaternion(projectile.quaternion);

    projectiles.push(projectile);
    scene.add(projectile);
}

function createGhost() {
    const ghost = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
    );
    ghost.add(body);

    const eye = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    eye.position.z = 0.2;
    eye.position.x = -0.08;
    ghost.add(eye);

    const eye2 = eye.clone();
    eye2.position.x = 0.08;
    ghost.add(eye2);

    ghost.position.x = (Math.random() - 0.5) * 4;
    ghost.position.y = (Math.random() - 0.5) * 2;
    ghost.position.z = - (Math.random() * 5 + 2);
    scene.add(ghost);
    ghosts.push(ghost);
}

function render() {
    const delta = clock.getDelta();

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.position.addScaledVector(projectile.velocity, delta * 3);

        for (let j = ghosts.length - 1; j >= 0; j--) {
            const ghost = ghosts[j];
            if (projectile.position.distanceTo(ghost.position) < 0.2) {
                scene.remove(projectile);
                projectiles.splice(i, 1);
                scene.remove(ghost);
                ghosts.splice(j, 1);
                score++;
                document.getElementById('score').textContent = `Score: ${score}`;
                break;
            }
        }

        if (projectile.position.length() > 20) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

init();
setInterval(createGhost, 2000);
