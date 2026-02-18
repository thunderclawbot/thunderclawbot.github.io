// main.js — Entry point for the hex grid game demo

import * as THREE from 'three';
import { createHexGrid } from './hex-grid.js';
import { setupCamera } from './camera.js';
import { setupInput } from './input.js';

function init() {
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0f, 60, 100);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = false;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x6088cc, 0.3);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // Grid
    const gridSize = 20;
    const { hexData, hexMeshes } = createHexGrid(scene, gridSize);

    // Camera
    const { camera, controls, updateKeys } = setupCamera(renderer, gridSize);

    // Input
    setupInput(camera, hexMeshes, hexData);

    // Handle resize
    function onResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        updateKeys();
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

init();
