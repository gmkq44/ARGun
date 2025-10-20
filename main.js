import * as THREE from 'three';

let scene, camera, renderer, controller, gun;
let projectiles = [];
let ghosts = [];
let particles = [];
let score = 0;
const clock = new THREE.Clock();
let shootSound, hitSound;

function init() {
    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

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

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    gun = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    body.position.z = -0.1;
    gun.add(body);

    const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x555555 })
    );
    grip.position.y = -0.1;
    grip.rotation.x = -Math.PI / 4;
    gun.add(grip);

    const sight = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x999999 })
    );
    sight.position.y = 0.06;
    sight.position.z = -0.28;
    gun.add(sight);

    gun.position.z = -0.5;
    gun.position.y = -0.5;
    scene.add(camera);

    window.addEventListener('click', startAR);

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

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.1, 0.6, 32, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        })
    );
    ghost.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    head.position.y = 0.3;
    ghost.add(head);

    const eye = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    eye.position.z = 0.18;
    eye.position.x = -0.08;
    eye.position.y = 0.35;
    ghost.add(eye);

    const eye2 = eye.clone();
    eye2.position.x = 0.08;
    ghost.add(eye2);

    ghost.position.x = (Math.random() - 0.5) * 4;
    ghost.position.y = (Math.random() - 0.5) * 2;
    ghost.position.z = - (Math.random() * 5 + 2);
    ghost.userData.bobOffset = Math.random() * Math.PI * 2;
    scene.add(ghost);
    ghosts.push(ghost);
}

function render() {
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    ghosts.forEach(ghost => {
        ghost.position.y += Math.sin(elapsedTime * 2 + ghost.userData.bobOffset) * 0.001;
    });

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.position.addScaledVector(projectile.velocity, delta * 5);

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

async function startAR() {
    window.removeEventListener('click', startAR);

    const sessionInit = {
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.querySelector('#ui-container') }
    };

    try {
        const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
        renderer.xr.setSession(session);

        document.getElementById('start-message').style.display = 'none';
        document.getElementById('score').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';

        controller = renderer.xr.getController(0);
        controller.add(gun);
        controller.addEventListener('select', shoot);
        scene.add(controller);

        setInterval(createGhost, 1000);
    } catch (e) {
        console.error("Failed to start AR session:", e);
    }
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
