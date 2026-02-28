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
scene.fog = new THREE.Fog(0x87ceeb, 0, 500);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

// --- Procedural Grass Texture ---
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
        // Visual reset of power bar
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
        // Animation
        const initialRot = hurleyGroup.rotation.x;
        hurleyGroup.rotation.x -= 0.8;
        setTimeout(() => hurleyGroup.rotation.x = initialRot, 150);

        // Power calculation (min 0.2, max 1.2)
        const finalStrength = 0.2 + (state.power / 100) * 1.0;
        
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

    // Power Meter Update
    if (state.isCharging) {
        state.power = Math.min(state.maxPower, state.power + state.chargeRate);
        document.getElementById('power-bar').style.width = `${state.power}%`;
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

    if (Math.abs(ball.position.x) > pitchWidth/2 + 10 || Math.abs(ball.position.z) > pitchLength/2 + 10) resetBall();

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