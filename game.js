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
    chargeRate: 2.2,
    isSoloing: false,
    soloWobble: 0,
    swingState: 0, // 0: idle, 1: charging, 2: swinging
    shake: 0
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 0, 800);

// Adjusted Camera for better view
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Camera Container for offset
const cameraContainer = new THREE.Group();
cameraContainer.add(camera);
camera.position.set(0, 0.6, 1.4); // Pull camera back and up
scene.add(cameraContainer);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.3);
sunLight.position.set(100, 200, 100); sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096; sunLight.shadow.mapSize.height = 4096;
scene.add(sunLight);

// --- Particle System ---
const particles = [];
function createParticles(pos, count, color, size = 0.05, speed = 0.2) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geo, mat); p.position.copy(pos);
        p.userData = { vel: new THREE.Vector3((Math.random()-0.5)*speed, (Math.random()+0.2)*speed, (Math.random()-0.5)*speed), life: 1.0, decay: 0.01 + Math.random()*0.02 };
        scene.add(p); particles.push(p);
    }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.position.add(p.userData.vel); p.userData.vel.y -= 0.005; p.userData.life -= p.userData.decay; p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }
}

// --- Wood Texture ---
function createWoodTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e3c9a6'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#c4a484';
    for(let i=0; i<30; i++) { ctx.beginPath(); const x = Math.random()*256; ctx.moveTo(x, 0); ctx.bezierCurveTo(x+20, 100, x-20, 150, x, 256); ctx.stroke(); }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; return texture;
}

// --- Stadium & Pitch ---
function createStadium() {
    const standMat = new THREE.MeshPhongMaterial({ color: 0x444444 }); const seatMat = new THREE.MeshPhongMaterial({ color: 0x113399 });
    const createStand = (width, depth, x, z, rot) => {
        const group = new THREE.Group(); group.add(new THREE.Mesh(new THREE.BoxGeometry(width, 10, depth), standMat));
        for(let i=1; i<=6; i++) { const tier = new THREE.Mesh(new THREE.BoxGeometry(width, 4, depth-(i*6)), seatMat); tier.position.set(0, 5+(i*4), -(i*3)); group.add(tier); }
        group.position.set(x, 5, z); group.rotation.y = rot; scene.add(group);
    };
    createStand(220, 70, -95, 0, Math.PI/2); createStand(220, 70, 95, 0, -Math.PI/2); createStand(140, 70, 0, 130, 0);
    const hill = new THREE.Mesh(new THREE.BoxGeometry(110, 6, 45), standMat); hill.position.set(0, 3, -120); scene.add(hill);
}
createStadium();

const pitchWidth = 90; const pitchLength = 145;
const grassMat = new THREE.MeshPhongMaterial({ color: 0x2d5e1e, shininess: 2 });
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(pitchWidth+50, pitchLength+50), grassMat); pitch.rotation.x = -Math.PI/2; pitch.receiveShadow = true; scene.add(pitch);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
const createLine = (w, h, x, z) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat); mesh.rotation.x = -Math.PI/2; mesh.position.set(x, 0.02, z); scene.add(mesh); };
createLine(pitchWidth, 0.6, 0, pitchLength/2); createLine(pitchWidth, 0.6, 0, -pitchLength/2); createLine(0.6, pitchLength, pitchWidth/2, 0); createLine(0.6, pitchLength, -pitchWidth/2, 0);
[13, 20, 45, 65].forEach(m => { createLine(pitchWidth, 0.3, 0, pitchLength/2-m); createLine(pitchWidth, 0.3, 0, -pitchLength/2+m); });
createLine(pitchWidth, 0.4, 0, 0);

