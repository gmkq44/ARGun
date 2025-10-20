import * as THREE from 'three';
import { ARButton } from './ARButton.js';

let scene, camera, renderer, controller;
let projectiles = [];
let ghosts = [];
let particles = [];
let score = 0;
const clock = new THREE.Clock();
let shootSound, hitSound;

function init() {
    scene = new THREE.Scene();

    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();
    shootSound = new THREE.Audio(listener);
    audioLoader.load('sounds/shoot.wav', function(buffer) {
        shootSound.setBuffer(buffer);
        shootSound.setVolume(0.5);
    });

    hitSound = new THREE.Audio(listener);
    audioLoader.load('sounds/hit.wav', function(buffer) {
        hitSound.setBuffer(buffer);
        hitSound.setVolume(0.5);
    });

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.add(listener);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const gun = new THREE.Group();
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 32),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    barrel.position.z = -0.2;
    barrel.rotation.x = Math.PI / 2;
    gun.add(barrel);

    const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    grip.position.y = -0.15;
    gun.add(grip);

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

    if (shootSound) {
        if (shootSound.isPlaying) {
            shootSound.stop();
        }
        shootSound.play();
    }
}

function createGhost() {
    const ghost = new THREE.Group();

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    head.position.y = 0.2;
    ghost.add(head);

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.1, 0.4, 32, 1, true);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.1;
    ghost.add(body);

    // Eyes
    const eye = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    eye.position.z = 0.2;
    eye.position.x = -0.08;
    eye.position.y = 0.2;
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
                createExplosion(ghost.position);
                scene.remove(projectile);
                projectiles.splice(i, 1);
                scene.remove(ghost);
                ghosts.splice(j, 1);
                score++;
                document.getElementById('score').textContent = `Score: ${score}`;
                if (hitSound) {
                    if (hitSound.isPlaying) {
                        hitSound.stop();
                    }
                    hitSound.play();
                }
                break;
            }
        }

        if (projectile.position.length() > 20) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.position.addScaledVector(particle.velocity, delta);
        particle.lifetime -= delta;
        if (particle.lifetime <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

function createExplosion(position) {
    for (let i = 0; i < 20; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        particle.lifetime = Math.random() * 0.5 + 0.5;
        particles.push(particle);
        scene.add(particle);
    }
}

init();
setInterval(createGhost, 2000);
