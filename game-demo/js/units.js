// units.js — Unit system: types, training, movement, fog of war, combat, hero units
// Units render as simple 3D shapes on hexes (cone, sphere, box, etc.)
// One unit per hex. Click unit to show movement range, click dest to move.

import * as THREE from 'three';
import { axialToWorld, axialToCube, cubeDistance, HEX_SIZE } from './hex-grid.js';
import { RACE_PALETTES } from './buildings.js';
import { createUnitModel, applyIdleAnimation, disposeModel } from './asset-loader.js';

// ── Terrain movement costs ──
// water = impassable (Infinity)
var TERRAIN_MOVE_COST = {
    plains: 1,
    forest: 1.5,
    mountain: 2,
    desert: 1,
    water: Infinity,
};

// ── Unit type definitions ──
// Each unit type: cost, trainTurns, hp, attack, defense, moveRange, visionRange, shape, scale
// trainAt: building type required to train this unit

export var UNIT_TYPES = {
    // ── Workers ──
    worker: {
        name: 'Worker',
        cost: { food: 10, wood: 0, stone: 0, gold: 5, mana: 0 },
        trainTurns: 1,
        trainAt: 'town_center',
        hp: 15, attack: 2, defense: 1,
        moveRange: 2, visionRange: 2,
        shape: 'box',
        scale: { x: 0.15, y: 0.25, z: 0.15 },
        races: ['human', 'elf', 'orc'],
    },

    // ── Warriors (race variants) ──
    warrior_human: {
        name: 'Footman',
        cost: { food: 15, wood: 5, stone: 0, gold: 10, mana: 0 },
        trainTurns: 2,
        trainAt: 'barracks',
        hp: 40, attack: 8, defense: 5,
        moveRange: 3, visionRange: 3,
        shape: 'cone',
        scale: { x: 0.18, y: 0.4, z: 0.18 },
        races: ['human'],
    },
    warrior_elf: {
        name: 'Sentinel',
        cost: { food: 12, wood: 10, stone: 0, gold: 8, mana: 0 },
        trainTurns: 2,
        trainAt: 'barracks',
        hp: 35, attack: 7, defense: 4,
        moveRange: 4, visionRange: 4,
        shape: 'cone',
        scale: { x: 0.16, y: 0.42, z: 0.16 },
        races: ['elf'],
    },
    warrior_orc: {
        name: 'Grunt',
        cost: { food: 20, wood: 5, stone: 5, gold: 8, mana: 0 },
        trainTurns: 2,
        trainAt: 'barracks',
        hp: 50, attack: 10, defense: 3,
        moveRange: 3, visionRange: 2,
        shape: 'cone',
        scale: { x: 0.2, y: 0.38, z: 0.2 },
        races: ['orc'],
    },

    // ── Archers (race variants) ──
    archer_human: {
        name: 'Crossbowman',
        cost: { food: 12, wood: 15, stone: 0, gold: 10, mana: 0 },
        trainTurns: 2,
        trainAt: 'barracks',
        hp: 25, attack: 10, defense: 2,
        moveRange: 3, visionRange: 4,
        shape: 'cylinder',
        scale: { x: 0.12, y: 0.38, z: 0.12 },
        races: ['human'],
    },
    archer_elf: {
        name: 'Ranger',
        cost: { food: 10, wood: 12, stone: 0, gold: 8, mana: 0 },
        trainTurns: 2,
        trainAt: 'barracks',
        hp: 22, attack: 11, defense: 2,
        moveRange: 4, visionRange: 5,
        shape: 'cylinder',
        scale: { x: 0.1, y: 0.4, z: 0.1 },
        races: ['elf'],
    },
    archer_orc: {
        name: 'Axe Thrower',
        cost: { food: 15, wood: 10, stone: 5, gold: 8, mana: 0 },
        trainTurns: 2,
        trainAt: 'barracks',
        hp: 30, attack: 9, defense: 3,
        moveRange: 3, visionRange: 3,
        shape: 'cylinder',
        scale: { x: 0.14, y: 0.36, z: 0.14 },
        races: ['orc'],
    },

    // ── Mages (race variants) ──
    mage_human: {
        name: 'Cleric',
        cost: { food: 10, wood: 5, stone: 0, gold: 15, mana: 10 },
        trainTurns: 3,
        trainAt: 'mage_tower',
        hp: 20, attack: 7, defense: 2,
        moveRange: 2, visionRange: 4,
        shape: 'sphere',
        scale: { x: 0.18, y: 0.18, z: 0.18 },
        races: ['human'],
    },
    mage_elf: {
        name: 'Druid',
        cost: { food: 8, wood: 5, stone: 0, gold: 10, mana: 15 },
        trainTurns: 3,
        trainAt: 'mage_tower',
        hp: 18, attack: 8, defense: 1,
        moveRange: 3, visionRange: 5,
        shape: 'sphere',
        scale: { x: 0.16, y: 0.16, z: 0.16 },
        races: ['elf'],
    },
    mage_orc: {
        name: 'Shaman',
        cost: { food: 12, wood: 5, stone: 5, gold: 10, mana: 10 },
        trainTurns: 3,
        trainAt: 'mage_tower',
        hp: 22, attack: 9, defense: 2,
        moveRange: 2, visionRange: 3,
        shape: 'sphere',
        scale: { x: 0.2, y: 0.2, z: 0.2 },
        races: ['orc'],
    },

    // ── Hero units (one per race, unique ability) ──
    hero_human: {
        name: 'Knight Commander',
        cost: { food: 30, wood: 10, stone: 10, gold: 40, mana: 10 },
        trainTurns: 4,
        trainAt: 'castle',
        hp: 60, attack: 12, defense: 8,
        moveRange: 3, visionRange: 4,
        shape: 'cone',
        scale: { x: 0.22, y: 0.55, z: 0.22 },
        races: ['human'],
        isHero: true,
        ability: 'rally',
        abilityName: 'Rally',
        abilityDesc: '+2 attack to adjacent friendly units',
    },
    hero_elf: {
        name: 'Archmage',
        cost: { food: 20, wood: 10, stone: 5, gold: 30, mana: 30 },
        trainTurns: 4,
        trainAt: 'ancient_archive',
        hp: 40, attack: 14, defense: 4,
        moveRange: 3, visionRange: 5,
        shape: 'sphere',
        scale: { x: 0.22, y: 0.22, z: 0.22 },
        races: ['elf'],
        isHero: true,
        ability: 'area_heal',
        abilityName: 'Area Heal',
        abilityDesc: 'Heals adjacent friendly units for 10 HP per turn',
    },
    hero_orc: {
        name: 'Warchief',
        cost: { food: 40, wood: 10, stone: 15, gold: 30, mana: 5 },
        trainTurns: 4,
        trainAt: 'war_pit',
        hp: 70, attack: 15, defense: 6,
        moveRange: 3, visionRange: 3,
        shape: 'cone',
        scale: { x: 0.24, y: 0.52, z: 0.24 },
        races: ['orc'],
        isHero: true,
        ability: 'charge',
        abilityName: 'Charge',
        abilityDesc: 'Double movement for one turn (activate)',
        chargeActive: false,
    },
};