// --- Goalposts & Keeper ---
function createGoal(zPos) {
    const group = new THREE.Group(); const postMat = new THREE.MeshPhongMaterial({ color: 0xffffff }); const netMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const uprightGeo = new THREE.CylinderGeometry(0.15, 0.15, 14);
    const left = new THREE.Mesh(uprightGeo, postMat); left.position.set(-3.25, 7, 0); left.castShadow = true; group.add(left);
    const right = new THREE.Mesh(uprightGeo, postMat); right.position.set(3.25, 7, 0); right.castShadow = true; group.add(right);
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5), postMat); cross.rotation.z = Math.PI/2; cross.position.set(0, 2.5, 0); cross.castShadow = true; group.add(cross);
    const net = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.5, 2.5), netMat); net.position.set(0, 1.25, zPos>0 ? 1.25 : -1.25); group.add(net);
    group.position.z = zPos; scene.add(group);
}
createGoal(-pitchLength/2); createGoal(pitchLength/2);
const keeper = new THREE.Group(); keeper.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35), new THREE.MeshPhongMaterial({ color: 0xffcc00 })));
const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshPhongMaterial({ color: 0xccaa88 })); head.position.y = 0.8; keeper.add(head);
keeper.position.set(0, 0.6, -pitchLength/2+1); scene.add(keeper);

// --- Sliotar ---
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffffff })); ball.castShadow = true; ball.position.set(0, 5, 0); scene.add(ball);
const ballPhys = { vel: new THREE.Vector3(0, 0, 0), gravity: -0.015, bounce: 0.65, friction: 0.985 };
function resetBall() { state.isSoloing = false; ball.position.set(0, 5, 0); ballPhys.vel.set(0, 0, 0); }

// --- Improved Hurley ---
function createHurley() {
    const group = new THREE.Group(); const woodTexture = createWoodTexture(); const woodMat = new THREE.MeshPhongMaterial({ map: woodTexture, shininess: 10 }); const gripMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.0, 16), woodMat); handle.position.y = 0.4; group.add(handle);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.4, 16), gripMat); grip.position.y = 0.7; group.add(grip);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.12, 0); shape.quadraticCurveTo(0.28, 0.06, 0.34, 0.22); shape.lineTo(0.34, 0.42); shape.quadraticCurveTo(0.18, 0.48, 0, 0.35); shape.lineTo(0, 0);
    const boss = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 }), woodMat);
    boss.rotation.z = -Math.PI/1.05; boss.rotation.y = -Math.PI/2; boss.position.set(0.035, -0.15, 0.05); group.add(boss);
    return group;
}
const hurleyGroup = createHurley(); 
hurleyGroup.position.set(0.6, -0.8, -0.6); // Adjusted for pulled back camera
hurleyGroup.rotation.set(Math.PI/4, 0, -Math.PI/6);
camera.add(hurleyGroup);

// --- Inputs ---
const controls = new PointerLockControls(cameraContainer, document.body);
scene.add(controls.getObject());
const keys = {};
document.addEventListener('mousedown', (e) => { if(!controls.isLocked) controls.lock(); else if(e.button === 0) { state.isCharging = true; state.power = 0; state.swingState = 1; } });
document.addEventListener('mouseup', (e) => { if(state.isCharging && e.button === 0) { performStrike(); } });
document.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'KeyR') resetBall(); if(e.code === 'KeyE') toggleSolo(); });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

function toggleSolo() { if(state.isSoloing) state.isSoloing = false; else if(cameraContainer.position.distanceTo(ball.position) < 4) { state.isSoloing = true; createParticles(ball.position.clone(), 10, 0xffffff, 0.04, 0.1); } }

function performStrike() {
    const finalPower = state.power;
    state.isCharging = false;
    state.swingState = 2; // Swish!

    setTimeout(() => {
        const dist = cameraContainer.position.distanceTo(ball.position);
        if (state.isSoloing || dist < 3.5) {
            createParticles(ball.position.clone(), 15 + finalPower/4, 0xffffff, 0.04, 0.25);
            const boost = state.isSoloing ? 1.3 : 1.0;
            const finalStrength = (0.2 + (finalPower / 100) * 1.4) * boost;
            const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y += 0.35; dir.normalize();
            state.isSoloing = false; ballPhys.vel.copy(dir.multiplyScalar(finalStrength));
            if (finalPower > 80) state.shake = 10;
        }
        setTimeout(() => {
            state.swingState = 0;
            document.getElementById('power-bar').style.width = '0%';
        }, 400);
    }, 60);
}

