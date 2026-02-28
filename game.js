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

// --- Croke Park Stadium Stands ---
function createStadium() {
    const standMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const seatMat = new THREE.MeshPhongMaterial({ color: 0x2244aa }); // Blue seats like Croke Park

    const createStand = (width, depth, x, z, rot) => {
        const standGroup = new THREE.Group();
        
        // Concrete base
        const baseGeo = new THREE.BoxGeometry(width, 10, depth);
        const base = new THREE.Mesh(baseGeo, standMat);
        standGroup.add(base);

        // Tiers (simplified steps)
        for(let i=1; i<=5; i++) {
            const tierGeo = new THREE.BoxGeometry(width, 4, depth - (i * 5));
            const tier = new THREE.Mesh(tierGeo, seatMat);
            tier.position.y = 5 + (i * 4);
            tier.position.z = -(i * 2.5);
            standGroup.add(tier);
        }

        standGroup.position.set(x, 5, z);
        standGroup.rotation.y = rot;
        scene.add(standGroup);
    };

    // Hogan Stand (Side)
    createStand(200, 60, -75, 0, Math.PI / 2);
    // Cusack Stand (Side)
    createStand(200, 60, 75, 0, -Math.PI / 2);
    // Davin Stand (End)
    createStand(120, 60, 0, 110, 0);
    // Hill 16 (The famous terrace - simpler)
    const hillGeo = new THREE.BoxGeometry(100, 5, 40);
    const hill = new THREE.Mesh(hillGeo, standMat);
    hill.position.set(0, 2.5, -100);
    scene.add(hill);
}
createStadium();