// ── Get units available to a race ──
export function getUnitsForRace(race) {
    var result = {};
    for (var key in UNIT_TYPES) {
        if (UNIT_TYPES[key].races.includes(race)) {
            result[key] = UNIT_TYPES[key];
        }
    }
    return result;
}

// ── Check if a unit can be trained ──
export function canTrainUnit(unitType, gameState, hexData) {
    var def = UNIT_TYPES[unitType];
    if (!def) return { ok: false, reason: 'Unknown unit type' };

    // Check resources
    for (var res in def.cost) {
        if ((gameState.resources[res] || 0) < def.cost[res]) {
            return { ok: false, reason: 'Not enough ' + res };
        }
    }

    // Check population
    var unitCount = gameState.units ? gameState.units.length : 0;
    // Units don't consume population slots — but we need at least 1 pop per unit beyond workers
    if (gameState.population.current <= unitCount) {
        return { ok: false, reason: 'Not enough population' };
    }

    // Check that the required building exists and is complete
    var hasBuilding = false;
    for (var i = 0; i < gameState.buildings.length; i++) {
        var b = gameState.buildings[i];
        if (b.type === def.trainAt && b.turnsRemaining <= 0) {
            // Check there's no unit already on this hex
            var bKey = b.q + ',' + b.r;
            var occupied = false;
            if (gameState.units) {
                for (var j = 0; j < gameState.units.length; j++) {
                    if (gameState.units[j].q === b.q && gameState.units[j].r === b.r) {
                        occupied = true;
                        break;
                    }
                }
            }
            if (!occupied) {
                hasBuilding = true;
                break;
            }
        }
    }
    if (!hasBuilding) {
        return { ok: false, reason: 'Requires completed ' + (UNIT_TYPES[unitType].trainAt || 'building').replace(/_/g, ' ') };
    }

    // Hero limit: only one hero per race
    if (def.isHero && gameState.units) {
        for (var h = 0; h < gameState.units.length; h++) {
            var u = gameState.units[h];
            var uDef = UNIT_TYPES[u.type];
            if (uDef && uDef.isHero) {
                return { ok: false, reason: 'Only one hero allowed' };
            }
        }
    }

    return { ok: true };
}

