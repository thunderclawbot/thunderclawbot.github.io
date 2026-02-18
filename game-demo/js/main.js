// main.js — Entry point for the hex grid game demo

import * as THREE from 'three';
import { createHexGrid, axialToWorld, TERRAIN, HEX_SIZE } from './hex-grid.js';
import { setupCamera } from './camera.js';
import { setupInput } from './input.js';
import { createGameState, addBuilding, getAvailableWorkers, getAssignedWorkers, startHexImprovement, saveGame, loadGame, hasSavedGame, deleteSavedGame } from './game-state.js';
import { RESOURCE_INFO, RESOURCE_TYPES, TERRAIN_BONUSES } from './resources.js';
import { BUILDING_TYPES, canPlaceBuilding, canUpgradeBuilding, deductCost, deductUpgradeCost, createBuildingMesh, recalcPopulationCap, UPGRADE_COSTS, LEVEL_MULTIPLIERS, getBuildingsForRace, getBuildingColor } from './buildings.js';
import { processTurn } from './turn.js';
import { RACE_TECH_TREES, TECH_STATE, canResearchTech, startResearch, getUnlockedBuildings, getCurrentResearch, createTechState } from './tech-tree.js';
import { createStorytellerState, processStorytellerTurn, getQuestProgress, initBuildingHP } from './storyteller.js';
import { UNIT_TYPES, getUnitsForRace, canTrainUnit, trainUnit, createUnitMesh, getMovementRange, moveUnit, resolveCombat, getRallyBonus, processUnitTurn, getVisibleHexes, applyFogOfWar, getTrainableUnits, activateCharge } from './units.js';

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

    // Unit meshes tracked by hex key
    const unitMeshes = new Map();

    // Movement range highlight meshes
    var moveHighlights = [];

    // Selected unit state
    var selectedUnit = null;
    var reachableHexes = [];

    // Resource gathering particles
    const gatherParticles = [];

    // Game state — initialized after race selection
    let gameState = null;

    // DOM elements
    const raceSelectEl = document.getElementById('race-select');
    const resourceBarEl = document.getElementById('resource-bar');
    const turnCounterEl = document.getElementById('turn-counter');
    const turnNumberEl = document.getElementById('turn-number');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const buildMenuEl = document.getElementById('build-menu');
    const popBarEl = document.getElementById('pop-bar');
    const minimapCanvas = document.getElementById('minimap-canvas');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const techTreeBtn = document.getElementById('tech-tree-btn');
    const techTreePanel = document.getElementById('tech-tree-panel');
    const techTreeClose = document.getElementById('tech-tree-close');
    const techTreeContent = document.getElementById('tech-tree-content');
    const researchStatusEl = document.getElementById('research-status');
    var eventToastEl = document.getElementById('event-toast');
    var eventToastCategory = document.getElementById('event-toast-category');
    var eventToastName = document.getElementById('event-toast-name');
    var eventToastText = document.getElementById('event-toast-text');
    var eventToastResult = document.getElementById('event-toast-result');
    var eventToastDismiss = document.getElementById('event-toast-dismiss');
    var questPanelEl = document.getElementById('quest-panel');
    var questPanelContent = document.getElementById('quest-panel-content');
    var eventLogBtn = document.getElementById('event-log-btn');
    var eventLogPanel = document.getElementById('event-log-panel');
    var eventLogClose = document.getElementById('event-log-close');
    var eventLogContent = document.getElementById('event-log-content');
    var combatLogEl = document.getElementById('combat-log');
    var combatLogContent = document.getElementById('combat-log-content');
    var combatLogEntries = [];

    // Storyteller state
    var storytellerState = null;
    var toastQueue = [];
    var toastShowing = false;

    // ── Race Selection ──
    document.querySelectorAll('.race-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var race = this.getAttribute('data-race');
            startGame(race);
        });
    });

    // Continue button for saved games
    var continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        if (hasSavedGame()) {
            continueBtn.classList.add('visible');
            continueBtn.addEventListener('click', function () {
                var saved = loadGame();
                if (saved) {
                    restoreGame(saved);
                }
            });
        }
    }

    function startGame(race) {
        gameState = createGameState(race);
        storytellerState = createStorytellerState();

        // Place a free Town Center on a valid hex near the center
        var centerQ = Math.floor(gridSize / 2);
        var centerR = Math.floor(gridSize / 2);
        var tcHex = findValidHex(centerQ, centerR, 'town_center');
        if (tcHex) {
            placeBuilding('town_center', tcHex.q, tcHex.r);
            // Auto-assign 2 workers to Town Center
            var tcBuilding = gameState.buildings[gameState.buildings.length - 1];
            tcBuilding.workers = 2;
        }

        gameState.units = [];
        initBuildingHP(gameState);
        recalcPopulationCap(gameState);
        updateFogOfWar();
        showHUD();
    }

    function restoreGame(state) {
        gameState = state;

        // Ensure new fields exist for older saves
        if (!gameState.population) gameState.population = { current: 5, cap: 5 };
        if (!gameState.hexImprovements) gameState.hexImprovements = [];
        if (!gameState.techState) gameState.techState = createTechState(gameState.race);
        if (!gameState.units) gameState.units = [];

        // Restore or create storyteller state
        if (gameState.storyteller) {
            storytellerState = gameState.storyteller;
        } else {
            storytellerState = createStorytellerState();
        }

        // Rebuild building meshes from state
        for (var i = 0; i < gameState.buildings.length; i++) {
            var b = gameState.buildings[i];
            if (!b.level) b.level = 1;
            if (b.workers === undefined) b.workers = 0;
            var key = b.q + ',' + b.r;
            var hex = hexData.get(key);
            if (hex) {
                hex.building = { type: b.type, turnsRemaining: b.turnsRemaining, level: b.level };
            }
            var mesh = createBuildingMesh(b.type, b.q, b.r, b.turnsRemaining, b.level, gameState.race);
            scene.add(mesh);
            buildingMeshes.set(key, mesh);
        }

        // Rebuild hex improvements
        for (var j = 0; j < gameState.hexImprovements.length; j++) {
            var imp = gameState.hexImprovements[j];
            var impKey = imp.q + ',' + imp.r;
            var impHex = hexData.get(impKey);
            if (impHex) {
                impHex.improvement = { turnsRemaining: imp.turnsRemaining, bonus: imp.bonus };
            }
        }

        recalcPopulationCap(gameState);
        rebuildUnitMeshes();
        updateFogOfWar();
        showHUD();
    }

    function showHUD() {
        raceSelectEl.classList.add('hidden');
        resourceBarEl.classList.add('visible');
        turnCounterEl.classList.add('visible');
        endTurnBtn.classList.add('visible');
        popBarEl.classList.add('visible');
        document.getElementById('save-load-bar').classList.add('visible');
        if (techTreeBtn) techTreeBtn.classList.add('visible');
        if (eventLogBtn) eventLogBtn.classList.add('visible');

        updateResourceBar();
        updateTurnCounter();
        updatePopBar();
        updateResearchStatus();
        updateQuestPanel();
        drawMinimap();
    }

    // ── Unit Helpers ──

    function rebuildUnitMeshes() {
        // Clear existing
        unitMeshes.forEach(function (mesh) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        unitMeshes.clear();

        if (!gameState || !gameState.units) return;

        var visible = getVisibleHexes(gameState, hexData);

        for (var i = 0; i < gameState.units.length; i++) {
            var unit = gameState.units[i];
            if (unit.turnsToReady > 0) continue; // Not visible until ready
            var key = unit.q + ',' + unit.r;

            // Only show units in visible hexes (fog of war)
            if (unit.owner !== 'player' && !visible.has(key)) continue;

            var mesh = createUnitMesh(unit.type, unit.q, unit.r, gameState.race, unit.owner);
            if (mesh) {
                scene.add(mesh);
                unitMeshes.set(key, mesh);
            }
        }
    }

    function updateFogOfWar() {
        if (!gameState) return;
        var visible = getVisibleHexes(gameState, hexData);

        // Mark newly visible hexes as explored
        visible.forEach(function (key) {
            if (gameState.exploredHexes.indexOf(key) === -1) {
                gameState.exploredHexes.push(key);
            }
        });

        applyFogOfWar(hexMeshes, hexData, visible, gameState.exploredHexes);
    }

    function showMoveRange(unit) {
        clearMoveRange();
        reachableHexes = getMovementRange(unit, hexData, gameState);

        for (var i = 0; i < reachableHexes.length; i++) {
            var rh = reachableHexes[i];
            var pos = axialToWorld(rh.q, rh.r);
            var ringGeo = new THREE.RingGeometry(HEX_SIZE * 0.5, HEX_SIZE * 0.65, 6);
            var color = rh.hasEnemy ? 0xef4444 : 0x60a5fa;
            var ringMat = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
            });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(pos.x, 0.32, pos.z);
            scene.add(ring);
            moveHighlights.push(ring);
        }
    }

    function clearMoveRange() {
        for (var i = 0; i < moveHighlights.length; i++) {
            scene.remove(moveHighlights[i]);
            moveHighlights[i].geometry.dispose();
            moveHighlights[i].material.dispose();
        }
        moveHighlights = [];
        reachableHexes = [];
    }

    function deselectUnit() {
        selectedUnit = null;
        clearMoveRange();
    }

    function addCombatLog(text) {
        combatLogEntries.push({ turn: gameState ? gameState.turn : 0, text: text });
        updateCombatLog();
    }

    function updateCombatLog() {
        if (!combatLogContent) return;
        if (combatLogEntries.length === 0) {
            combatLogEl.classList.remove('visible');
            return;
        }
        // Show last 5 entries
        var recent = combatLogEntries.slice(-5);
        var html = '';
        for (var i = recent.length - 1; i >= 0; i--) {
            html += '<div class="combat-log-entry">';
            html += '<span class="combat-log-turn">T' + recent[i].turn + '</span> ';
            html += recent[i].text;
            html += '</div>';
        }
        combatLogContent.innerHTML = html;
        combatLogEl.classList.add('visible');
    }

    function handleUnitClick(hexKey) {
        if (!gameState || !gameState.units) return false;

        var hex = hexData.get(hexKey);
        if (!hex) return false;

        var parts = hexKey.split(',');
        var clickQ = parseInt(parts[0]);
        var clickR = parseInt(parts[1]);

        // If we have a selected unit and clicked on a reachable hex, move
        if (selectedUnit) {
            var isReachable = false;
            var hasEnemy = false;
            for (var r = 0; r < reachableHexes.length; r++) {
                if (reachableHexes[r].q === clickQ && reachableHexes[r].r === clickR) {
                    isReachable = true;
                    hasEnemy = reachableHexes[r].hasEnemy;
                    break;
                }
            }

            if (isReachable) {
                if (hasEnemy) {
                    // Combat
                    var defender = null;
                    for (var d = 0; d < gameState.units.length; d++) {
                        if (gameState.units[d].q === clickQ && gameState.units[d].r === clickR && gameState.units[d].owner !== selectedUnit.owner) {
                            defender = gameState.units[d];
                            break;
                        }
                    }
                    if (defender) {
                        // Apply rally bonus
                        var rallyBonus = getRallyBonus(selectedUnit, gameState);
                        var origAttack = UNIT_TYPES[selectedUnit.type].attack;
                        if (rallyBonus > 0) {
                            UNIT_TYPES[selectedUnit.type].attack += rallyBonus;
                        }

                        var result = resolveCombat(selectedUnit, defender);

                        // Restore original attack
                        if (rallyBonus > 0) {
                            UNIT_TYPES[selectedUnit.type].attack = origAttack;
                        }

                        addCombatLog(result.log);
                        showToast('challenge', 'Combat', result.log, '');

                        // If defender dead, move attacker to that hex
                        if (defender.hp <= 0) {
                            // Remove defender
                            var defIdx = gameState.units.indexOf(defender);
                            if (defIdx >= 0) gameState.units.splice(defIdx, 1);
                            // Move attacker
                            moveUnit(selectedUnit, clickQ, clickR, hexData);
                        } else if (selectedUnit.hp <= 0) {
                            // Attacker defeated
                            var atkIdx = gameState.units.indexOf(selectedUnit);
                            if (atkIdx >= 0) gameState.units.splice(atkIdx, 1);
                        }
                        // Otherwise both survive, attacker doesn't move
                    }
                } else {
                    // Normal move
                    moveUnit(selectedUnit, clickQ, clickR, hexData);
                }

                deselectUnit();
                rebuildUnitMeshes();
                updateFogOfWar();
                drawMinimap();
                return true;
            }
        }

        // Check if clicking on own unit to select it
        for (var u = 0; u < gameState.units.length; u++) {
            var unit = gameState.units[u];
            if (unit.q === clickQ && unit.r === clickR && unit.owner === 'player' && unit.turnsToReady <= 0) {
                if (selectedUnit === unit) {
                    // Clicking same unit deselects
                    deselectUnit();
                } else {
                    selectedUnit = unit;
                    showMoveRange(unit);
                }
                return true;
            }
        }

        // Clicked on empty hex with a unit selected — deselect
        if (selectedUnit) {
            deselectUnit();
            return false; // Let normal hex selection happen
        }

        return false;
    }

    // Find a valid hex near (cq, cr) for a building type
    function findValidHex(cq, cr, buildingType) {
        for (var radius = 0; radius < gridSize; radius++) {
            for (var dq = -radius; dq <= radius; dq++) {
                for (var dr = -radius; dr <= radius; dr++) {
                    var q = cq + dq;
                    var r = cr + dr;
                    var key = q + ',' + r;
                    var hex = hexData.get(key);
                    if (!hex) continue;
                    var check = canPlaceBuilding(buildingType, hex, gameState.resources);
                    if (check.ok) return hex;
                }
            }
        }
        return null;
    }

    // ── Building Placement ──
    function placeBuilding(buildingType, q, r) {
        var def = BUILDING_TYPES[buildingType];
        var key = q + ',' + r;
        var hex = hexData.get(key);

        // Deduct cost
        gameState.resources = deductCost(buildingType, gameState.resources);

        // Add to state
        addBuilding(gameState, buildingType, q, r, def.turnsToBuild);
        hex.building = { type: buildingType, turnsRemaining: def.turnsToBuild, level: 1 };

        // Create 3D mesh with race color
        var mesh = createBuildingMesh(buildingType, q, r, def.turnsToBuild, 1, gameState.race);
        scene.add(mesh);
        buildingMeshes.set(key, mesh);

        updateResourceBar();
        updatePopBar();
        drawMinimap();
    }

    // ── Building Upgrade ──
    function upgradeBuilding(buildingState) {
        var nextLevel = buildingState.level + 1;
        gameState.resources = deductUpgradeCost(nextLevel, gameState.resources);
        buildingState.level = nextLevel;

        var key = buildingState.q + ',' + buildingState.r;
        var hex = hexData.get(key);
        if (hex && hex.building) {
            hex.building.level = nextLevel;
        }

        // Replace mesh
        var oldMesh = buildingMeshes.get(key);
        if (oldMesh) {
            scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            oldMesh.material.dispose();
        }
        var newMesh = createBuildingMesh(buildingState.type, buildingState.q, buildingState.r, 0, nextLevel, gameState.race);
        scene.add(newMesh);
        buildingMeshes.set(key, newMesh);

        recalcPopulationCap(gameState);
        updateResourceBar();
        updatePopBar();
    }

    // ── HUD Updates ──
    function updateResourceBar() {
        if (!gameState) return;
        resourceBarEl.innerHTML = RESOURCE_TYPES.map(function (type) {
            var info = RESOURCE_INFO[type];
            var amount = gameState.resources[type] || 0;
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

    function updatePopBar() {
        if (!gameState) return;
        var assigned = getAssignedWorkers(gameState);
        var avail = getAvailableWorkers(gameState);
        popBarEl.innerHTML =
            '<span class="pop-label">Pop</span>' +
            '<span class="pop-number">' + gameState.population.current + '/' + gameState.population.cap + '</span>' +
            '<span class="pop-sep">|</span>' +
            '<span class="pop-label">Workers</span>' +
            '<span class="pop-number">' + assigned + ' assigned, ' + avail + ' free</span>';
    }

    function updateResearchStatus() {
        if (!gameState || !researchStatusEl) return;
        var currentId = getCurrentResearch(gameState.techState);
        if (currentId) {
            var tree = RACE_TECH_TREES[gameState.race];
            var tech = tree[currentId];
            var ts = gameState.techState[currentId];
            researchStatusEl.innerHTML = '<span class="research-label">Researching:</span> ' +
                '<span class="research-name">' + tech.name + '</span> ' +
                '<span class="research-turns">(' + ts.turnsRemaining + ' turns)</span>';
            researchStatusEl.classList.add('visible');
        } else {
            researchStatusEl.classList.remove('visible');
        }
    }

    // ── Toast Notification System ──
    function showToast(category, name, text, result) {
        toastQueue.push({ category: category, name: name, text: text, result: result });
        if (!toastShowing) showNextToast();
    }

    function showNextToast() {
        if (toastQueue.length === 0) { toastShowing = false; return; }
        toastShowing = true;
        var item = toastQueue.shift();
        eventToastEl.className = 'event-' + item.category;
        eventToastCategory.textContent = item.category.toUpperCase();
        eventToastName.textContent = item.name;
        eventToastText.textContent = item.text;
        eventToastResult.textContent = item.result || '';
        eventToastEl.classList.add('visible');
    }

    if (eventToastDismiss) {
        eventToastDismiss.addEventListener('click', function () {
            eventToastEl.classList.remove('visible');
            setTimeout(showNextToast, 150);
        });
    }

    // ── Quest Panel ──
    function updateQuestPanel() {
        if (!storytellerState || !questPanelContent) return;
        var quests = storytellerState.activeQuests;
        if (quests.length === 0) { questPanelEl.classList.remove('visible'); return; }

        var html = '';
        for (var i = 0; i < quests.length; i++) {
            var q = quests[i];
            var progress = getQuestProgress(q, gameState);
            var pct = Math.min(100, Math.floor((progress.current / progress.target) * 100));
            var rewardParts = [];
            for (var res in q.reward) {
                if (q.reward[res] > 0) rewardParts.push('+' + q.reward[res] + ' ' + res);
            }
            html += '<div class="quest-item">';
            html += '<div class="quest-item-name">' + q.name + '</div>';
            html += '<div class="quest-item-desc">' + q.description + '</div>';
            html += '<div class="quest-item-progress">';
            html += '<div class="quest-progress-bar"><div class="quest-progress-fill" style="width:' + pct + '%"></div></div>';
            html += '<span class="quest-progress-text">' + progress.current + '/' + progress.target + '</span>';
            html += '</div>';
            html += '<div class="quest-turns-left">' + q.turnsRemaining + ' turns left</div>';
            html += '<div class="quest-reward">Reward: ' + rewardParts.join(', ') + '</div>';
            html += '</div>';
        }
        questPanelContent.innerHTML = html;
        questPanelEl.classList.add('visible');
    }

    // ── Event Log ──
    function renderEventLog() {
        if (!storytellerState || !eventLogContent) return;
        var log = storytellerState.eventLog;
        if (log.length === 0) {
            eventLogContent.innerHTML = '<div class="event-log-empty">No events yet. Keep playing!</div>';
            return;
        }
        var html = '';
        for (var i = log.length - 1; i >= 0; i--) {
            var entry = log[i];
            html += '<div class="event-log-entry log-' + entry.category + '">';
            html += '<span class="event-log-turn">Turn ' + entry.turn + '</span>';
            html += '<div class="event-log-name">' + entry.name + '</div>';
            html += '<div class="event-log-text">' + entry.text + '</div>';
            if (entry.result) html += '<div class="event-log-result">' + entry.result + '</div>';
            html += '</div>';
        }
        eventLogContent.innerHTML = html;
    }

    if (eventLogBtn) {
        eventLogBtn.addEventListener('click', function () {
            if (eventLogPanel.classList.contains('visible')) {
                eventLogPanel.classList.remove('visible');
            } else {
                renderEventLog();
                eventLogPanel.classList.add('visible');
            }
        });
    }
    if (eventLogClose) {
        eventLogClose.addEventListener('click', function () {
            eventLogPanel.classList.remove('visible');
        });
    }

    // ── Quest Celebration ──
    function spawnCelebration() {
        var container = document.createElement('div');
        container.className = 'quest-celebration';
        document.body.appendChild(container);
        var colors = ['#fbbf24', '#10b981', '#60a5fa', '#ef4444', '#a78bfa', '#e0e0e6'];
        for (var i = 0; i < 20; i++) {
            var p = document.createElement('div');
            p.className = 'celebration-particle';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            var angle = Math.random() * Math.PI * 2;
            var dist = 40 + Math.random() * 80;
            p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
            p.style.animationDelay = (Math.random() * 0.2) + 's';
            container.appendChild(p);
        }
        setTimeout(function () { document.body.removeChild(container); }, 1200);
    }

    // ── Build Menu ──
    function showBuildMenu(hexKey) {
        if (!gameState) return;
        var hex = hexData.get(hexKey);
        if (!hex) {
            buildMenuEl.classList.remove('visible');
            return;
        }

        // If hex has a building, show its info + workers + upgrade
        if (hex.building) {
            var bType = hex.building.type;
            var bDef = BUILDING_TYPES[bType];
            // Find building in state
            var buildingState = null;
            for (var i = 0; i < gameState.buildings.length; i++) {
                var b = gameState.buildings[i];
                if (b.q === hex.q && b.r === hex.r) {
                    buildingState = b;
                    break;
                }
            }

            var html = '<div class="build-menu-title">' + bDef.name;
            var level = buildingState ? buildingState.level || 1 : 1;
            if (level > 1) html += ' Lv.' + level;
            html += '</div>';

            // Show HP if building has been damaged
            if (buildingState && buildingState.hp !== undefined && buildingState.maxHp && buildingState.hp < buildingState.maxHp) {
                var hpPct = Math.floor((buildingState.hp / buildingState.maxHp) * 100);
                var hpColor = hpPct > 50 ? '#10b981' : hpPct > 25 ? '#fbbf24' : '#ef4444';
                html += '<div class="build-option-info" style="color:' + hpColor + '">HP: ' + buildingState.hp + '/' + buildingState.maxHp + '</div>';
            }

            if (hex.building.turnsRemaining > 0) {
                html += '<div class="build-option-info">Under construction: ' + hex.building.turnsRemaining + ' turn' + (hex.building.turnsRemaining !== 1 ? 's' : '') + ' left</div>';
            } else {
                // Production info (scaled by level)
                var levelMul = LEVEL_MULTIPLIERS[level] || 1;
                var producing = Object.entries(bDef.resourcesPerTurn)
                    .filter(function (e) { return e[1] > 0; })
                    .map(function (e) { return '+' + Math.floor(e[1] * levelMul) + ' ' + RESOURCE_INFO[e[0]].label; })
                    .join(', ');
                if (producing) {
                    html += '<div class="build-option-info">Produces: ' + producing + '/turn</div>';
                }

                // Terrain bonus
                var tBonus = TERRAIN_BONUSES[hex.terrain];
                if (tBonus) {
                    var bonusParts = [];
                    for (var res in tBonus) {
                        if (tBonus[res] > 0) bonusParts.push('+' + tBonus[res] + ' ' + RESOURCE_INFO[res].label);
                    }
                    if (bonusParts.length > 0) {
                        html += '<div class="build-option-info terrain-bonus">Terrain: ' + bonusParts.join(', ') + '</div>';
                    }
                }

                // Worker slots
                if (buildingState && bDef.workerSlots > 0) {
                    var workers = buildingState.workers || 0;
                    var maxW = bDef.workerSlots;
                    var avail = getAvailableWorkers(gameState);
                    html += '<div class="worker-panel">';
                    html += '<span class="worker-label">Workers: ' + workers + '/' + maxW + '</span>';
                    if (workers < maxW && avail > 0) {
                        html += ' <button class="worker-btn" data-action="add">+</button>';
                    }
                    if (workers > 0) {
                        html += ' <button class="worker-btn" data-action="remove">-</button>';
                    }
                    if (workers === 0 && maxW > 0) {
                        html += ' <span class="worker-warn">No workers — idle</span>';
                    }
                    html += '</div>';
                }

                // Upgrade button
                if (buildingState && level < 3) {
                    var upCheck = canUpgradeBuilding(buildingState, gameState.resources);
                    var nextLevel = level + 1;
                    var upCost = UPGRADE_COSTS[nextLevel];
                    var costParts = [];
                    for (var r2 in upCost) {
                        if (upCost[r2] > 0) {
                            var has = (gameState.resources[r2] || 0) >= upCost[r2];
                            costParts.push('<span class="' + (has ? '' : 'cost-short') + '">' + RESOURCE_INFO[r2].icon + upCost[r2] + '</span>');
                        }
                    }
                    html += '<button class="build-option upgrade-btn"' + (upCheck.ok ? '' : ' disabled') + '>' +
                        '<div class="build-option-name">Upgrade to Lv.' + nextLevel + '</div>' +
                        '<div class="build-option-cost">' + costParts.join(' ') + '</div>' +
                        '</button>';
                }

                // Unit training section
                var trainable = getTrainableUnits(bType, gameState.race);
                if (trainable.length > 0) {
                    html += '<div class="unit-train-section">';
                    html += '<div class="unit-train-title">Train Units</div>';
                    for (var ti = 0; ti < trainable.length; ti++) {
                        var uTypeKey = trainable[ti];
                        var uDef = UNIT_TYPES[uTypeKey];
                        var uCheck = canTrainUnit(uTypeKey, gameState, hexData);
                        var uCostParts = [];
                        for (var ures in uDef.cost) {
                            if (uDef.cost[ures] > 0) {
                                var uHas = (gameState.resources[ures] || 0) >= uDef.cost[ures];
                                uCostParts.push('<span class="' + (uHas ? '' : 'cost-short') + '">' + RESOURCE_INFO[ures].icon + uDef.cost[ures] + '</span>');
                            }
                        }
                        html += '<button class="build-option train-btn"' + (uCheck.ok ? '' : ' disabled title="' + (uCheck.reason || '') + '"') +
                            ' data-unit="' + uTypeKey + '">' +
                            '<div class="build-option-name">' + uDef.name + (uDef.isHero ? ' (Hero)' : '') + '</div>' +
                            '<div class="build-option-cost">' + uCostParts.join(' ') + '</div>' +
                            '<div class="build-option-info">' + uDef.trainTurns + ' turn' + (uDef.trainTurns !== 1 ? 's' : '') +
                            ' | HP:' + uDef.hp + ' ATK:' + uDef.attack + ' DEF:' + uDef.defense + '</div>' +
                            '</button>';
                    }
                    html += '</div>';
                }
            }

            buildMenuEl.innerHTML = html;
            buildMenuEl.classList.add('visible');

            // Bind worker buttons
            buildMenuEl.querySelectorAll('.worker-btn').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (!buildingState) return;
                    var action = this.getAttribute('data-action');
                    if (action === 'add' && buildingState.workers < bDef.workerSlots && getAvailableWorkers(gameState) > 0) {
                        buildingState.workers++;
                    } else if (action === 'remove' && buildingState.workers > 0) {
                        buildingState.workers--;
                    }
                    updatePopBar();
                    showBuildMenu(hexKey); // Refresh panel
                });
            });

            // Bind upgrade button
            var upgradeBtn = buildMenuEl.querySelector('.upgrade-btn:not(:disabled)');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    upgradeBuilding(buildingState);
                    showBuildMenu(hexKey);
                });
            }

            // Bind train unit buttons
            buildMenuEl.querySelectorAll('.train-btn:not(:disabled)').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var unitTypeKey = this.getAttribute('data-unit');
                    var trained = trainUnit(unitTypeKey, gameState);
                    if (trained) {
                        rebuildUnitMeshes();
                        updateResourceBar();
                        updatePopBar();
                        updateFogOfWar();
                        drawMinimap();
                        var tDef = UNIT_TYPES[unitTypeKey];
                        showToast('boon', 'Training', tDef.name + ' training begun (' + tDef.trainTurns + ' turns)', '');
                    }
                    showBuildMenu(hexKey);
                });
            });

            return;
        }

        // No building — show build options filtered by tech tree unlocks
        var unlockedBuildings = getUnlockedBuildings(gameState.race, gameState.techState);
        var raceBuildings = getBuildingsForRace(gameState.race);

        var html = '<div class="build-menu-title">Build</div>';
        for (var typeKey in raceBuildings) {
            if (typeKey === 'town_center') continue; // Can't manually build
            if (!unlockedBuildings.has(typeKey)) continue; // Not yet researched

            var def = raceBuildings[typeKey];
            var check = canPlaceBuilding(typeKey, hex, gameState.resources);

            var costParts = [];
            for (var res in def.cost) {
                var amt = def.cost[res];
                if (amt > 0) {
                    var hasEnough = (gameState.resources[res] || 0) >= amt;
                    var cls = hasEnough ? '' : ' cost-short';
                    costParts.push('<span class="' + cls + '">' + RESOURCE_INFO[res].icon + amt + '</span>');
                }
            }

            var costStr = costParts.join(' ');
            var turnsStr = def.turnsToBuild > 0 ? def.turnsToBuild + ' turns' : 'Instant';
            var reason = check.ok ? '' : ' title="' + check.reason + '"';

            html += '<button class="build-option"' +
                (check.ok ? '' : ' disabled') +
                ' data-building="' + typeKey + '"' +
                reason + '>' +
                '<div class="build-option-name">' + def.name + '</div>' +
                '<div class="build-option-cost">' + costStr + '</div>' +
                '<div class="build-option-info">' + turnsStr + '</div>' +
                '</button>';
        }

        // Hex improvement option
        if (!hex.improvement && hex.terrain !== 'water') {
            var impBonus = TERRAIN_BONUSES[hex.terrain];
            var hasBonus = false;
            for (var r3 in impBonus) {
                if (impBonus[r3] > 0) { hasBonus = true; break; }
            }
            if (hasBonus && getAvailableWorkers(gameState) > 0) {
                var bonusDesc = [];
                for (var r4 in impBonus) {
                    if (impBonus[r4] > 0) bonusDesc.push('+' + impBonus[r4] + ' ' + RESOURCE_INFO[r4].label);
                }
                html += '<button class="build-option improve-hex-btn">' +
                    '<div class="build-option-name">Improve Hex</div>' +
                    '<div class="build-option-cost">1 worker, 3 turns</div>' +
                    '<div class="build-option-info">' + bonusDesc.join(', ') + '/turn</div>' +
                    '</button>';
            }
        } else if (hex.improvement) {
            if (hex.improvement.turnsRemaining > 0) {
                html += '<div class="build-option-info">Improving: ' + hex.improvement.turnsRemaining + ' turns left</div>';
            } else {
                html += '<div class="build-option-info">Hex improved</div>';
            }
        }

        buildMenuEl.innerHTML = html;
        buildMenuEl.classList.add('visible');

        // Bind build click handlers
        buildMenuEl.querySelectorAll('.build-option[data-building]:not(:disabled)').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var buildingType = this.getAttribute('data-building');
                placeBuilding(buildingType, hex.q, hex.r);
                buildMenuEl.classList.remove('visible');
                if (inputApi) inputApi.refreshSelection();
            });
        });

        // Bind hex improvement
        var improveBtn = buildMenuEl.querySelector('.improve-hex-btn');
        if (improveBtn) {
            improveBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var bonus = {};
                var tb = TERRAIN_BONUSES[hex.terrain];
                for (var r5 in tb) {
                    if (tb[r5] > 0) bonus[r5] = tb[r5];
                }
                startHexImprovement(gameState, hex.q, hex.r, bonus);
                hex.improvement = { turnsRemaining: 3, bonus: bonus };
                showBuildMenu(hexKey);
                drawMinimap();
            });
        }
    }

    function hideBuildMenu() {
        buildMenuEl.classList.remove('visible');
    }

    // ── Tech Tree Panel ──
    function renderTechTree() {
        if (!gameState || !techTreeContent) return;
        var race = gameState.race;
        var tree = RACE_TECH_TREES[race];
        var ts = gameState.techState;

        var branches = { economy: [], military: [], magic: [] };
        for (var id in tree) {
            branches[tree[id].branch].push(id);
        }

        var html = '';
        var branchNames = { economy: 'Economy', military: 'Military', magic: 'Magic' };
        var branchIcons = { economy: 'G', military: 'S', magic: 'M' };

        for (var branch in branches) {
            html += '<div class="tech-branch">';
            html += '<div class="tech-branch-title">' + branchNames[branch] + '</div>';

            var techIds = branches[branch];
            for (var i = 0; i < techIds.length; i++) {
                var techId = techIds[i];
                var tech = tree[techId];
                var state = ts[techId];
                var statusClass = 'tech-' + state.status;

                // Draw connection lines for prerequisites
                var prereqNames = [];
                for (var p = 0; p < tech.prerequisites.length; p++) {
                    prereqNames.push(tree[tech.prerequisites[p]].name);
                }

                html += '<div class="tech-node ' + statusClass + '" data-tech="' + techId + '">';
                html += '<div class="tech-node-name">' + tech.name + '</div>';

                if (prereqNames.length > 0) {
                    html += '<div class="tech-prereqs">Requires: ' + prereqNames.join(', ') + '</div>';
                }

                // Cost
                var costParts = [];
                for (var res in tech.cost) {
                    if (tech.cost[res] > 0) {
                        costParts.push(RESOURCE_INFO[res].icon + tech.cost[res]);
                    }
                }
                html += '<div class="tech-cost">' + costParts.join(' ') + ' | ' + tech.turnsToResearch + ' turns</div>';
                html += '<div class="tech-desc">' + tech.description + '</div>';

                if (state.status === TECH_STATE.researching) {
                    html += '<div class="tech-progress">Researching: ' + state.turnsRemaining + ' turns left</div>';
                } else if (state.status === TECH_STATE.available) {
                    var canRes = canResearchTech(techId, race, ts, gameState.resources);
                    html += '<button class="tech-research-btn"' + (canRes.ok ? '' : ' disabled title="' + canRes.reason + '"') + ' data-tech="' + techId + '">Research</button>';
                } else if (state.status === TECH_STATE.completed) {
                    html += '<div class="tech-done">Completed</div>';
                }

                html += '</div>';
            }

            html += '</div>';
        }

        techTreeContent.innerHTML = html;

        // Bind research buttons
        techTreeContent.querySelectorAll('.tech-research-btn:not(:disabled)').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var techId = this.getAttribute('data-tech');
                var check = canResearchTech(techId, race, ts, gameState.resources);
                if (check.ok) {
                    gameState.resources = startResearch(techId, race, ts, gameState.resources);
                    updateResourceBar();
                    updateResearchStatus();
                    renderTechTree();
                }
            });
        });
    }

    // Tech tree toggle
    if (techTreeBtn) {
        techTreeBtn.addEventListener('click', function () {
            if (techTreePanel.classList.contains('visible')) {
                techTreePanel.classList.remove('visible');
            } else {
                renderTechTree();
                techTreePanel.classList.add('visible');
            }
        });
    }

    if (techTreeClose) {
        techTreeClose.addEventListener('click', function () {
            techTreePanel.classList.remove('visible');
        });
    }

    // ── Resource Gathering Visualization ──
    function spawnGatherParticles(gathered) {
        // For each building that produced, spawn particles rising from it
        for (var i = 0; i < gameState.buildings.length; i++) {
            var b = gameState.buildings[i];
            if (b.turnsRemaining > 0) continue;
            var def = BUILDING_TYPES[b.type];
            var hasProduction = false;
            for (var res in def.resourcesPerTurn) {
                if (def.resourcesPerTurn[res] > 0 && b.workers > 0) { hasProduction = true; break; }
            }
            if (!hasProduction && def.workerSlots > 0) continue;
            if (!hasProduction) continue;

            var pos = axialToWorld(b.q, b.r);
            // Determine dominant resource color
            var dominantRes = null;
            var maxAmt = 0;
            for (var res2 in def.resourcesPerTurn) {
                if (def.resourcesPerTurn[res2] > maxAmt) {
                    maxAmt = def.resourcesPerTurn[res2];
                    dominantRes = res2;
                }
            }
            var pColor = dominantRes ? RESOURCE_INFO[dominantRes].color : '#ffffff';

            // Create a small sprite/indicator
            var spriteMat = new THREE.SpriteMaterial({
                color: new THREE.Color(pColor),
                transparent: true,
                opacity: 0.9,
            });
            var sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(0.2, 0.2, 0.2);
            var yStart = 0.3 + (def.scale.y * (LEVEL_MULTIPLIERS[b.level || 1] || 1));
            sprite.position.set(pos.x, yStart, pos.z);
            scene.add(sprite);

            gatherParticles.push({
                sprite: sprite,
                startY: yStart,
                life: 0,
                maxLife: 60, // frames
            });
        }
    }

    function updateParticles() {
        for (var i = gatherParticles.length - 1; i >= 0; i--) {
            var p = gatherParticles[i];
            p.life++;
            var t = p.life / p.maxLife;
            p.sprite.position.y = p.startY + t * 1.5;
            p.sprite.material.opacity = 0.9 * (1 - t);
            if (p.life >= p.maxLife) {
                scene.remove(p.sprite);
                p.sprite.material.dispose();
                gatherParticles.splice(i, 1);
            }
        }
    }

    // ── Minimap ──
    function drawMinimap() {
        if (!minimapCanvas) return;
        var ctx = minimapCanvas.getContext('2d');
        var w = minimapCanvas.width;
        var h = minimapCanvas.height;
        ctx.clearRect(0, 0, w, h);

        var cellW = w / gridSize;
        var cellH = h / gridSize;

        var terrainColors = {
            plains: '#4ade80',
            forest: '#166534',
            mountain: '#6b7280',
            water: '#3b82f6',
            desert: '#d4a574',
        };

        hexData.forEach(function (hex, key) {
            var x = hex.q * cellW;
            var y = hex.r * cellH;

            // Terrain base color
            ctx.fillStyle = terrainColors[hex.terrain] || '#333';
            ctx.fillRect(x, y, cellW, cellH);

            // Building indicator
            if (hex.building) {
                ctx.fillStyle = '#fbbf24';
                var pad = cellW * 0.2;
                ctx.fillRect(x + pad, y + pad, cellW - pad * 2, cellH - pad * 2);
            }

            // Improvement indicator
            if (hex.improvement && hex.improvement.turnsRemaining <= 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x, y, cellW, cellH);
            }
        });

        // Unit indicators on minimap
        if (gameState && gameState.units) {
            for (var ui = 0; ui < gameState.units.length; ui++) {
                var unit = gameState.units[ui];
                if (unit.turnsToReady > 0) continue;
                var ux = unit.q * cellW;
                var uy = unit.r * cellH;
                ctx.fillStyle = unit.owner === 'player' ? '#60a5fa' : '#ef4444';
                ctx.beginPath();
                ctx.arc(ux + cellW / 2, uy + cellH / 2, cellW * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Fog of war on minimap
        if (gameState) {
            var visible = getVisibleHexes(gameState, hexData);
            var exploredSet = new Set(gameState.exploredHexes);
            hexData.forEach(function (hex, key) {
                if (!visible.has(key) && !exploredSet.has(key)) {
                    var fx = hex.q * cellW;
                    var fy = hex.r * cellH;
                    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
                    ctx.fillRect(fx, fy, cellW, cellH);
                } else if (!visible.has(key)) {
                    var fx2 = hex.q * cellW;
                    var fy2 = hex.r * cellH;
                    ctx.fillStyle = 'rgba(10, 10, 15, 0.4)';
                    ctx.fillRect(fx2, fy2, cellW, cellH);
                }
            });
        }

        // Settlement extent border
        if (gameState && gameState.buildings.length > 0) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            var minQ = gridSize, maxQ = 0, minR = gridSize, maxR = 0;
            for (var i = 0; i < gameState.buildings.length; i++) {
                var b = gameState.buildings[i];
                if (b.q < minQ) minQ = b.q;
                if (b.q > maxQ) maxQ = b.q;
                if (b.r < minR) minR = b.r;
                if (b.r > maxR) maxR = b.r;
            }
            ctx.strokeRect(
                minQ * cellW - 1,
                minR * cellH - 1,
                (maxQ - minQ + 1) * cellW + 2,
                (maxR - minR + 1) * cellH + 2
            );
        }
    }

    // ── Save / Load ──
    saveBtn.addEventListener('click', function () {
        if (!gameState) return;
        if (storytellerState) gameState.storyteller = storytellerState;
        if (combatLogEntries.length > 0) gameState.combatLog = combatLogEntries;
        if (saveGame(gameState)) {
            saveBtn.textContent = 'Saved!';
            setTimeout(function () { saveBtn.textContent = 'Save'; }, 1000);
        }
    });

    loadBtn.addEventListener('click', function () {
        var saved = loadGame();
        if (saved) {
            // Clear existing scene buildings
            buildingMeshes.forEach(function (mesh) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            buildingMeshes.clear();

            // Clear existing unit meshes
            unitMeshes.forEach(function (mesh) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            unitMeshes.clear();
            deselectUnit();

            // Restore combat log
            if (saved.combatLog) {
                combatLogEntries = saved.combatLog;
                updateCombatLog();
            }

            // Clear hex data buildings/improvements
            hexData.forEach(function (hex) {
                hex.building = null;
                hex.improvement = null;
            });

            restoreGame(saved);
            loadBtn.textContent = 'Loaded!';
            setTimeout(function () { loadBtn.textContent = 'Load'; }, 1000);

            if (inputApi && inputApi.getSelectedKey()) {
                showBuildMenu(inputApi.getSelectedKey());
            }
        }
    });

    // ── End Turn ──
    endTurnBtn.addEventListener('click', function () {
        if (!gameState) return;

        var result = processTurn(gameState, function onComplete(building) {
            // Building finished construction
            var key = building.q + ',' + building.r;
            var hex = hexData.get(key);
            if (hex && hex.building) {
                hex.building.turnsRemaining = 0;
            }
        }, hexData);

        var gathered = result.gathered || result;
        var completedTechs = result.completedTechs || [];

        // Update building meshes for construction progress
        for (var i = 0; i < gameState.buildings.length; i++) {
            var building = gameState.buildings[i];
            var key = building.q + ',' + building.r;
            var mesh = buildingMeshes.get(key);
            if (mesh) {
                // Remove old mesh, create updated one
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                var newMesh = createBuildingMesh(building.type, building.q, building.r, building.turnsRemaining, building.level || 1, gameState.race);
                scene.add(newMesh);
                buildingMeshes.set(key, newMesh);
            }

            // Sync hex data
            var hex = hexData.get(key);
            if (hex && hex.building) {
                hex.building.turnsRemaining = building.turnsRemaining;
            }
        }

        // Update hex improvements in hexData
        if (gameState.hexImprovements) {
            for (var j = 0; j < gameState.hexImprovements.length; j++) {
                var imp = gameState.hexImprovements[j];
                var impKey = imp.q + ',' + imp.r;
                var impHex = hexData.get(impKey);
                if (impHex && impHex.improvement) {
                    impHex.improvement.turnsRemaining = imp.turnsRemaining;
                }
            }
        }

        // Spawn resource gathering particles
        spawnGatherParticles(gathered);

        // Process unit turn (refresh moves, training, hero abilities)
        deselectUnit();
        var unitResult = processUnitTurn(gameState, hexData);
        for (var ul = 0; ul < unitResult.logs.length; ul++) {
            addCombatLog(unitResult.logs[ul]);
        }
        rebuildUnitMeshes();
        updateFogOfWar();

        updateResourceBar();
        updateTurnCounter();
        updatePopBar();
        updateResearchStatus();
        drawMinimap();

        // Process storyteller turn (events, quests)
        if (storytellerState) {
            var stResult = processStorytellerTurn(gameState, storytellerState, hexData);

            // Show event toast
            if (stResult.event) {
                showToast(stResult.event.category, stResult.event.name, stResult.event.text, stResult.event.result);
            }

            // Show completed quests
            for (var cq = 0; cq < stResult.completedQuests.length; cq++) {
                showToast('boon', 'Quest Complete!', stResult.completedQuests[cq].name, 'Rewards granted');
                spawnCelebration();
            }

            // Show failed quests
            for (var fq = 0; fq < stResult.failedQuests.length; fq++) {
                showToast('challenge', 'Quest Failed', stResult.failedQuests[fq].name, '');
            }

            // Show new quest
            if (stResult.newQuest) {
                showToast('story', 'New Quest', stResult.newQuest.name, stResult.newQuest.description);
            }

            updateQuestPanel();
            updateResourceBar();
        }

        // Refresh tech tree if open
        if (techTreePanel && techTreePanel.classList.contains('visible')) {
            renderTechTree();
        }

        // Refresh build menu if open
        if (inputApi && inputApi.getSelectedKey()) {
            showBuildMenu(inputApi.getSelectedKey());
        }
    });

    // Input — connect with build menu callbacks
    var inputApi = setupInput(camera, hexMeshes, hexData, {
        onSelect: function (key) {
            if (key) {
                // Check if clicking on a unit first
                var unitHandled = handleUnitClick(key);
                if (!unitHandled) {
                    showBuildMenu(key);
                } else {
                    hideBuildMenu();
                }
            } else {
                hideBuildMenu();
                deselectUnit();
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
        updateParticles();
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

init();
