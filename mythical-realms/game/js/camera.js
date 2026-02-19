// camera.js — Isometric-style camera with OrbitControls
// ~45 degree angle looking down at the hex grid

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { axialToWorld } from './hex-grid.js';

export function setupCamera(renderer, gridSize = 20) {
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );

    // Center of grid
    const center = axialToWorld(gridSize / 2, gridSize / 2);

    // Position camera at ~45 degree angle looking down
    const distance = gridSize * 1.5;
    camera.position.set(
        center.x + distance * 0.6,
        distance * 0.7,
        center.z + distance * 0.6
    );

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(center.x, 0, center.z);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // Zoom limits
    controls.minDistance = 5;
    controls.maxDistance = 80;

    // Restrict vertical angle to prevent going underground
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minPolarAngle = 0.2;

    // Pan with middle mouse
    controls.enablePan = true;
    controls.panSpeed = 1.0;

    // Touch controls — OrbitControls handles pinch-zoom and two-finger pan natively
    // ONE_FINGER = ROTATE (orbit), TWO_FINGER = DOLLY_PAN (pinch zoom + pan)
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
    };

    controls.update();

    // Arrow key panning
    const panSpeed = 0.5;
    const keyState = {};

    function onKeyDown(e) {
        keyState[e.key] = true;
    }

    function onKeyUp(e) {
        keyState[e.key] = false;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function updateKeys() {
        const panDelta = new THREE.Vector3();
        if (keyState['ArrowLeft'] || keyState['a']) panDelta.x -= panSpeed;
        if (keyState['ArrowRight'] || keyState['d']) panDelta.x += panSpeed;
        if (keyState['ArrowUp'] || keyState['w']) panDelta.z -= panSpeed;
        if (keyState['ArrowDown'] || keyState['s']) panDelta.z += panSpeed;

        if (panDelta.length() > 0) {
            controls.target.add(panDelta);
            camera.position.add(panDelta);
        }
    }

    // Handle resize
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', onResize);

    // Center camera on a world position (for double-tap)
    function panTo(worldX, worldZ) {
        var dx = worldX - controls.target.x;
        var dz = worldZ - controls.target.z;
        controls.target.x += dx;
        controls.target.z += dz;
        camera.position.x += dx;
        camera.position.z += dz;
    }

    return { camera, controls, updateKeys, panTo };
}
