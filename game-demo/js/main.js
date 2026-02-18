// main.js — Entry point for the hex grid game demo

import * as THREE from 'three';
import { createHexGrid } from './hex-grid.js';
import { setupCamera } from './camera.js';
import { setupInput } from './input.js';
import { createGameState, addBuilding } from './game-state.js';
import { RESOURCE_INFO, RESOURCE_TYPES } from './resources.js';
import { BUILDING_TYPES, canPlaceBuilding, deductCost, createBuildingMesh, updateBuildingMesh } from './buildings.js';
import { processTurn } from './turn.js';

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

    // Building meshes tracked by hex key
    const buildingMeshes = new Map();

    // Game state — initialized after race selection
    let gameState = null;

    // DOM elements
    const raceSelectEl = document.getElementById('race-select');
    const resourceBarEl = document.getElementById('resource-bar');
    const turnCounterEl = document.getElementById('turn-counter');
    const turnNumberEl = document.getElementById('turn-number');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const buildMenuEl = document.getElementById('build-menu');

    // ── Race Selection ──
    document.querySelectorAll('.race-card').forEach(function (card) {
        card.addEventListener('click', function () {
            const race = this.getAttribute('data-race');
            startGame(race);
        });
    });

    function startGame(race) {
        gameState = createGameState(race);

        // Place a free Town Center on a valid hex near the center
        const centerQ = Math.floor(gridSize / 2);
        const centerR = Math.floor(gridSize / 2);
        const tcHex = findValidHex(centerQ, centerR, 'town_center');
        if (tcHex) {
            placeBuilding('town_center', tcHex.q, tcHex.r);
        }

        // Hide race selection, show HUD
        raceSelectEl.classList.add('hidden');
        resourceBarEl.classList.add('visible');
        turnCounterEl.classList.add('visible');
        endTurnBtn.classList.add('visible');

        updateResourceBar();
        updateTurnCounter();
    }

    // Find a valid hex near (cq, cr) for a building type
    function findValidHex(cq, cr, buildingType) {
        // Spiral outward from center
        for (let radius = 0; radius < gridSize; radius++) {
            for (let dq = -radius; dq <= radius; dq++) {
                for (let dr = -radius; dr <= radius; dr++) {
                    const q = cq + dq;
                    const r = cr + dr;
                    const key = `${q},${r}`;
                    const hex = hexData.get(key);
                    if (!hex) continue;
                    const check = canPlaceBuilding(buildingType, hex, gameState.resources);
                    if (check.ok) return hex;
                }
            }
        }
        return null;
    }

    // ── Building Placement ──
    function placeBuilding(buildingType, q, r) {
        const def = BUILDING_TYPES[buildingType];
        const key = `${q},${r}`;
        const hex = hexData.get(key);

        // Deduct cost
        gameState.resources = deductCost(buildingType, gameState.resources);

        // Add to state
        addBuilding(gameState, buildingType, q, r, def.turnsToBuild);
        hex.building = { type: buildingType, turnsRemaining: def.turnsToBuild };

        // Create 3D mesh
        const mesh = createBuildingMesh(buildingType, q, r, def.turnsToBuild);
        scene.add(mesh);
        buildingMeshes.set(key, mesh);

        updateResourceBar();
    }

    // ── HUD Updates ──
    function updateResourceBar() {
        if (!gameState) return;
        resourceBarEl.innerHTML = RESOURCE_TYPES.map(function (type) {
            const info = RESOURCE_INFO[type];
            const amount = gameState.resources[type] || 0;
            return '<div class="resource-item">' +
                '<div class="resource-icon" style="background:' + info.color + '">' + info.icon + '</div>' +
                '<span class="resource-amount">' + amount + '</span>' +
                '</div>';
        }).join('');
    }

    function updateTurnCounter() {
        if (!gameState) return;
        turnNumberEl.textContent = gameState.turn;
    }

    // ── Build Menu ──
    function showBuildMenu(hexKey) {
        if (!gameState) return;
        const hex = hexData.get(hexKey);
        if (!hex) {
            buildMenuEl.classList.remove('visible');
            return;
        }

        // If hex has a building, show its info
        if (hex.building) {
            const bDef = BUILDING_TYPES[hex.building.type];
            let html = '<div class="build-menu-title">' + bDef.name + '</div>';
            if (hex.building.turnsRemaining > 0) {
                html += '<div class="build-option-info">Under construction: ' + hex.building.turnsRemaining + ' turn' + (hex.building.turnsRemaining !== 1 ? 's' : '') + ' left</div>';
            } else {
                const producing = Object.entries(bDef.resourcesPerTurn)
                    .filter(function (e) { return e[1] > 0; })
                    .map(function (e) { return '+' + e[1] + ' ' + RESOURCE_INFO[e[0]].label; })
                    .join(', ');
                if (producing) {
                    html += '<div class="build-option-info">Produces: ' + producing + '/turn</div>';
                }
            }
            buildMenuEl.innerHTML = html;
            buildMenuEl.classList.add('visible');
            return;
        }

        let html = '<div class="build-menu-title">Build</div>';
        let hasOptions = false;
        for (const [typeKey, def] of Object.entries(BUILDING_TYPES)) {
            if (typeKey === 'town_center') continue; // Can't manually build
            // Only show buildings valid for this terrain
            if (!def.requiredTerrain.includes(hex.terrain)) continue;
            hasOptions = true;
            const check = canPlaceBuilding(typeKey, hex, gameState.resources);

            const costParts = [];
            for (const [res, amt] of Object.entries(def.cost)) {
                if (amt > 0) {
                    const hasEnough = (gameState.resources[res] || 0) >= amt;
                    const cls = hasEnough ? '' : ' cost-short';
                    costParts.push('<span class="' + cls + '">' + RESOURCE_INFO[res].icon + amt + '</span>');
                }
            }

            const costStr = costParts.join(' ');
            const turnsStr = def.turnsToBuild > 0 ? def.turnsToBuild + ' turns' : 'Instant';
            const reason = check.ok ? '' : ' title="' + check.reason + '"';

            html += '<button class="build-option"' +
                (check.ok ? '' : ' disabled') +
                ' data-building="' + typeKey + '"' +
                reason + '>' +
                '<div class="build-option-name">' + def.name + '</div>' +
                '<div class="build-option-cost">' + costStr + '</div>' +
                '<div class="build-option-info">' + turnsStr + '</div>' +
                '</button>';
        }

        if (!hasOptions) {
            if (hex.terrain === 'water') {
                html += '<div class="build-option-info">Cannot build on water</div>';
            } else {
                html += '<div class="build-option-info">No buildings for this terrain</div>';
            }
        }

        buildMenuEl.innerHTML = html;
        buildMenuEl.classList.add('visible');

        // Bind click handlers
        buildMenuEl.querySelectorAll('.build-option:not(:disabled)').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const buildingType = this.getAttribute('data-building');
                placeBuilding(buildingType, hex.q, hex.r);
                buildMenuEl.classList.remove('visible');
                // Re-trigger hex info update
                if (inputApi) inputApi.refreshSelection();
            });
        });
    }

    function hideBuildMenu() {
        buildMenuEl.classList.remove('visible');
    }

    // ── End Turn ──
    endTurnBtn.addEventListener('click', function () {
        if (!gameState) return;

        processTurn(gameState, function onComplete(building) {
            // Building finished construction
            const key = building.q + ',' + building.r;
            const hex = hexData.get(key);
            if (hex && hex.building) {
                hex.building.turnsRemaining = 0;
            }
        });

        // Update building meshes for construction progress
        for (const building of gameState.buildings) {
            const key = building.q + ',' + building.r;
            const mesh = buildingMeshes.get(key);
            if (mesh) {
                // Remove old mesh, create updated one
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                const newMesh = createBuildingMesh(building.type, building.q, building.r, building.turnsRemaining);
                scene.add(newMesh);
                buildingMeshes.set(key, newMesh);
            }

            // Sync hex data
            const hex = hexData.get(key);
            if (hex && hex.building) {
                hex.building.turnsRemaining = building.turnsRemaining;
            }
        }

        updateResourceBar();
        updateTurnCounter();

        // Refresh build menu if open
        if (inputApi && inputApi.getSelectedKey()) {
            showBuildMenu(inputApi.getSelectedKey());
        }
    });

    // Input — connect with build menu callbacks
    const inputApi = setupInput(camera, hexMeshes, hexData, {
        onSelect: function (key) {
            if (key) {
                showBuildMenu(key);
            } else {
                hideBuildMenu();
            }
        },
        getGameState: function () {
            return gameState;
        },
    });

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
