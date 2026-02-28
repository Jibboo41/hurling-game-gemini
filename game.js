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
    swingState: 0,
    shake: 0,
    // Camera State
    cameraYaw: 0,
    cameraPitch: -0.3,
    cameraDist: 7
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 0, 1000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.3);
sunLight.position.set(100, 200, 100); sunLight.castShadow = true;
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

// --- Player Character ---
function createPlayer() {
    const group = new THREE.Group();
    const kitMat = new THREE.MeshPhongMaterial({ color: 0x113399 });
    const skinMat = new THREE.MeshPhongMaterial({ color: 0xccaa88 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.4), kitMat);
    body.position.y = 1.1; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
    head.position.y = 1.9; head.castShadow = true; group.add(head);
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftArm = new THREE.Mesh(armGeo, skinMat); leftArm.position.set(-0.4, 1.3, 0); group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, skinMat); rightArm.position.set(0.4, 1.3, 0.2); group.add(rightArm);
    return group;
}
const player = createPlayer();
scene.add(player);

// --- Hurley ---
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
hurleyGroup.position.set(0.5, 1.0, 0.5);
player.add(hurleyGroup);

// --- Stadium & Pitch ---
function createStadium() {
    const standMat = new THREE.MeshPhongMaterial({ color: 0x444444 }); const seatMat = new THREE.MeshPhongMaterial({ color: 0x113399 });
    const createStand = (width, depth, x, z, rot) => {
        const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(width, 10, depth), standMat));
        for(let i=1; i<=6; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(width, 4, depth-(i*6)), seatMat); t.position.set(0, 5+(i*4), -(i*3)); g.add(t); }
        g.position.set(x, 5, z); g.rotation.y = rot; scene.add(g);
    };
    createStand(220, 70, -95, 0, Math.PI/2); createStand(220, 70, 95, 0, -Math.PI/2); createStand(140, 70, 0, 130, 0);
    const hill = new THREE.Mesh(new THREE.BoxGeometry(110, 6, 45), standMat); hill.position.set(0, 3, -120); scene.add(hill);
}
createStadium();

const pitchWidth = 90; const pitchLength = 145;
const grassMat = new THREE.MeshPhongMaterial({ color: 0x2d5e1e, shininess: 2 });
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(pitchWidth+50, pitchLength+50), grassMat); pitch.rotation.x = -Math.PI/2; pitch.receiveShadow = true; scene.add(pitch);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
const createLine = (w, h, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat); m.rotation.x = -Math.PI/2; m.position.set(x, 0.02, z); scene.add(m); };
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
const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshPhongMaterial({ color: 0xccaa88 })); kHead.position.y = 0.8; keeper.add(kHead);
keeper.position.set(0, 0.6, -pitchLength/2+1); scene.add(keeper);

// --- Sliotar ---
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffffff })); ball.castShadow = true; ball.position.set(0, 5, 0); scene.add(ball);
const ballPhys = { vel: new THREE.Vector3(0, 0, 0), gravity: -0.015, bounce: 0.65, friction: 0.985 };
function resetBall() { state.isSoloing = false; ball.position.set(0, 5, 0); ballPhys.vel.set(0, 0, 0); }

// --- Inputs & Controls ---
const controls = new PointerLockControls(camera, document.body);
const keys = {};
document.addEventListener('mousedown', (e) => { if(!controls.isLocked) controls.lock(); else if(e.button === 0) { state.isCharging = true; state.power = 0; state.swingState = 1; } });
document.addEventListener('mouseup', (e) => { if(state.isCharging && e.button === 0) { performStrike(); } });
document.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'KeyR') resetBall(); if(e.code === 'KeyE') toggleSolo(); });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Use mousemove directly for camera rotation to avoid conflict with PointerLockControls manual rotation
document.addEventListener('mousemove', (e) => {
    if (controls.isLocked) {
        state.cameraYaw -= e.movementX * 0.003;
        state.cameraPitch -= e.movementY * 0.003;
        state.cameraPitch = Math.max(-1.4, Math.min(0.2, state.cameraPitch)); // Clamp pitch
    }
});

function toggleSolo() { if(state.isSoloing) state.isSoloing = false; else if(player.position.distanceTo(ball.position) < 3) { state.isSoloing = true; createParticles(ball.position.clone(), 10, 0xffffff, 0.04, 0.1); } }

