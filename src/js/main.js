import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import RAPIER from '@dimforge/rapier3d';
import { ParticleSystem } from './ParticleSystem.js';

// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Initialize particle system
let particleSystem;

// Initialize RAPIER and create particle system
const init = async () => {
    await RAPIER.init();
    
    // Create particle system
    particleSystem = new ParticleSystem(scene);

    // Create initial particles
    const initialCount = parseInt(document.getElementById('particleCount').value);
    particleSystem.setParticleCount(initialCount);

    // Start animation loop
    animate();
};

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Update particle system
    if (particleSystem) {
        particleSystem.update();
    }

    // Render scene
    renderer.render(scene, camera);
}

// UI Controls
document.getElementById('attraction').addEventListener('input', (e) => {
    if (particleSystem) {
        particleSystem.setAttractionMultiplier(parseFloat(e.target.value));
    }
});

document.getElementById('repulsion').addEventListener('input', (e) => {
    if (particleSystem) {
        particleSystem.setRepulsionMultiplier(parseFloat(e.target.value));
    }
});

document.getElementById('particleCount').addEventListener('input', (e) => {
    if (particleSystem) {
        particleSystem.setParticleCount(parseInt(e.target.value));
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize the application
init();