// ── Train a unit — returns the building hex (q,r) where unit spawns ──
export function trainUnit(unitType, gameState) {
    var def = UNIT_TYPES[unitType];

    // Deduct resources
    for (var res in def.cost) {
        gameState.resources[res] -= def.cost[res];
    }

    // Find a valid building to spawn at
    var spawnQ = 0, spawnR = 0;
    for (var i = 0; i < gameState.buildings.length; i++) {
        var b = gameState.buildings[i];
        if (b.type === def.trainAt && b.turnsRemaining <= 0) {
            var occupied = false;
            if (gameState.units) {
                for (var j = 0; j < gameState.units.length; j++) {
                    if (gameState.units[j].q === b.q && gameState.units[j].r === b.r) {
                        occupied = true;
                        break;
                    }
                }
            }
            if (!occupied) {
                spawnQ = b.q;
                spawnR = b.r;
                break;
            }
        }
    }

    if (!gameState.units) gameState.units = [];

    var unit = {
        type: unitType,
        q: spawnQ,
        r: spawnR,
        hp: def.hp,
        maxHp: def.hp,
        movesLeft: 0,           // Can't move on the turn it's trained
        turnsToReady: def.trainTurns,
        owner: 'player',
    };

    gameState.units.push(unit);
    return unit;
}

// ── Create unit 3D mesh ──
// Uses the new asset pipeline with procedural model fallback
export function createUnitMesh(unitType, q, r, race, owner) {
    var def = UNIT_TYPES[unitType];
    if (!def) return null;
    var pos = axialToWorld(q, r);
    var palette = RACE_PALETTES[race] || RACE_PALETTES.human;

    // Try new model system
    var modelGroup = null;
    try {
        modelGroup = createUnitModel(unitType, race);
    } catch (e) {
        // Fallback to primitive
    }

    if (modelGroup) {
        var yBase = 0.3;
        modelGroup.position.set(pos.x, yBase, pos.z);
        modelGroup.userData = {
            unitType: unitType,
            q: q,
            r: r,
            isUnit: true,
            isModelGroup: true,
            baseY: yBase,
            isHero: !!def.isHero,
        };
        return modelGroup;
    }

    // ── Primitive fallback ──
    var baseColor;
    if (def.isHero) {
        baseColor = new THREE.Color(palette.accent);
    } else if (def.shape === 'sphere') {
        baseColor = new THREE.Color(0xa78bfa);
    } else {
        baseColor = new THREE.Color(palette.secondary);
    }

    var geometry;
    var s = def.scale;
    if (def.shape === 'cone') {
        geometry = new THREE.ConeGeometry(s.x, s.y, 6);
    } else if (def.shape === 'sphere') {
        geometry = new THREE.SphereGeometry(s.x, 8, 6);
    } else if (def.shape === 'cylinder') {
        geometry = new THREE.CylinderGeometry(s.x * 0.6, s.x, s.y, 6);
    } else {
        geometry = new THREE.BoxGeometry(s.x, s.y, s.z);
    }

    var material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.5,
        metalness: 0.3,
        flatShading: true,
    });

    var mesh = new THREE.Mesh(geometry, material);
    var yBase = 0.3 + (def.shape === 'sphere' ? s.x : s.y / 2);
    mesh.position.set(pos.x, yBase, pos.z);
    mesh.userData = { unitType: unitType, q: q, r: r, isUnit: true, baseY: yBase, isHero: !!def.isHero };

    if (def.isHero) {
        var ringGeo = new THREE.RingGeometry(s.x + 0.05, s.x + 0.12, 16);
        var ringMat = new THREE.MeshBasicMaterial({
            color: palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
        });
        ringMat._origOpacity = 0.6;
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -s.y / 2 + 0.05;
        mesh.add(ring);
    }

    return mesh;
}