function performStrike() {
    const finalPower = state.power; state.isCharging = false; state.swingState = 2;
    setTimeout(() => {
        const dist = player.position.distanceTo(ball.position);
        if (state.isSoloing || dist < 3.5) {
            createParticles(ball.position.clone(), 15 + finalPower/4, 0xffffff, 0.04, 0.25);
            const boost = state.isSoloing ? 1.3 : 1.0;
            const finalStrength = (0.2 + (finalPower / 100) * 1.5) * boost;
            const dir = new THREE.Vector3(); player.getWorldDirection(dir); dir.y += 0.35; dir.normalize();
            state.isSoloing = false; ballPhys.vel.copy(dir.multiplyScalar(finalStrength));
            if (finalPower > 80) state.shake = 10;
        }
        setTimeout(() => { state.swingState = 0; document.getElementById('power-bar').style.width = '0%'; }, 400);
    }, 60);
}

// --- Loop ---
function update() {
    if (controls.isLocked) {
        const moveDir = new THREE.Vector3();
        if (keys['KeyW']) moveDir.z -= 1; if (keys['KeyS']) moveDir.z += 1; if (keys['KeyA']) moveDir.x -= 1; if (keys['KeyD']) moveDir.x += 1;
        
        if(moveDir.length() > 0) {
            moveDir.normalize();
            // Rotate moveDir to match cameraYaw
            const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.cameraYaw);
            moveDir.applyQuaternion(q);
            
            const speed = keys['ShiftLeft'] ? 0.35 : 0.22;
            player.position.addScaledVector(moveDir, speed);
            // Player faces movement direction
            player.rotation.y = state.cameraYaw;
        }
    }

    // Camera Orbit Follow
    const camX = player.position.x + state.cameraDist * Math.sin(state.cameraYaw) * Math.cos(state.cameraPitch);
    const camY = player.position.y + state.cameraDist * -Math.sin(state.cameraPitch) + 1.5;
    const camZ = player.position.z + state.cameraDist * Math.cos(state.cameraYaw) * Math.cos(state.cameraPitch);
    
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1);
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

    // Hurley Animation
    const idleY = 0; const idleZ = -Math.PI/6; const idleX = Math.PI/4;
    if (state.isCharging) {
        state.power = Math.min(state.maxPower, state.power + state.chargeRate);
        document.getElementById('power-bar').style.width = `${state.power}%`;
        hurleyGroup.rotation.y = THREE.MathUtils.lerp(hurleyGroup.rotation.y, Math.PI/2.5, 0.1);
        hurleyGroup.rotation.z = THREE.MathUtils.lerp(hurleyGroup.rotation.z, -Math.PI/1.5, 0.1);
    } else if (state.swingState === 2) {
        hurleyGroup.rotation.y -= 0.7; hurleyGroup.rotation.z += 1.2;
    } else {
        hurleyGroup.rotation.y = THREE.MathUtils.lerp(hurleyGroup.rotation.y, idleY, 0.1);
        hurleyGroup.rotation.z = THREE.MathUtils.lerp(hurleyGroup.rotation.z, idleZ, 0.1);
        hurleyGroup.rotation.x = THREE.MathUtils.lerp(hurleyGroup.rotation.x, idleX, 0.1);
    }

    if (state.isSoloing) {
        const ballOffset = new THREE.Vector3(0.5, 1.2, 0.8).applyQuaternion(player.quaternion);
        ball.position.copy(player.position).add(ballOffset);
        ballPhys.vel.set(0, 0, 0);
    } else {
        ballPhys.vel.y += ballPhys.gravity; ball.position.add(ballPhys.vel);
        if (ball.position.y < 0.15) { ball.position.y = 0.15; ballPhys.vel.y *= -ballPhys.bounce; ballPhys.vel.x *= ballPhys.friction; ballPhys.vel.z *= ballPhys.friction; }
    }

    // AI & Scoring
    const targetX = THREE.MathUtils.clamp(ball.position.x, -3.0, 3.0);
    if (keeper.position.x < targetX) keeper.position.x += 0.07; if (keeper.position.x > targetX) keeper.position.x -= 0.07;
    if (!state.isSoloing && ball.position.distanceTo(keeper.position) < 0.8 && ballPhys.vel.z < 0) {
        ballPhys.vel.z *= -0.6; ballPhys.vel.y += 0.25; createParticles(ball.position.clone(), 8, 0xffff00, 0.05, 0.1);
    }
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