import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Game State ---
const state = {
    score: 0,
    ballActive: true,
    lastStrikeTime: 0
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
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

// --- Pitch ---
const pitchWidth = 90;
const pitchLength = 145;
const grassGeo = new THREE.PlaneGeometry(pitchWidth + 20, pitchLength + 20);
const grassMat = new THREE.MeshPhongMaterial({ color: 0x2d5e1e });
const pitch = new THREE.Mesh(grassGeo, grassMat);
pitch.rotation.x = -Math.PI / 2;
pitch.receiveShadow = true;
scene.add(pitch);

// Pitch Lines (Simplified)
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const createLine = (w, h, x, z) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, lineMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.01, z);
    scene.add(mesh);
};
createLine(pitchWidth, 0.5, 0, pitchLength/2); // End line
createLine(pitchWidth, 0.5, 0, -pitchLength/2); // End line
createLine(0.5, pitchLength, pitchWidth/2, 0); // Side line
createLine(0.5, pitchLength, -pitchWidth/2, 0); // Side line

// --- Goalposts (H-shape) ---
function createGoal(zPos) {
    const goalGroup = new THREE.Group();
    const postMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const netMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

    // Uprights
    const uprightGeo = new THREE.CylinderGeometry(0.15, 0.15, 12);
    const leftPost = new THREE.Mesh(uprightGeo, postMat);
    leftPost.position.set(-3.25, 6, 0);
    leftPost.castShadow = true;
    goalGroup.add(leftPost);

    const rightPost = new THREE.Mesh(uprightGeo, postMat);
    rightPost.position.set(3.25, 6, 0);
    rightPost.castShadow = true;
    goalGroup.add(rightPost);

    // Crossbar
    const crossbarGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.5);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.5, 0);
    crossbar.castShadow = true;
    goalGroup.add(crossbar);

    // Net (Box behind the bottom part)
    const netGeo = new THREE.BoxGeometry(6.5, 2.5, 2);
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, 1.25, zPos > 0 ? 1 : -1);
    goalGroup.add(net);

    goalGroup.position.z = zPos;
    scene.add(goalGroup);
    return goalGroup;
}

const goal1 = createGoal(-pitchLength / 2);

// --- Sliotar (Ball) ---
const ballGeo = new THREE.SphereGeometry(0.15, 16, 16);
const ballMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.castShadow = true;
ball.position.set(0, 5, 0);
scene.add(ball);

const ballPhys = {
    vel: new THREE.Vector3(0, 0, 0),
    gravity: -0.015,
    bounce: 0.6,
    friction: 0.98
};

function resetBall() {
    ball.position.set(0, 10, 0);
    ballPhys.vel.set(0, 0, 0);
}

// --- Player & Controls ---
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => {
    if (!controls.isLocked) {
        controls.lock();
    } else {
        strikeBall();
    }
});

const keys = {};
document.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if(e.code === 'KeyR') resetBall();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

const moveSpeed = 0.2;
const playerVelocity = new THREE.Vector3();

// --- Hurley (Visual representation) ---
const hurleyGroup = new THREE.Group();
const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
const handleMat = new THREE.MeshPhongMaterial({ color: 0xe3c9a6 });
const handle = new THREE.Mesh(handleGeo, handleMat);
hurleyGroup.add(handle);

const bossGeo = new THREE.BoxGeometry(0.08, 0.3, 0.2);
const boss = new THREE.Mesh(bossGeo, handleMat);
boss.position.y = -0.4;
hurleyGroup.add(boss);

hurleyGroup.position.set(0.5, -0.4, -0.8);
hurleyGroup.rotation.x = -Math.PI / 4;
camera.add(hurleyGroup);

function strikeBall() {
    const dist = camera.position.distanceTo(ball.position);
    if (dist < 3) {
        // Simple swing animation trigger (visual only for now)
        hurleyGroup.rotation.x -= 1;
        setTimeout(() => hurleyGroup.rotation.x += 1, 100);

        // Physics strike
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        
        // Add a bit of upward lift
        dir.y += 0.4;
        dir.normalize();
        
        const strength = 0.8;
        ballPhys.vel.copy(dir.multiplyScalar(strength));
        state.lastStrikeTime = Date.now();
    }
}

// --- Game Loop ---
function update() {
    if (controls.isLocked) {
        // Movement
        const dir = new THREE.Vector3();
        if (keys['KeyW']) dir.z -= 1;
        if (keys['KeyS']) dir.z += 1;
        if (keys['KeyA']) dir.x -= 1;
        if (keys['KeyD']) dir.x += 1;
        dir.normalize().applyQuaternion(camera.quaternion);
        dir.y = 0; // Keep on ground
        
        controls.getObject().position.add(dir.multiplyScalar(moveSpeed));
    }

    // Ball Physics
    ballPhys.vel.y += ballPhys.gravity;
    ball.position.add(ballPhys.vel);

    // Ground collision
    if (ball.position.y < 0.15) {
        ball.position.y = 0.15;
        ballPhys.vel.y *= -ballPhys.bounce;
        ballPhys.vel.x *= ballPhys.friction;
        ballPhys.vel.z *= ballPhys.friction;
    }

    // Boundary check
    if (Math.abs(ball.position.x) > pitchWidth/2 + 5 || Math.abs(ball.position.z) > pitchLength/2 + 5) {
        resetBall();
    }

    // Scoring (Goal at -pitchLength/2)
    const goalZ = -pitchLength / 2;
    if (Math.abs(ball.position.z - goalZ) < 0.5 && Math.abs(ball.position.x) < 3.25) {
        if (ball.position.y > 0.15 && ball.position.y < 2.5) {
            // GOAL! (3 points)
            state.score += 3;
            document.getElementById('score').innerText = state.score;
            resetBall();
        } else if (ball.position.y >= 2.5 && ball.position.y < 12) {
            // POINT! (1 point)
            state.score += 1;
            document.getElementById('score').innerText = state.score;
            resetBall();
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();