// ── Get hex neighbors (axial coordinates) ──
function getNeighbors(q, r) {
    return [
        { q: q + 1, r: r },
        { q: q - 1, r: r },
        { q: q, r: r + 1 },
        { q: q, r: r - 1 },
        { q: q + 1, r: r - 1 },
        { q: q - 1, r: r + 1 },
    ];
}

// ── Get reachable hexes for movement (BFS with terrain cost) ──
export function getMovementRange(unit, hexData, gameState) {
    var def = UNIT_TYPES[unit.type];
    if (!def) return [];

    var moveRange = unit.movesLeft;
    if (moveRange <= 0) return [];

    var startKey = unit.q + ',' + unit.r;
    var visited = new Map(); // key -> remaining moves
    visited.set(startKey, moveRange);

    var queue = [{ q: unit.q, r: unit.r, remaining: moveRange }];
    var reachable = [];

    while (queue.length > 0) {
        var current = queue.shift();
        var neighbors = getNeighbors(current.q, current.r);

        for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            var nKey = n.q + ',' + n.r;
            var hex = hexData.get(nKey);
            if (!hex) continue;

            var cost = TERRAIN_MOVE_COST[hex.terrain];
            if (cost === Infinity) continue; // impassable

            var remaining = current.remaining - cost;
            if (remaining < 0) continue;

            var prevRemaining = visited.get(nKey);
            if (prevRemaining !== undefined && prevRemaining >= remaining) continue;

            visited.set(nKey, remaining);

            // Check for enemy units (can move onto them to attack)
            var hasEnemy = false;
            var hasFriendly = false;
            if (gameState.units) {
                for (var j = 0; j < gameState.units.length; j++) {
                    var u = gameState.units[j];
                    if (u.q === n.q && u.r === n.r) {
                        if (u.owner !== unit.owner) {
                            hasEnemy = true;
                        } else {
                            hasFriendly = true;
                        }
                    }
                }
            }

            // Can't move onto friendly units
            if (hasFriendly) continue;

            reachable.push({ q: n.q, r: n.r, hasEnemy: hasEnemy });

            // If there's an enemy, can't continue past them
            if (!hasEnemy) {
                queue.push({ q: n.q, r: n.r, remaining: remaining });
            }
        }
    }

    return reachable;
}

// ── Move unit to target hex ──
export function moveUnit(unit, targetQ, targetR, hexData) {
    // Calculate movement cost using BFS path
    var cost = getMoveCost(unit.q, unit.r, targetQ, targetR, hexData);
    unit.movesLeft = Math.max(0, unit.movesLeft - cost);
    unit.q = targetQ;
    unit.r = targetR;
}

// ── Get movement cost between two hexes (shortest path BFS) ──
function getMoveCost(fromQ, fromR, toQ, toR, hexData) {
    var startKey = fromQ + ',' + fromR;
    var endKey = toQ + ',' + toR;
    if (startKey === endKey) return 0;

    var visited = new Map();
    visited.set(startKey, 0);
    var queue = [{ q: fromQ, r: fromR, cost: 0 }];

    while (queue.length > 0) {
        var current = queue.shift();
        var neighbors = getNeighbors(current.q, current.r);

        for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            var nKey = n.q + ',' + n.r;
            var hex = hexData.get(nKey);
            if (!hex) continue;

            var moveCost = TERRAIN_MOVE_COST[hex.terrain];
            if (moveCost === Infinity) continue;

            var totalCost = current.cost + moveCost;
            var prevCost = visited.get(nKey);
            if (prevCost !== undefined && prevCost <= totalCost) continue;

            visited.set(nKey, totalCost);
            if (nKey === endKey) continue; // found, but keep looking for shorter paths
            queue.push({ q: n.q, r: n.r, cost: totalCost });
        }
    }

    return visited.get(endKey) || 1;
}