// --- Procedural Grass ---
function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2d5e1e';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20000; i++) {
        ctx.fillStyle = `rgba(45, ${94 + Math.random() * 20}, 30, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 8);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 40);
    return texture;
}

// --- Pitch ---
const pitchWidth = 90;
const pitchLength = 145;
const grassGeo = new THREE.PlaneGeometry(pitchWidth + 40, pitchLength + 40);
const grassMat = new THREE.MeshPhongMaterial({ map: createGrassTexture(), shininess: 5 });
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
createLine(pitchWidth, 0.6, 0, pitchLength/2);
createLine(pitchWidth, 0.6, 0, -pitchLength/2);
createLine(0.6, pitchLength, pitchWidth/2, 0);
createLine(0.6, pitchLength, -pitchWidth/2, 0);
[13, 20, 45, 65].forEach(m => {
    createLine(pitchWidth, 0.3, 0, pitchLength/2 - m);
    createLine(pitchWidth, 0.3, 0, -pitchLength/2 + m);
});
createLine(pitchWidth, 0.4, 0, 0);

// --- Goalposts ---
function createGoal(zPos) {
    const goalGroup = new THREE.Group();
    const postMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const netMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const uprightGeo = new THREE.CylinderGeometry(0.15, 0.15, 14);
    const leftPost = new THREE.Mesh(uprightGeo, postMat);
    leftPost.position.set(-3.25, 7, 0);
    leftPost.castShadow = true;
    goalGroup.add(leftPost);
    const rightPost = new THREE.Mesh(uprightGeo, postMat);
    rightPost.position.set(3.25, 7, 0);
    rightPost.castShadow = true;
    goalGroup.add(rightPost);
    const crossbarGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.5);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.5, 0);
    crossbar.castShadow = true;
    goalGroup.add(crossbar);
    const netGeo = new THREE.BoxGeometry(6.5, 2.5, 2.5);
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, 1.25, zPos > 0 ? 1.25 : -1.25);
    goalGroup.add(net);
    goalGroup.position.z = zPos;
    scene.add(goalGroup);
    return goalGroup;
}
createGoal(-pitchLength / 2);
createGoal(pitchLength / 2);

// --- Goalkeeper AI ---
function createKeeper(zPos) {
    const keeperGroup = new THREE.Group();
    const jerseyMat = new THREE.MeshPhongMaterial({ color: 0xffee00 }); // Yellow keeper jersey
    const limbMat = new THREE.MeshPhongMaterial({ color: 0xccaa88 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.3), jerseyMat);
    body.position.y = 1.3;
    keeperGroup.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), limbMat);
    head.position.y = 2.0;
    keeperGroup.add(head);

    keeperGroup.position.set(0, 0, zPos + (zPos > 0 ? -1 : 1));
    scene.add(keeperGroup);
    return keeperGroup;
}
const keeper1 = createKeeper(-pitchLength / 2);

// --- Sliotar ---
const ballGeo = new THREE.SphereGeometry(0.15, 32, 32);
const ballMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.castShadow = true;
ball.position.set(0, 5, 0);
scene.add(ball);

const ballPhys = { vel: new THREE.Vector3(0, 0, 0), gravity: -0.015, bounce: 0.65, friction: 0.99 };

function resetBall() {
    ball.position.set(0, 5, 0);
    ballPhys.vel.set(0, 0, 0);
}

// --- Player & Controls ---
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) {
        controls.lock();
    } else if (e.button === 0) {
        state.isCharging = true;
        state.power = 0;
    }
});

document.addEventListener('mouseup', (e) => {
    if (state.isCharging && e.button === 0) {
        strikeBall();
        state.isCharging = false;
        document.getElementById('power-bar').style.width = '0%';
    }
});

const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'KeyR') resetBall(); });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

const moveSpeed = 0.25;

// --- Hurley ---
function createHurley() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshPhongMaterial({ color: 0xe3c9a6 });
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.0, 12);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.y = 0.4;
    group.add(handle);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(0.1, 0); shape.quadraticCurveTo(0.25, 0.05, 0.3, 0.2);
    shape.lineTo(0.3, 0.35); shape.quadraticCurveTo(0.15, 0.4, 0, 0.3); shape.lineTo(0, 0);
    const bossGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    const boss = new THREE.Mesh(bossGeo, woodMat);
    boss.rotation.z = Math.PI / 1.1; boss.rotation.y = Math.PI / 2;
    boss.position.set(-0.04, -0.15, -0.05);
    group.add(boss);
    return group;
}
const hurleyGroup = createHurley();
hurleyGroup.position.set(0.6, -0.5, -0.8);
hurleyGroup.rotation.x = -Math.PI / 4;
camera.add(hurleyGroup);

function strikeBall() {
    const dist = camera.position.distanceTo(ball.position);
    if (dist < 3.5) {
        const initialRot = hurleyGroup.rotation.x;
        hurleyGroup.rotation.x -= 0.8;
        setTimeout(() => hurleyGroup.rotation.x = initialRot, 150);
        const finalStrength = 0.2 + (state.power / 100) * 1.2;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y += 0.35;
        dir.normalize();
        ballPhys.vel.copy(dir.multiplyScalar(finalStrength));
    }
}

// --- Game Loop ---
function update() {
    if (controls.isLocked) {
        const dir = new THREE.Vector3();
        if (keys['KeyW']) dir.z -= 1;
        if (keys['KeyS']) dir.z += 1;
        if (keys['KeyA']) dir.x -= 1;
        if (keys['KeyD']) dir.x += 1;
        dir.normalize().applyQuaternion(camera.quaternion);
        dir.y = 0;
        controls.getObject().position.add(dir.multiplyScalar(moveSpeed));
    }

    if (state.isCharging) {
        state.power = Math.min(state.maxPower, state.power + state.chargeRate);
        document.getElementById('power-bar').style.width = `${state.power}%`;
    }

    // Goalkeeper AI
    const keeperXLimit = 3.0;
    const keeperSpeed = 0.08;
    const targetX = THREE.MathUtils.clamp(ball.position.x, -keeperXLimit, keeperXLimit);
    if (keeper1.position.x < targetX) keeper1.position.x += keeperSpeed;
    if (keeper1.position.x > targetX) keeper1.position.x -= keeperSpeed;

    // Goalkeeper Save Check
    const distToKeeper = ball.position.distanceTo(keeper1.position);
    if (distToKeeper < 0.8 && ballPhys.vel.z < 0) {
        ballPhys.vel.z *= -0.5; // Block
        ballPhys.vel.y += 0.2;
    }

    // Ball Physics
    ballPhys.vel.y += ballPhys.gravity;
    ball.position.add(ballPhys.vel);
    if (ball.position.y < 0.15) {
        ball.position.y = 0.15;
        ballPhys.vel.y *= -ballPhys.bounce;
        ballPhys.vel.x *= ballPhys.friction;
        ballPhys.vel.z *= ballPhys.friction;
    }

    if (Math.abs(ball.position.x) > pitchWidth/2 + 10 || Math.abs(ball.position.z) > pitchLength/2 + 20) resetBall();

    // Scoring
    const checkGoal = (goalZ) => {
        if (Math.abs(ball.position.z - goalZ) < 0.6 && Math.abs(ball.position.x) < 3.25) {
            if (ball.position.y > 0.15 && ball.position.y < 2.5) {
                state.score += 3; updateScore(); resetBall();
            } else if (ball.position.y >= 2.5 && ball.position.y < 12) {
                state.score += 1; updateScore(); resetBall();
            }
        }
    };
    checkGoal(-pitchLength / 2);
    checkGoal(pitchLength / 2);
}

function updateScore() { document.getElementById('score').innerText = state.score; }

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();