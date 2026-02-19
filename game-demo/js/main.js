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
import { initAudio, playClick, playBuild, playTurnEnd, playEventNotification, playCombat, playVictory, playDefeat, playQuestComplete, startMusic, stopMusic, setSfxEnabled, setMusicEnabled, isMusicPlaying } from './sound.js';
import { createTutorialState, getTutorialSteps, markTutorialShown, dismissTutorial, isTutorialComplete } from './tutorial.js';
import { checkVictory, checkDefeat, collectStats } from './victory.js';

function init() {
    // Renderer
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Scene
    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0f, 60, 100);

    // Lighting
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = false;
    scene.add(dirLight);

    var fillLight = new THREE.DirectionalLight(0x6088cc, 0.3);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // Start screen settings
    var selectedDifficulty = 'normal';
    var selectedMapSize = 20;

    // Grid & Camera — initialized after start screen
    var gridSize = 20;
    var hexData = null;
    var hexMeshes = null;
    var gridGroup = null;
    var camera = null;
    var controls = null;
    var updateKeys = null;
    var inputApi = null;

    // Building meshes tracked by hex key
    var buildingMeshes = new Map();

    // Unit meshes tracked by hex key
    var unitMeshes = new Map();

    // Movement range highlight meshes
    var moveHighlights = [];

    // Selected unit state
    var selectedUnit = null;
    var reachableHexes = [];

    // Resource gathering particles
    var gatherParticles = [];

    // Game state
    var gameState = null;
    var gameStartTime = null;
    var gameEnded = false;

    // Tutorial state
    var tutorialState = null;

    // DOM elements
    var raceSelectEl = document.getElementById('race-select');
    var resourceBarEl = document.getElementById('resource-bar');
    var turnCounterEl = document.getElementById('turn-counter');
    var turnNumberEl = document.getElementById('turn-number');
    var endTurnBtn = document.getElementById('end-turn-btn');
    var buildMenuEl = document.getElementById('build-menu');
    var popBarEl = document.getElementById('pop-bar');
    var minimapCanvas = document.getElementById('minimap-canvas');
    var saveBtn = document.getElementById('save-btn');
    var loadBtn = document.getElementById('load-btn');
    var techTreeBtn = document.getElementById('tech-tree-btn');
    var techTreePanel = document.getElementById('tech-tree-panel');
    var techTreeClose = document.getElementById('tech-tree-close');
    var techTreeContent = document.getElementById('tech-tree-content');
    var researchStatusEl = document.getElementById('research-status');
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
    var tutorialOverlay = document.getElementById('tutorial-overlay');
    var gameOverScreen = document.getElementById('game-over-screen');
    var gameOverTitle = document.getElementById('game-over-title');
    var gameOverReason = document.getElementById('game-over-reason');
    var gameOverStats = document.getElementById('game-over-stats');
    var gameOverRestart = document.getElementById('game-over-restart');
    var soundControlsEl = document.getElementById('sound-controls');
    var sfxToggle = document.getElementById('sfx-toggle');
    var musicToggle = document.getElementById('music-toggle');

    // Previous resources for change indicators
    var prevResources = null;

    // Storyteller state
    var storytellerState = null;
    var toastQueue = [];
    var toastShowing = false;

    // ── Start Screen: Difficulty & Map Size ──
    document.querySelectorAll('#difficulty-btns .start-option-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#difficulty-btns .start-option-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            selectedDifficulty = this.getAttribute('data-difficulty');
        });
    });

    document.querySelectorAll('#mapsize-btns .start-option-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#mapsize-btns .start-option-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            selectedMapSize = parseInt(this.getAttribute('data-mapsize'));
        });
    });

    // ── Sound Controls ──
    if (sfxToggle) {
        sfxToggle.addEventListener('click', function () {
            var isActive = this.classList.toggle('active');
            setSfxEnabled(isActive);
        });
    }
    if (musicToggle) {
        musicToggle.addEventListener('click', function () {
            var isActive = this.classList.toggle('active');
            setMusicEnabled(isActive);
            if (isActive && !isMusicPlaying()) {
                startMusic();
            } else if (!isActive) {
                stopMusic();
            }
        });
    }

    // ── Race Selection ──
    document.querySelectorAll('.race-card').forEach(function (card) {
        card.addEventListener('click', function () {
            initAudio();
            playClick();
            var race = this.getAttribute('data-race');
            initGrid(selectedMapSize);
            startGame(race);
        });
    });

    // Continue button for saved games
    var continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        if (hasSavedGame()) {
            continueBtn.classList.add('visible');
            continueBtn.addEventListener('click', function () {
                initAudio();
                var saved = loadGame();
                if (saved) {
                    initGrid(saved.mapSize || 20);
                    restoreGame(saved);
                }
            });
        }
    }

    function initGrid(size) {
        gridSize = size;

        // Clear existing grid if any
        if (gridGroup) {
            scene.remove(gridGroup);
        }

        var result = createHexGrid(scene, gridSize);
        hexData = result.hexData;
        hexMeshes = result.hexMeshes;
        gridGroup = result.gridGroup;

        // Setup camera
        var camResult = setupCamera(renderer, gridSize);
        camera = camResult.camera;
        controls = camResult.controls;
        updateKeys = camResult.updateKeys;

        // Adjust fog for map size
        scene.fog = new THREE.Fog(0x0a0a0f, gridSize * 2.5, gridSize * 4);
    }

    function startGame(race) {
        gameState = createGameState(race);
        gameState.difficulty = selectedDifficulty;
        gameState.mapSize = selectedMapSize;
        storytellerState = createStorytellerState();
        tutorialState = createTutorialState();
        gameStartTime = Date.now();
        gameEnded = false;

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

        // Setup input
        setupInputSystem();
        updateFogOfWar();
        showHUD();

        // Start music
        startMusic();

        // Show tutorial for turn 1
        showTutorialSteps(1, 'start');
    }

    function restoreGame(state) {
        gameState = state;
        gameEnded = false;
        gameStartTime = Date.now();

        // Ensure new fields exist for older saves
        if (!gameState.population) gameState.population = { current: 5, cap: 5 };
        if (!gameState.hexImprovements) gameState.hexImprovements = [];
        if (!gameState.techState) gameState.techState = createTechState(gameState.race);
        if (!gameState.units) gameState.units = [];
        if (!gameState.difficulty) gameState.difficulty = 'normal';
        if (!gameState.mapSize) gameState.mapSize = 20;

        selectedDifficulty = gameState.difficulty;

        // Restore or create storyteller state
        if (gameState.storyteller) {
            storytellerState = gameState.storyteller;
        } else {
            storytellerState = createStorytellerState();
        }

        tutorialState = createTutorialState();
        tutorialState.dismissed = true; // Skip tutorial on load

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
        setupInputSystem();
        rebuildUnitMeshes();
        updateFogOfWar();
        showHUD();
        startMusic();
    }

    function setupInputSystem() {
        inputApi = setupInput(camera, hexMeshes, hexData, {
            onSelect: function (key) {
                if (gameEnded) return;
                playClick();
                if (key) {
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
        if (soundControlsEl) soundControlsEl.classList.add('visible');

        updateResourceBar();
        updateTurnCounter();
        updatePopBar();
        updateResearchStatus();
        updateQuestPanel();
        drawMinimap();
    }

    // ── Tutorial System ──

    function showTutorialSteps(turn, trigger) {
        if (!tutorialState || tutorialState.dismissed) return;
        var steps = getTutorialSteps(tutorialState, turn, trigger);
        if (steps.length === 0) return;

        var stepIdx = 0;
        function showStep() {
            if (stepIdx >= steps.length) {
                tutorialOverlay.classList.remove('visible');
                return;
            }
            var entry = steps[stepIdx];
            var step = entry.step;
            var total = steps.length;

            var html = '<div class="tutorial-tooltip">';
            html += '<div class="tutorial-step">Tip ' + (stepIdx + 1) + ' of ' + total + '</div>';
            html += '<div class="tutorial-title">' + step.title + '</div>';
            html += '<div class="tutorial-text">' + step.text + '</div>';
            html += '<div class="tutorial-actions">';
            html += '<button class="tutorial-btn" id="tutorial-next">' + (stepIdx < total - 1 ? 'Next' : 'Got it') + '</button>';
            html += '<button class="tutorial-btn tutorial-skip" id="tutorial-skip">Skip All</button>';
            html += '</div>';
            html += '</div>';

            tutorialOverlay.innerHTML = html;
            tutorialOverlay.classList.add('visible');

            markTutorialShown(tutorialState, entry.index);

            document.getElementById('tutorial-next').addEventListener('click', function () {
                stepIdx++;
                showStep();
            });
            document.getElementById('tutorial-skip').addEventListener('click', function () {
                dismissTutorial(tutorialState);
                tutorialOverlay.classList.remove('visible');
            });
        }

        showStep();
    }

    // ── Victory / Defeat Checking ──

    function checkGameEnd() {
        if (!gameState || gameEnded) return;

        var victory = checkVictory(gameState, selectedDifficulty);
        if (victory) {
            gameEnded = true;
            playVictory();
            showGameOverScreen(true, victory.reason);
            return;
        }

        var defeat = checkDefeat(gameState);
        if (defeat) {
            gameEnded = true;
            playDefeat();
            showGameOverScreen(false, defeat.reason);
            return;
        }
    }

    function showGameOverScreen(isVictory, reason) {
        gameOverTitle.textContent = isVictory ? 'Victory!' : 'Defeat';
        gameOverTitle.className = 'game-over-title ' + (isVictory ? 'victory' : 'defeat');
        gameOverReason.textContent = reason;

        var stats = collectStats(gameState, storytellerState, selectedDifficulty, gameStartTime);

        var html = '';
        var statRows = [
            ['Race', stats.race.charAt(0).toUpperCase() + stats.race.slice(1)],
            ['Difficulty', stats.difficulty.charAt(0).toUpperCase() + stats.difficulty.slice(1)],
            ['Turns Played', stats.turns],
            ['Play Time', stats.playTime],
            ['Population', stats.population + '/' + stats.populationCap],
            ['Buildings', stats.buildings],
            ['Max Level', 'Lv.' + stats.maxBuildingLevel],
            ['Units', stats.units],
            ['Tech Researched', stats.techResearched],
            ['Quests Completed', stats.questsCompleted],
            ['Events', stats.eventsExperienced],
            ['Total Resources', stats.totalResources],
        ];

        for (var i = 0; i < statRows.length; i++) {
            html += '<div class="stat-row"><span class="stat-label">' + statRows[i][0] + '</span><span class="stat-value">' + statRows[i][1] + '</span></div>';
        }

        gameOverStats.innerHTML = html;
        gameOverScreen.classList.add('visible');
        stopMusic();
    }

    // Restart game
    if (gameOverRestart) {
        gameOverRestart.addEventListener('click', function () {
            gameOverScreen.classList.remove('visible');

            // Clear scene
            buildingMeshes.forEach(function (mesh) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            buildingMeshes.clear();
            unitMeshes.forEach(function (mesh) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            unitMeshes.clear();

            gameState = null;
            gameEnded = false;
            combatLogEntries = [];
            if (combatLogEl) combatLogEl.classList.remove('visible');

            // Hide HUD
            resourceBarEl.classList.remove('visible');
            turnCounterEl.classList.remove('visible');
            endTurnBtn.classList.remove('visible');
            popBarEl.classList.remove('visible');
            document.getElementById('save-load-bar').classList.remove('visible');
            if (techTreeBtn) techTreeBtn.classList.remove('visible');
            if (eventLogBtn) eventLogBtn.classList.remove('visible');
            if (soundControlsEl) soundControlsEl.classList.remove('visible');
            if (questPanelEl) questPanelEl.classList.remove('visible');
            if (researchStatusEl) researchStatusEl.classList.remove('visible');
            buildMenuEl.classList.remove('visible');

            // Show start screen
            raceSelectEl.classList.remove('hidden');
        });
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
            if (unit.turnsToReady > 0) continue;
            var key = unit.q + ',' + unit.r;

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

        visible.forEach(function (key) {
            if (gameState.exploredHexes.indexOf(key) === -1) {
                gameState.exploredHexes.push(key);
            }
        });

        applyFogOfWar(hexMeshes, hexData, visible, gameState.exploredHexes);

        if (inputApi && inputApi.setVisibleHexes) {
            inputApi.setVisibleHexes(visible);
        }
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
                    var defender = null;
                    for (var d = 0; d < gameState.units.length; d++) {
                        if (gameState.units[d].q === clickQ && gameState.units[d].r === clickR && gameState.units[d].owner !== selectedUnit.owner) {
                            defender = gameState.units[d];
                            break;
                        }
                    }
                    if (defender) {
                        var rallyBonus = getRallyBonus(selectedUnit, gameState);
                        var origAttack = UNIT_TYPES[selectedUnit.type].attack;
                        if (rallyBonus > 0) {
                            UNIT_TYPES[selectedUnit.type].attack += rallyBonus;
                        }

                        var result = resolveCombat(selectedUnit, defender);

                        if (rallyBonus > 0) {
                            UNIT_TYPES[selectedUnit.type].attack = origAttack;
                        }

                        addCombatLog(result.log);
                        playCombat();
                        showToast('challenge', 'Combat', result.log, '');

                        if (defender.hp <= 0) {
                            var defIdx = gameState.units.indexOf(defender);
                            if (defIdx >= 0) gameState.units.splice(defIdx, 1);
                            moveUnit(selectedUnit, clickQ, clickR, hexData);
                        } else if (selectedUnit.hp <= 0) {
                            var atkIdx = gameState.units.indexOf(selectedUnit);
                            if (atkIdx >= 0) gameState.units.splice(atkIdx, 1);
                        }
                    }
                } else {
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
                    deselectUnit();
                } else {
                    selectedUnit = unit;
                    showMoveRange(unit);
                }
                return true;
            }
        }

        if (selectedUnit) {
            deselectUnit();
            return false;
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

        gameState.resources = deductCost(buildingType, gameState.resources);
        addBuilding(gameState, buildingType, q, r, def.turnsToBuild);
        hex.building = { type: buildingType, turnsRemaining: def.turnsToBuild, level: 1 };

        var mesh = createBuildingMesh(buildingType, q, r, def.turnsToBuild, 1, gameState.race);
        scene.add(mesh);
        buildingMeshes.set(key, mesh);

        playBuild();
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

        var oldMesh = buildingMeshes.get(key);
        if (oldMesh) {
            scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            oldMesh.material.dispose();
        }
        var newMesh = createBuildingMesh(buildingState.type, buildingState.q, buildingState.r, 0, nextLevel, gameState.race);
        scene.add(newMesh);
        buildingMeshes.set(key, newMesh);

        playBuild();
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
            var changeHtml = '';
            if (prevResources) {
                var diff = amount - (prevResources[type] || 0);
                if (diff > 0) {
                    changeHtml = '<span class="resource-change positive">+' + diff + '</span>';
                } else if (diff < 0) {
                    changeHtml = '<span class="resource-change negative">' + diff + '</span>';
                }
            }
            return '<div class="resource-item">' +
                '<div class="resource-icon" style="background:' + info.color + '">' + info.icon + '</div>' +
                '<span class="resource-amount">' + amount + '</span>' +
                changeHtml +
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
        playEventNotification();
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
                var levelMul = LEVEL_MULTIPLIERS[level] || 1;
                var producing = Object.entries(bDef.resourcesPerTurn)
                    .filter(function (e) { return e[1] > 0; })
                    .map(function (e) { return '+' + Math.floor(e[1] * levelMul) + ' ' + RESOURCE_INFO[e[0]].label; })
                    .join(', ');
                if (producing) {
                    html += '<div class="build-option-info">Produces: ' + producing + '/turn</div>';
                }

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
                        playClick();
                    } else if (action === 'remove' && buildingState.workers > 0) {
                        buildingState.workers--;
                        playClick();
                    }
                    updatePopBar();
                    showBuildMenu(hexKey);
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
                        playBuild();
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
            if (typeKey === 'town_center') continue;
            if (!unlockedBuildings.has(typeKey)) continue;

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
                playBuild();
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

        for (var branch in branches) {
            html += '<div class="tech-branch">';
            html += '<div class="tech-branch-title">' + branchNames[branch] + '</div>';

            var techIds = branches[branch];
            for (var i = 0; i < techIds.length; i++) {
                var techId = techIds[i];
                var tech = tree[techId];
                var state = ts[techId];
                var statusClass = 'tech-' + state.status;

                var prereqNames = [];
                for (var p = 0; p < tech.prerequisites.length; p++) {
                    prereqNames.push(tree[tech.prerequisites[p]].name);
                }

                html += '<div class="tech-node ' + statusClass + '" data-tech="' + techId + '">';
                html += '<div class="tech-node-name">' + tech.name + '</div>';

                if (prereqNames.length > 0) {
                    html += '<div class="tech-prereqs">Requires: ' + prereqNames.join(', ') + '</div>';
                }

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
                    playClick();
                    updateResourceBar();
                    updateResearchStatus();
                    renderTechTree();
                }
            });
        });
    }

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
            var dominantRes = null;
            var maxAmt = 0;
            for (var res2 in def.resourcesPerTurn) {
                if (def.resourcesPerTurn[res2] > maxAmt) {
                    maxAmt = def.resourcesPerTurn[res2];
                    dominantRes = res2;
                }
            }
            var pColor = dominantRes ? RESOURCE_INFO[dominantRes].color : '#ffffff';

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
                maxLife: 60,
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
        if (!minimapCanvas || !hexData) return;
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
            ctx.fillStyle = terrainColors[hex.terrain] || '#333';
            ctx.fillRect(x, y, cellW, cellH);

            if (hex.building) {
                ctx.fillStyle = '#fbbf24';
                var pad = cellW * 0.2;
                ctx.fillRect(x + pad, y + pad, cellW - pad * 2, cellH - pad * 2);
            }

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
            playClick();
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

            unitMeshes.forEach(function (mesh) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            unitMeshes.clear();
            deselectUnit();

            if (saved.combatLog) {
                combatLogEntries = saved.combatLog;
                updateCombatLog();
            }

            hexData.forEach(function (hex) {
                hex.building = null;
                hex.improvement = null;
            });

            restoreGame(saved);
            playClick();
            loadBtn.textContent = 'Loaded!';
            setTimeout(function () { loadBtn.textContent = 'Load'; }, 1000);

            if (inputApi && inputApi.getSelectedKey()) {
                showBuildMenu(inputApi.getSelectedKey());
            }
        }
    });

    // ── End Turn ──
    endTurnBtn.addEventListener('click', function () {
        if (!gameState || gameEnded) return;

        // Store resources before turn for change indicators
        prevResources = {};
        for (var pr in gameState.resources) {
            prevResources[pr] = gameState.resources[pr];
        }

        playTurnEnd();

        var result = processTurn(gameState, function onComplete(building) {
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
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                var newMesh = createBuildingMesh(building.type, building.q, building.r, building.turnsRemaining, building.level || 1, gameState.race);
                scene.add(newMesh);
                buildingMeshes.set(key, newMesh);
            }

            var hex = hexData.get(key);
            if (hex && hex.building) {
                hex.building.turnsRemaining = building.turnsRemaining;
            }
        }

        // Update hex improvements
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

        spawnGatherParticles(gathered);

        // Process unit turn
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

        // Process storyteller turn
        if (storytellerState) {
            var stResult = processStorytellerTurn(gameState, storytellerState, hexData);

            if (stResult.event) {
                showToast(stResult.event.category, stResult.event.name, stResult.event.text, stResult.event.result);
            }

            for (var cq = 0; cq < stResult.completedQuests.length; cq++) {
                showToast('boon', 'Quest Complete!', stResult.completedQuests[cq].name, 'Rewards granted');
                spawnCelebration();
                playQuestComplete();
            }

            for (var fq = 0; fq < stResult.failedQuests.length; fq++) {
                showToast('challenge', 'Quest Failed', stResult.failedQuests[fq].name, '');
            }

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

        // Clear resource change indicators after a delay
        setTimeout(function () {
            prevResources = null;
            updateResourceBar();
        }, 3000);

        // Show tutorial for this turn
        showTutorialSteps(gameState.turn, 'turn');

        // Check for victory/defeat
        checkGameEnd();
    });

    // Handle resize
    function onResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // Touch support: treat touch as click for mobile
    renderer.domElement.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
            // Single finger tap — simulate click
            var touch = e.touches[0];
            var clickEvent = new MouseEvent('click', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
            });
            // Delay to let touch gestures settle
            var startX = touch.clientX;
            var startY = touch.clientY;
            function onTouchEnd(te) {
                var endTouch = te.changedTouches[0];
                var dx = endTouch.clientX - startX;
                var dy = endTouch.clientY - startY;
                // Only fire click if not dragging
                if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                    renderer.domElement.dispatchEvent(new MouseEvent('click', {
                        clientX: endTouch.clientX,
                        clientY: endTouch.clientY,
                        bubbles: true,
                    }));
                }
                renderer.domElement.removeEventListener('touchend', onTouchEnd);
            }
            renderer.domElement.addEventListener('touchend', onTouchEnd);
        }
    }, { passive: true });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        if (updateKeys) updateKeys();
        updateParticles();
        if (controls) controls.update();
        if (camera) {
            renderer.render(scene, camera);
        }
    }

    animate();
}

init();