// ── Fog of war: get visible hexes for all player units ──
export function getVisibleHexes(gameState, hexData) {
    var visible = new Set();

    if (!gameState.units) return visible;

    // Units reveal hexes within their vision range
    for (var i = 0; i < gameState.units.length; i++) {
        var unit = gameState.units[i];
        if (unit.owner !== 'player') continue;
        var def = UNIT_TYPES[unit.type];
        if (!def) continue;

        var range = def.visionRange;
        var unitCube = axialToCube(unit.q, unit.r);

        hexData.forEach(function (hex, key) {
            var hexCube = axialToCube(hex.q, hex.r);
            if (cubeDistance(unitCube, hexCube) <= range) {
                visible.add(key);
            }
        });
    }

    // Buildings also provide vision (range 2)
    for (var b = 0; b < gameState.buildings.length; b++) {
        var building = gameState.buildings[b];
        var bCube = axialToCube(building.q, building.r);

        hexData.forEach(function (hex, key) {
            var hexCube = axialToCube(hex.q, hex.r);
            if (cubeDistance(bCube, hexCube) <= 2) {
                visible.add(key);
            }
        });
    }

    return visible;
}

// ── Apply fog of war ──
// Supports InstancedMesh grid API (gridApi.applyFogBatch) or legacy per-mesh fallback
export function applyFogOfWar(hexMeshes, hexData, visibleHexes, exploredHexes, gridApi) {
    if (gridApi && gridApi.applyFogBatch) {
        gridApi.applyFogBatch(visibleHexes, exploredHexes);
        return;
    }

    // Legacy fallback (individual meshes)
    var exploredSet = new Set(exploredHexes);

    hexMeshes.forEach(function (mesh, key) {
        if (!mesh._originalMaterial) {
            mesh._originalMaterial = mesh.material;
        }

        if (visibleHexes.has(key)) {
            mesh.material = mesh._originalMaterial;
            mesh.visible = true;
        } else if (exploredSet.has(key)) {
            if (!mesh._fogMaterial) {
                mesh._fogMaterial = mesh._originalMaterial.clone();
                mesh._fogMaterial.color = mesh._originalMaterial.color.clone().multiplyScalar(0.35);
                mesh._fogMaterial.emissive = new THREE.Color(0x000000);
            }
            mesh.material = mesh._fogMaterial;
            mesh.visible = true;
        } else {
            if (!mesh._darkMaterial) {
                mesh._darkMaterial = new THREE.MeshStandardMaterial({
                    color: 0x0a0a12,
                    roughness: 1,
                    metalness: 0,
                    flatShading: true,
                });
            }
            mesh.material = mesh._darkMaterial;
            mesh.visible = true;
        }
    });
}

// ── Combat resolution ──
// Returns { attackerHp, defenderHp, log }
export function resolveCombat(attacker, defender) {
    var aDef = UNIT_TYPES[attacker.type];
    var dDef = UNIT_TYPES[defender.type];

    var attackPower = aDef.attack;
    var defensePower = dDef.defense;

    // Apply hero rally bonus if adjacent hero
    // (handled at call site)

    // Damage calculation: attack - defense/2, minimum 1
    var damageToDefender = Math.max(1, attackPower - Math.floor(defensePower / 2));
    var damageToAttacker = Math.max(1, dDef.attack - Math.floor(aDef.defense / 2));

    // Attacker strikes first
    defender.hp -= damageToDefender;

    var log = aDef.name + ' attacks ' + dDef.name + ' for ' + damageToDefender + ' damage';

    // Defender strikes back if alive
    if (defender.hp > 0) {
        attacker.hp -= damageToAttacker;
        log += '. ' + dDef.name + ' retaliates for ' + damageToAttacker + ' damage';
    }

    if (defender.hp <= 0) {
        log += '. ' + dDef.name + ' defeated!';
    }
    if (attacker.hp <= 0) {
        log += '. ' + aDef.name + ' defeated!';
    }

    return {
        attackerHp: attacker.hp,
        defenderHp: defender.hp,
        log: log,
    };
}

