import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Game State ---
const state = {
    score: 0,
    ballActive: true,
    lastStrikeTime: 0,
    power: 0,
    isCharging: false,
    maxPower: 100,
    chargeRate: 2.5
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 0, 700);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(100, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.left = -150;
sunLight.shadow.camera.right = 150;
sunLight.shadow.camera.top = 150;
sunLight.shadow.camera.bottom = -150;
scene.add(sunLight);

// --- Particle System ---
const particles = [];
function createParticles(pos, count, color, size = 0.05, speed = 0.2) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.userData = {
            vel: new THREE.Vector3((Math.random() - 0.5) * speed, (Math.random() + 0.2) * speed, (Math.random() - 0.5) * speed),
            life: 1.0,
            decay: 0.01 + Math.random() * 0.02
        };
        scene.add(p);
        particles.push(p);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.005; // Gravity
        p.userData.life -= p.userData.decay;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
}

// --- Stadium ---
function createStadium() {
    const standMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const seatMat = new THREE.MeshPhongMaterial({ color: 0x2244aa });
    const createStand = (width, depth, x, z, rot) => {
        const standGroup = new THREE.Group();
        standGroup.add(new THREE.Mesh(new THREE.BoxGeometry(width, 10, depth), standMat));
        for(let i=1; i<=5; i++) {
            const tier = new THREE.Mesh(new THREE.BoxGeometry(width, 4, depth - (i * 5)), seatMat);
            tier.position.y = 5 + (i * 4); tier.position.z = -(i * 2.5);
            standGroup.add(tier);
        }
        standGroup.position.set(x, 5, z); standGroup.rotation.y = rot;
        scene.add(standGroup);
    };
    createStand(200, 60, -85, 0, Math.PI / 2); createStand(200, 60, 85, 0, -Math.PI / 2);
    createStand(120, 60, 0, 120, 0);
    const hill = new THREE.Mesh(new THREE.BoxGeometry(100, 5, 40), standMat);
    hill.position.set(0, 2.5, -110); scene.add(hill);
}
createStadium();

// --- Pitch ---
const pitchWidth = 90;
const pitchLength = 145;
const grassGeo = new THREE.PlaneGeometry(pitchWidth + 40, pitchLength + 40);
const grassMat = new THREE.MeshPhongMaterial({ color: 0x2d5e1e, shininess: 5 });
const pitch = new THREE.Mesh(grassGeo, grassMat);
pitch.rotation.x = -Math.PI / 2;
pitch.receiveShadow = true;
scene.add(pitch);

// Pitch Lines
const lineMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
const createLine = (w, h, x, z) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, lineMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    scene.add(mesh);
};
createLine(pitchWidth, 0.6, 0, pitchLength/2); createLine(pitchWidth, 0.6, 0, -pitchLength/2);
createLine(0.6, pitchLength, pitchWidth/2, 0); createLine(0.6, pitchLength, -pitchWidth/2, 0);
[13, 20, 45, 65].forEach(m => {
    createLine(pitchWidth, 0.3, 0, pitchLength/2 - m); createLine(pitchWidth, 0.3, 0, -pitchLength/2 + m);
});
createLine(pitchWidth, 0.4, 0, 0);

// --- Goalposts ---
function createGoal(zPos) {
    const goalGroup = new THREE.Group();
    const postMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const netMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const uprightGeo = new THREE.CylinderGeometry(0.15, 0.15, 14);
    const leftPost = new THREE.Mesh(uprightGeo, postMat); leftPost.position.set(-3.25, 7, 0); leftPost.castShadow = true; goalGroup.add(leftPost);
    const rightPost = new THREE.Mesh(uprightGeo, postMat); rightPost.position.set(3.25, 7, 0); rightPost.castShadow = true; goalGroup.add(rightPost);
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5), postMat); crossbar.rotation.z = Math.PI/2; crossbar.position.set(0, 2.5, 0); crossbar.castShadow = true; goalGroup.add(crossbar);
    const net = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.5, 2.5), netMat); net.position.set(0, 1.25, zPos > 0 ? 1.25 : -1.25); goalGroup.add(net);
    goalGroup.position.z = zPos;
    scene.add(goalGroup);
    return goalGroup;
}
createGoal(-pitchLength / 2);
createGoal(pitchLength / 2);

// --- Goalkeeper AI ---
function createKeeper(zPos) {
    const keeperGroup = new THREE.Group();
    const jerseyMat = new THREE.MeshPhongMaterial({ color: 0xffee00 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.3), jerseyMat); body.position.y = 1.3; keeperGroup.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshPhongMaterial({ color: 0xccaa88 })); head.position.y = 2.0; keeperGroup.add(head);
    keeperGroup.position.set(0, 0, zPos + (zPos > 0 ? -1 : 1));
    scene.add(keeperGroup);
    return keeperGroup;
}
const keeper1 = createKeeper(-pitchLength / 2);

