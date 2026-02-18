// input.js — Hex selection via raycasting
// Click to select, hover for highlight, info overlay

import * as THREE from 'three';
import { TERRAIN } from './hex-grid.js';
import { BUILDING_TYPES } from './buildings.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Colors
const HOVER_EMISSIVE = 0x333333;
const SELECT_EMISSIVE = 0xfbbf24;

export function setupInput(camera, hexMeshes, hexData, callbacks) {
    let hoveredMesh = null;
    let selectedKey = null;

    const meshArray = Array.from(hexMeshes.values());
    const overlay = document.getElementById('hex-info');

    const onSelect = callbacks && callbacks.onSelect;
    const getGameState = callbacks && callbacks.getGameState;

    function getIntersected(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshArray, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }

    function clearHover() {
        if (hoveredMesh && hoveredMesh.userData.key !== selectedKey) {
            hoveredMesh.material = hoveredMesh._originalMaterial || hoveredMesh.material;
            if (hoveredMesh._hoverMaterial) {
                hoveredMesh._hoverMaterial.dispose();
                hoveredMesh._hoverMaterial = null;
            }
        }
        hoveredMesh = null;
    }

    function setHover(mesh) {
        if (mesh.userData.key === selectedKey) return;
        if (!mesh._originalMaterial) {
            mesh._originalMaterial = mesh.material;
        }
        const hoverMat = mesh.material.clone();
        hoverMat.emissive = new THREE.Color(HOVER_EMISSIVE);
        mesh._hoverMaterial = hoverMat;
        mesh.material = hoverMat;
        hoveredMesh = mesh;
    }

    function updateOverlay(key) {
        if (!key) {
            overlay.classList.remove('visible');
            return;
        }
        const data = hexData.get(key);
        if (!data) return;

        const terrain = TERRAIN[data.terrain];
        let html = '<div class="hex-coord">Hex (' + data.q + ', ' + data.r + ')</div>' +
            '<div class="hex-terrain">' + terrain.name + '</div>';

        if (data.building) {
            const def = BUILDING_TYPES[data.building.type];
            const status = data.building.turnsRemaining > 0
                ? ' (building: ' + data.building.turnsRemaining + ' turns)'
                : '';
            html += '<div class="hex-building">' + def.name + status + '</div>';
        }

        overlay.innerHTML = html;
        overlay.classList.add('visible');
    }

    function selectHex(key) {
        // Deselect previous
        if (selectedKey) {
            const prevMesh = hexMeshes.get(selectedKey);
            if (prevMesh) {
                prevMesh.material = prevMesh._originalMaterial || prevMesh.material;
                if (prevMesh._selectMaterial) {
                    prevMesh._selectMaterial.dispose();
                    prevMesh._selectMaterial = null;
                }
            }
        }

        selectedKey = key;

        if (key) {
            const mesh = hexMeshes.get(key);
            if (mesh) {
                if (!mesh._originalMaterial) {
                    mesh._originalMaterial = mesh.material;
                }
                const selMat = mesh.material.clone();
                selMat.emissive = new THREE.Color(SELECT_EMISSIVE);
                selMat.emissiveIntensity = 0.4;
                mesh._selectMaterial = selMat;
                mesh.material = selMat;
            }
        }

        updateOverlay(key);
        if (onSelect) onSelect(key);
    }

    // Mouse move — hover
    function onMouseMove(event) {
        const hit = getIntersected(event);
        if (hit !== hoveredMesh) {
            clearHover();
            if (hit) setHover(hit);
        }
    }

    // Click — select
    function onClick(event) {
        // Ignore clicks on UI overlays
        if (event.target.closest('#build-menu') ||
            event.target.closest('#end-turn-btn') ||
            event.target.closest('#race-select') ||
            event.target.closest('#resource-bar') ||
            event.target.closest('#turn-counter')) {
            return;
        }

        const hit = getIntersected(event);
        if (hit) {
            selectHex(hit.userData.key);
        } else {
            selectHex(null);
        }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    return {
        selectHex,
        getSelectedKey: function () { return selectedKey; },
        refreshSelection: function () {
            updateOverlay(selectedKey);
        },
    };
}