// ── Hero abilities (applied each turn) ──
export function applyHeroAbilities(gameState, hexData) {
    if (!gameState.units) return [];

    var logs = [];

    for (var i = 0; i < gameState.units.length; i++) {
        var unit = gameState.units[i];
        if (unit.owner !== 'player') continue;
        var def = UNIT_TYPES[unit.type];
        if (!def || !def.isHero) continue;

        if (def.ability === 'area_heal') {
            // Archmage: heal adjacent friendly units by 10 HP
            var neighbors = getNeighbors(unit.q, unit.r);
            for (var n = 0; n < neighbors.length; n++) {
                var nb = neighbors[n];
                for (var j = 0; j < gameState.units.length; j++) {
                    var ally = gameState.units[j];
                    if (ally.owner === 'player' && ally.q === nb.q && ally.r === nb.r) {
                        var allyDef = UNIT_TYPES[ally.type];
                        var healed = Math.min(10, ally.maxHp - ally.hp);
                        if (healed > 0) {
                            ally.hp += healed;
                            logs.push(def.name + ' heals ' + allyDef.name + ' for ' + healed + ' HP');
                        }
                    }
                }
            }
        }

        // Rally and Charge are applied differently:
        // Rally: bonus is checked during combat
        // Charge: activated manually via UI
    }

    return logs;
}

// ── Check rally bonus from adjacent hero ──
export function getRallyBonus(unit, gameState) {
    if (!gameState.units) return 0;
    var neighbors = getNeighbors(unit.q, unit.r);
    for (var n = 0; n < neighbors.length; n++) {
        var nb = neighbors[n];
        for (var j = 0; j < gameState.units.length; j++) {
            var ally = gameState.units[j];
            if (ally.owner === 'player' && ally.q === nb.q && ally.r === nb.r) {
                var allyDef = UNIT_TYPES[ally.type];
                if (allyDef && allyDef.ability === 'rally') {
                    return 2; // +2 attack
                }
            }
        }
    }
    return 0;
}

// ── Process unit turn (called from main turn system) ──
// Refreshes movement points, advances training, applies hero abilities
export function processUnitTurn(gameState, hexData) {
    if (!gameState.units) gameState.units = [];

    var logs = [];

    // Advance training for units being built
    for (var i = gameState.units.length - 1; i >= 0; i--) {
        var unit = gameState.units[i];
        if (unit.turnsToReady > 0) {
            unit.turnsToReady--;
            if (unit.turnsToReady <= 0) {
                var def = UNIT_TYPES[unit.type];
                unit.movesLeft = def.moveRange;
                logs.push(def.name + ' is ready!');
            }
        } else {
            // Refresh movement points
            var uDef = UNIT_TYPES[unit.type];
            var moveRange = uDef.moveRange;

            // Check for Warchief charge (double movement)
            if (uDef.ability === 'charge' && unit.chargeActive) {
                moveRange *= 2;
                unit.chargeActive = false;
                logs.push(uDef.name + ' charges forward with double movement!');
            }

            unit.movesLeft = moveRange;
        }
    }

    // Apply hero abilities
    var heroLogs = applyHeroAbilities(gameState, hexData);
    logs = logs.concat(heroLogs);

    // Update explored hexes from unit vision
    var visible = getVisibleHexes(gameState, hexData);
    visible.forEach(function (key) {
        if (gameState.exploredHexes.indexOf(key) === -1) {
            gameState.exploredHexes.push(key);
        }
    });

    // Remove dead units
    for (var d = gameState.units.length - 1; d >= 0; d--) {
        if (gameState.units[d].hp <= 0) {
            gameState.units.splice(d, 1);
        }
    }

    return { logs: logs, visibleHexes: visible };
}

// ── Activate Warchief charge ability ──
export function activateCharge(unit) {
    var def = UNIT_TYPES[unit.type];
    if (!def || def.ability !== 'charge') return false;
    if (unit.chargeActive) return false;
    unit.chargeActive = true;
    return true;
}

// ── Get trainable units at a specific building hex ──
export function getTrainableUnits(buildingType, race) {
    var result = [];
    for (var key in UNIT_TYPES) {
        var def = UNIT_TYPES[key];
        if (def.trainAt === buildingType && def.races.includes(race)) {
            result.push(key);
        }
    }
    return result;
}

// Export terrain costs for UI
export { TERRAIN_MOVE_COST };