// --- Sliotar ---
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffffff }));
ball.castShadow = true; ball.position.set(0, 5, 0); scene.add(ball);
const ballPhys = { vel: new THREE.Vector3(0, 0, 0), gravity: -0.015, bounce: 0.65, friction: 0.99 };
function resetBall() { ball.position.set(0, 5, 0); ballPhys.vel.set(0, 0, 0); }

// --- Controls ---
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) { controls.lock(); } else if (e.button === 0) { state.isCharging = true; state.power = 0; }
});
document.addEventListener('mouseup', (e) => {
    if (state.isCharging && e.button === 0) { strikeBall(); state.isCharging = false; document.getElementById('power-bar').style.width = '0%'; }
});
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'KeyR') resetBall(); });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Hurley ---
function createHurley() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshPhongMaterial({ color: 0xe3c9a6 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.0, 12), woodMat); handle.position.y = 0.4; group.add(handle);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(0.1, 0); shape.quadraticCurveTo(0.25, 0.05, 0.3, 0.2);
    shape.lineTo(0.3, 0.35); shape.quadraticCurveTo(0.15, 0.4, 0, 0.3); shape.lineTo(0, 0);
    const boss = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 }), woodMat);
    boss.rotation.z = Math.PI / 1.1; boss.rotation.y = Math.PI / 2; boss.position.set(-0.04, -0.15, -0.05); group.add(boss);
    return group;
}
const hurleyGroup = createHurley();
hurleyGroup.position.set(0.6, -0.5, -0.8); hurleyGroup.rotation.x = -Math.PI / 4;
camera.add(hurleyGroup);

function strikeBall() {
    const dist = camera.position.distanceTo(ball.position);
    if (dist < 3.5) {
        // Particles
        createParticles(ball.position.clone(), 15, 0xffffff, 0.04, 0.25);
        createParticles(ball.position.clone(), 10, 0x88ff88, 0.03, 0.15); // Grass fly-up
        
        const initialRot = hurleyGroup.rotation.x;
        hurleyGroup.rotation.x -= 0.8;
        setTimeout(() => hurleyGroup.rotation.x = initialRot, 150);
        const finalStrength = 0.2 + (state.power / 100) * 1.2;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y += 0.35; dir.normalize();
        ballPhys.vel.copy(dir.multiplyScalar(finalStrength));
    }
}

// --- Loop ---
function update() {
    if (controls.isLocked) {
        const dir = new THREE.Vector3();
        if (keys['KeyW']) dir.z -= 1; if (keys['KeyS']) dir.z += 1; if (keys['KeyA']) dir.x -= 1; if (keys['KeyD']) dir.x += 1;
        dir.normalize().applyQuaternion(camera.quaternion); dir.y = 0;
        controls.getObject().position.add(dir.multiplyScalar(0.25));
    }
    if (state.isCharging) {
        state.power = Math.min(state.maxPower, state.power + state.chargeRate);
        document.getElementById('power-bar').style.width = `${state.power}%`;
    }

    // Goalkeeper AI
    const keeperXLimit = 3.0; const targetX = THREE.MathUtils.clamp(ball.position.x, -keeperXLimit, keeperXLimit);
    if (keeper1.position.x < targetX) keeper1.position.x += 0.08;
    if (keeper1.position.x > targetX) keeper1.position.x -= 0.08;
    if (ball.position.distanceTo(keeper1.position) < 0.8 && ballPhys.vel.z < 0) {
        ballPhys.vel.z *= -0.5; ballPhys.vel.y += 0.2;
        createParticles(ball.position.clone(), 8, 0xffff00, 0.05, 0.1); // Save effect
    }

    // Ball Physics
    ballPhys.vel.y += ballPhys.gravity; ball.position.add(ballPhys.vel);
    if (ball.position.y < 0.15) {
        if (ballPhys.vel.length() > 0.3) createParticles(ball.position.clone(), 3, 0x447744, 0.02, 0.1);
        ball.position.y = 0.15; ballPhys.vel.y *= -ballPhys.bounce;
        ballPhys.vel.x *= ballPhys.friction; ballPhys.vel.z *= ballPhys.friction;
    }

    // Scoring
    const checkGoal = (goalZ) => {
        if (Math.abs(ball.position.z - goalZ) < 0.6 && Math.abs(ball.position.x) < 3.25) {
            if (ball.position.y > 0.15 && ball.position.y < 2.5) {
                state.score += 3; updateScore(); resetBall();
                createParticles(new THREE.Vector3(0, 1, goalZ), 50, 0xffd700, 0.06, 0.5); // Confetti
            } else if (ball.position.y >= 2.5 && ball.position.y < 12) {
                state.score += 1; updateScore(); resetBall();
                createParticles(new THREE.Vector3(0, 4, goalZ), 30, 0xffffff, 0.05, 0.4); // Sparkle
            }
        }
    };
    checkGoal(-pitchLength / 2); checkGoal(pitchLength / 2);
    updateParticles();
}

function updateScore() { document.getElementById('score').innerText = state.score; }
function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
animate();