// --- Loop ---
function update() {
    if (controls.isLocked) {
        const dir = new THREE.Vector3(); if (keys['KeyW']) dir.z -= 1; if (keys['KeyS']) dir.z += 1; if (keys['KeyA']) dir.x -= 1; if (keys['KeyD']) dir.x += 1;
        dir.normalize().applyQuaternion(cameraContainer.quaternion); dir.y = 0;
        const speed = keys['ShiftLeft'] ? 0.35 : 0.22;
        controls.getObject().position.add(dir.multiplyScalar(speed));
    }

    // Horizontal Animation Logic
    const idleY = 0; const idleZ = -Math.PI/6; const idleX = Math.PI/4;
    
    if (state.isCharging) {
        state.power = Math.min(state.maxPower, state.power + state.chargeRate);
        document.getElementById('power-bar').style.width = `${state.power}%`;
        hurleyGroup.rotation.y = THREE.MathUtils.lerp(hurleyGroup.rotation.y, Math.PI/3, 0.1);
        hurleyGroup.rotation.z = THREE.MathUtils.lerp(hurleyGroup.rotation.z, -Math.PI/2, 0.1);
        hurleyGroup.position.x = 0.8;
    } else if (state.swingState === 2) {
        hurleyGroup.rotation.y -= 0.6;
        hurleyGroup.rotation.z += 1.0;
        hurleyGroup.position.x -= 0.3;
    } else if (state.swingState === 0) {
        hurleyGroup.rotation.y = THREE.MathUtils.lerp(hurleyGroup.rotation.y, idleY, 0.1);
        hurleyGroup.rotation.z = THREE.MathUtils.lerp(hurleyGroup.rotation.z, idleZ, 0.1);
        hurleyGroup.rotation.x = THREE.MathUtils.lerp(hurleyGroup.rotation.x, idleX, 0.1);
        hurleyGroup.position.x = THREE.MathUtils.lerp(hurleyGroup.position.x, 0.6, 0.1);
    }

    if (state.shake > 0) {
        camera.position.x += (Math.random()-0.5)*0.1*(state.shake/10);
        camera.position.y += (Math.random()-0.5)*0.1*(state.shake/10);
        state.shake *= 0.9;
    }

    if (state.isSoloing) {
        state.soloWobble += 0.15; const wobbleX = Math.sin(state.soloWobble)*0.03; const wobbleY = Math.cos(state.soloWobble*0.8)*0.02;
        const ballPos = new THREE.Vector3(0.4+wobbleX, -0.3+wobbleY, -0.6); ballPos.applyQuaternion(cameraContainer.quaternion);
        ball.position.copy(cameraContainer.position).add(ballPos); ballPhys.vel.set(0, 0, 0);
    } else {
        ballPhys.vel.y += ballPhys.gravity; ball.position.add(ballPhys.vel);
        if (ball.position.y < 0.15) { ball.position.y = 0.15; ballPhys.vel.y *= -ballPhys.bounce; ballPhys.vel.x *= ballPhys.friction; ballPhys.vel.z *= ballPhys.friction; }
    }

    const targetX = THREE.MathUtils.clamp(ball.position.x, -3.0, 3.0);
    if (keeper.position.x < targetX) keeper.position.x += 0.07; if (keeper.position.x > targetX) keeper.position.x -= 0.07;
    if (!state.isSoloing && ball.position.distanceTo(keeper.position) < 0.8 && ballPhys.vel.z < 0) { ballPhys.vel.z *= -0.6; ballPhys.vel.y += 0.25; createParticles(ball.position.clone(), 8, 0xffff00, 0.05, 0.1); }
    if (Math.abs(ball.position.x) > 65 || Math.abs(ball.position.z) > 85) resetBall();
    const checkGoal = (goalZ) => {
        if (Math.abs(ball.position.z - goalZ) < 0.6 && Math.abs(ball.position.x) < 3.25) {
            if (ball.position.y > 0.15 && ball.position.y < 2.5) { state.score += 3; updateScore(); resetBall(); createParticles(new THREE.Vector3(0,1,goalZ), 50, 0xffd700, 0.06, 0.5); }
            else if (ball.position.y >= 2.5 && ball.position.y < 12) { state.score += 1; updateScore(); resetBall(); createParticles(new THREE.Vector3(0,4,goalZ), 30, 0xffffff, 0.05, 0.4); }
        }
    };
    checkGoal(-pitchLength/2); checkGoal(pitchLength/2); updateParticles();
}
function updateScore() { document.getElementById('score').innerText = state.score; }
function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
animate();