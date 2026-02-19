// ai-opponent.js — AI opponent: enemy settlement, buildings, units & decision-making
// Simple priority-queue AI that expands, builds, trains and attacks.

import { BUILDING_TYPES, canPlaceBuilding, recalcPopulationCap, getBuildingsForRace } from './buildings.js';
import { STARTING_RESOURCES, RACE_BONUSES, TERRAIN_BONUSES } from './resources.js';
import { UNIT_TYPES, getUnitsForRace, resolveCombat } from './units.js';
import { createTechState } from './tech-tree.js';
import { axialToCube, cubeDistance } from './hex-grid.js';
import { initBuildingHP } from './storyteller.js';

// ── Races for random AI pick ──
var RACES = ['human', 'elf', 'orc'];

// ── Difficulty resource multipliers ──
var DIFFICULTY_RESOURCE_MUL = {
    easy: 0.5,
    normal: 1.0,
    hard: 1.5,
};

var DIFFICULTY_BUILD_SPEED = {
    easy: 1.0,
    normal: 1.0,
    hard: 0.6, // builds faster on hard
};

// ── Building priority queue (higher index = lower priority) ──
var BUILD_PRIORITY = [
    'town_center',
    'farm',
    'lumber_mill',
    'quarry',
    'mine',
    'barracks',
    'mage_tower',
    'walls',
];

// ── Create AI state ──
// Returns a game-state-like object for the AI settlement
export function createAIState(playerRace, difficulty, gridSize, hexData) {
    // Pick a different race from the player
    var aiRace;
    var candidates = RACES.filter(function (r) { return r !== playerRace; });
    aiRace = candidates[Math.floor(Math.random() * candidates.length)];

    var aiState = {
        race: aiRace,
        resources: {},
        buildings: [],
        units: [],
        population: { current: 5, cap: 5 },
        exploredHexes: [],
        techState: createTechState(aiRace),
        turn: 0,
        difficulty: difficulty,
    };

    // Give AI starting resources (scaled by difficulty)
    var mul = DIFFICULTY_RESOURCE_MUL[difficulty] || 1.0;
    var starting = STARTING_RESOURCES[aiRace];
    for (var res in starting) {
        aiState.resources[res] = Math.floor(starting[res] * mul);
    }

    // Place AI Town Center on the opposite side of the map
    var spawnQ = gridSize - Math.floor(gridSize / 4);
    var spawnR = gridSize - Math.floor(gridSize / 4);
    var tcHex = findValidHexForAI(spawnQ, spawnR, 'town_center', hexData, aiState);
    if (tcHex) {
        placeAIBuilding(aiState, 'town_center', tcHex.q, tcHex.r, hexData);
        var tc = aiState.buildings[aiState.buildings.length - 1];
        tc.turnsRemaining = 0; // starts complete
        tc.workers = 2;
        var tcKey = tc.q + ',' + tc.r;
        var hex = hexData.get(tcKey);
        if (hex) hex.building = { type: 'town_center', turnsRemaining: 0, level: 1 };
    }

    initBuildingHP(aiState);
    recalcPopulationCap(aiState);

    return aiState;
}

// ── Find valid hex near target for AI building ──
function findValidHexForAI(cq, cr, buildingType, hexData, aiState) {
    for (var radius = 0; radius < 20; radius++) {
        for (var dq = -radius; dq <= radius; dq++) {
            for (var dr = -radius; dr <= radius; dr++) {
                var q = cq + dq;
                var r = cr + dr;
                var key = q + ',' + r;
                var hex = hexData.get(key);
                if (!hex) continue;
                // Check building requirements (terrain, empty hex)
                var check = canPlaceBuilding(buildingType, hex, aiState.resources);
                if (check.ok) return hex;
            }
        }
    }
    return null;
}

// ── Place an AI building ──
function placeAIBuilding(aiState, buildingType, q, r, hexData) {
    var def = BUILDING_TYPES[buildingType];

    // Deduct cost
    for (var res in def.cost) {
        aiState.resources[res] = (aiState.resources[res] || 0) - def.cost[res];
    }

    var buildTime = def.turnsToBuild;
    var speedMul = DIFFICULTY_BUILD_SPEED[aiState.difficulty] || 1.0;
    buildTime = Math.max(1, Math.round(buildTime * speedMul));
    if (buildingType === 'town_center') buildTime = 0;

    aiState.buildings.push({
        type: buildingType,
        q: q,
        r: r,
        turnsRemaining: buildTime,
        level: 1,
        workers: 0,
        owner: 'ai',
    });

    // Mark hex as having a building
    var key = q + ',' + r;
    var hex = hexData.get(key);
    if (hex) {
        hex.building = { type: buildingType, turnsRemaining: buildTime, level: 1 };
    }
}

// ── Get AI Town Center location ──
export function getAITownCenter(aiState) {
    for (var i = 0; i < aiState.buildings.length; i++) {
        if (aiState.buildings[i].type === 'town_center') {
            return aiState.buildings[i];
        }
    }
    return null;
}

// ── Process AI turn ──
// Called each turn after player turn processing.
// Returns { logs: [], builtBuildings: [], trainedUnits: [], attacks: [] }
export function processAITurn(aiState, playerState, hexData) {
    var result = {
        logs: [],
        builtBuildings: [],
        trainedUnits: [],
        attacks: [],
    };

    aiState.turn++;

    // 1. Gather resources from completed buildings
    gatherAIResources(aiState, hexData);

    // 2. Advance construction
    advanceAIConstruction(aiState, hexData, result);

    // 3. Population growth
    if (aiState.population.current < aiState.population.cap && aiState.resources.food >= 5) {
        aiState.population.current++;
        aiState.resources.food -= 5;
    }

    // 4. Build if resources allow (priority queue)
    aiBuildPhase(aiState, hexData, result);

    // 5. Train military if barracks exists
    aiTrainPhase(aiState, hexData, result);

    // 6. Process units: advance training, refresh movement
    aiUnitTurnRefresh(aiState);

    // 7. Move units toward player / unexplored territory
    aiMovePhase(aiState, playerState, hexData, result);

    // 8. Attack adjacent enemies
    aiAttackPhase(aiState, playerState, hexData, result);

    // Remove dead AI units
    for (var i = aiState.units.length - 1; i >= 0; i--) {
        if (aiState.units[i].hp <= 0) {
            aiState.units.splice(i, 1);
        }
    }

    return result;
}

// ── Resource gathering for AI ──
function gatherAIResources(aiState, hexData) {
    var mul = DIFFICULTY_RESOURCE_MUL[aiState.difficulty] || 1.0;
    var raceBonuses = RACE_BONUSES[aiState.race];

    for (var i = 0; i < aiState.buildings.length; i++) {
        var b = aiState.buildings[i];
        if (b.turnsRemaining > 0) continue;

        var def = BUILDING_TYPES[b.type];
        if (!def) continue;

        // Workers: AI auto-assigns workers proportionally
        var maxWorkers = def.workerSlots || 0;
        var workerRatio = maxWorkers > 0 ? Math.min(1, aiState.population.current / (aiState.buildings.length * 2)) : 1;
        if (maxWorkers === 0) workerRatio = 1;

        for (var res in def.resourcesPerTurn) {
            var amount = def.resourcesPerTurn[res];
            if (amount > 0) {
                var bonus = (raceBonuses[res] || 1);
                var gained = Math.floor(amount * bonus * workerRatio * mul);
                aiState.resources[res] = (aiState.resources[res] || 0) + gained;
            }
        }

        // Terrain bonus
        var key = b.q + ',' + b.r;
        var hex = hexData.get(key);
        if (hex) {
            var tBonus = TERRAIN_BONUSES[hex.terrain];
            if (tBonus) {
                for (var tres in tBonus) {
                    if (tBonus[tres] > 0) {
                        aiState.resources[tres] = (aiState.resources[tres] || 0) + tBonus[tres];
                    }
                }
            }
        }
    }
}

// ── Advance AI construction ──
function advanceAIConstruction(aiState, hexData, result) {
    for (var i = 0; i < aiState.buildings.length; i++) {
        var b = aiState.buildings[i];
        if (b.turnsRemaining > 0) {
            b.turnsRemaining--;
            if (b.turnsRemaining <= 0) {
                result.logs.push('AI completed ' + BUILDING_TYPES[b.type].name);
                // Update hexData
                var key = b.q + ',' + b.r;
                var hex = hexData.get(key);
                if (hex && hex.building) {
                    hex.building.turnsRemaining = 0;
                }
                // Init HP
                if (b.hp === undefined) {
                    var baseHp = 50;
                    var hpTable = { town_center: 100, farm: 40, barracks: 80, walls: 120 };
                    baseHp = hpTable[b.type] || 50;
                    b.hp = baseHp * (b.level || 1);
                    b.maxHp = b.hp;
                }
            }
        }
    }
    recalcPopulationCap(aiState);
}

// ── AI Build Phase ──
function aiBuildPhase(aiState, hexData, result) {
    var raceBuildings = getBuildingsForRace(aiState.race);

    // Count existing buildings by type
    var buildingCounts = {};
    for (var i = 0; i < aiState.buildings.length; i++) {
        var bt = aiState.buildings[i].type;
        buildingCounts[bt] = (buildingCounts[bt] || 0) + 1;
    }

    // Try to build in priority order
    for (var pi = 0; pi < BUILD_PRIORITY.length; pi++) {
        var bType = BUILD_PRIORITY[pi];
        if (bType === 'town_center') continue; // AI already has one
        if (!raceBuildings[bType]) continue; // Not available for this race

        var def = BUILDING_TYPES[bType];
        var count = buildingCounts[bType] || 0;

        // Limit: max 3 of each building, except farms (up to 4)
        var maxCount = bType === 'farm' ? 4 : 3;
        if (count >= maxCount) continue;

        // Check if AI can afford
        var canAfford = true;
        for (var res in def.cost) {
            if ((aiState.resources[res] || 0) < def.cost[res]) {
                canAfford = false;
                break;
            }
        }
        if (!canAfford) continue;

        // Find a valid hex near the AI TC
        var tc = getAITownCenter(aiState);
        if (!tc) break;

        var hex = findValidHexForAI(tc.q, tc.r, bType, hexData, aiState);
        if (!hex) continue;

        placeAIBuilding(aiState, bType, hex.q, hex.r, hexData);
        result.builtBuildings.push(bType);
        result.logs.push('AI builds ' + def.name);

        // Init HP for new building
        var newB = aiState.buildings[aiState.buildings.length - 1];
        initBuildingHP({ buildings: [newB] });

        // Only build one thing per turn
        break;
    }
}

// ── AI Train Phase ──
function aiTrainPhase(aiState, hexData, result) {
    // Find trainable unit types for this race
    var raceUnits = getUnitsForRace(aiState.race);

    // Prefer warriors, then archers
    var trainOrder = [];
    for (var key in raceUnits) {
        if (key.indexOf('worker') >= 0) continue; // Skip workers
        if (key.indexOf('hero') >= 0) continue; // Skip heroes for simplicity
        trainOrder.push(key);
    }

    // Sort: warriors first, then archers, then mages
    trainOrder.sort(function (a, b) {
        var order = { warrior: 0, archer: 1, mage: 2 };
        var aBase = a.split('_')[0];
        var bBase = b.split('_')[0];
        return (order[aBase] || 3) - (order[bBase] || 3);
    });

    for (var ti = 0; ti < trainOrder.length; ti++) {
        var uType = trainOrder[ti];
        var uDef = UNIT_TYPES[uType];
        if (!uDef) continue;

        // Check resources
        var canAfford = true;
        for (var res in uDef.cost) {
            if ((aiState.resources[res] || 0) < uDef.cost[res]) {
                canAfford = false;
                break;
            }
        }
        if (!canAfford) continue;

        // Check population
        var unitCount = aiState.units ? aiState.units.length : 0;
        if (aiState.population.current <= unitCount) continue;

        // Check for required building
        var hasBuilding = false;
        var spawnQ = 0, spawnR = 0;
        for (var bi = 0; bi < aiState.buildings.length; bi++) {
            var b = aiState.buildings[bi];
            if (b.type === uDef.trainAt && b.turnsRemaining <= 0) {
                // Check hex not occupied by another unit
                var occupied = false;
                for (var ui = 0; ui < aiState.units.length; ui++) {
                    if (aiState.units[ui].q === b.q && aiState.units[ui].r === b.r) {
                        occupied = true;
                        break;
                    }
                }
                if (!occupied) {
                    hasBuilding = true;
                    spawnQ = b.q;
                    spawnR = b.r;
                    break;
                }
            }
        }
        if (!hasBuilding) continue;

        // Deduct cost
        for (var res2 in uDef.cost) {
            aiState.resources[res2] -= uDef.cost[res2];
        }

        // Create unit
        var unit = {
            type: uType,
            q: spawnQ,
            r: spawnR,
            hp: uDef.hp,
            maxHp: uDef.hp,
            movesLeft: 0,
            turnsToReady: uDef.trainTurns,
            owner: 'ai',
        };
        aiState.units.push(unit);

        result.trainedUnits.push(uType);
        result.logs.push('AI trains ' + uDef.name);

        // Only train one unit per turn
        break;
    }
}

// ── Refresh AI unit movement and advance training ──
function aiUnitTurnRefresh(aiState) {
    for (var i = aiState.units.length - 1; i >= 0; i--) {
        var unit = aiState.units[i];
        if (unit.turnsToReady > 0) {
            unit.turnsToReady--;
            if (unit.turnsToReady <= 0) {
                var def = UNIT_TYPES[unit.type];
                unit.movesLeft = def.moveRange;
            }
        } else {
            var uDef = UNIT_TYPES[unit.type];
            unit.movesLeft = uDef ? uDef.moveRange : 2;
        }
    }
}

// ── Get hex neighbors ──
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

// ── AI Move Phase: move units toward player territory ──
function aiMovePhase(aiState, playerState, hexData, result) {
    // Get player TC as target
    var playerTC = null;
    for (var pi = 0; pi < playerState.buildings.length; pi++) {
        if (playerState.buildings[pi].type === 'town_center') {
            playerTC = playerState.buildings[pi];
            break;
        }
    }
    if (!playerTC) return;

    var targetQ = playerTC.q;
    var targetR = playerTC.r;

    // Calculate AI military strength for attack threshold
    var aiMilitary = 0;
    for (var mi = 0; mi < aiState.units.length; mi++) {
        var mu = aiState.units[mi];
        if (mu.turnsToReady <= 0) {
            var mDef = UNIT_TYPES[mu.type];
            if (mDef) aiMilitary += mDef.attack;
        }
    }

    // Attack threshold: AI needs at least 15 total attack power before advancing aggressively
    var aggressive = aiMilitary >= 15;

    for (var i = 0; i < aiState.units.length; i++) {
        var unit = aiState.units[i];
        if (unit.turnsToReady > 0 || unit.movesLeft <= 0) continue;

        var uDef = UNIT_TYPES[unit.type];
        if (!uDef) continue;

        // Determine target: if aggressive, move toward player TC; otherwise explore outward
        var goalQ, goalR;
        if (aggressive) {
            goalQ = targetQ;
            goalR = targetR;
        } else {
            // Move generally toward center of map
            var aiTC = getAITownCenter(aiState);
            if (aiTC) {
                // Move toward midpoint between AI TC and player TC
                goalQ = Math.round((aiTC.q + targetQ) / 2);
                goalR = Math.round((aiTC.r + targetR) / 2);
            } else {
                goalQ = targetQ;
                goalR = targetR;
            }
        }

        // Simple greedy movement: pick neighbor closest to goal
        var bestQ = unit.q;
        var bestR = unit.r;
        var bestDist = cubeDistance(axialToCube(unit.q, unit.r), axialToCube(goalQ, goalR));

        var neighbors = getNeighbors(unit.q, unit.r);
        for (var ni = 0; ni < neighbors.length; ni++) {
            var n = neighbors[ni];
            var nKey = n.q + ',' + n.r;
            var hex = hexData.get(nKey);
            if (!hex) continue;
            if (hex.terrain === 'water') continue;

            // Don't move onto hexes with friendly AI units
            var hasFriendly = false;
            for (var fi = 0; fi < aiState.units.length; fi++) {
                if (aiState.units[fi] !== unit && aiState.units[fi].q === n.q && aiState.units[fi].r === n.r) {
                    hasFriendly = true;
                    break;
                }
            }
            if (hasFriendly) continue;

            // Don't move onto player units unless aggressive (handled in attack phase)
            var hasPlayerUnit = false;
            if (playerState.units) {
                for (var pu = 0; pu < playerState.units.length; pu++) {
                    if (playerState.units[pu].q === n.q && playerState.units[pu].r === n.r) {
                        hasPlayerUnit = true;
                        break;
                    }
                }
            }
            if (hasPlayerUnit) continue;

            var dist = cubeDistance(axialToCube(n.q, n.r), axialToCube(goalQ, goalR));
            if (dist < bestDist) {
                bestDist = dist;
                bestQ = n.q;
                bestR = n.r;
            }
        }

        if (bestQ !== unit.q || bestR !== unit.r) {
            unit.q = bestQ;
            unit.r = bestR;
            unit.movesLeft--;
        }
    }
}

// ── AI Attack Phase: attack adjacent player units/buildings ──
function aiAttackPhase(aiState, playerState, hexData, result) {
    for (var i = 0; i < aiState.units.length; i++) {
        var unit = aiState.units[i];
        if (unit.turnsToReady > 0 || unit.hp <= 0) continue;

        var neighbors = getNeighbors(unit.q, unit.r);

        // Check for adjacent player units
        for (var ni = 0; ni < neighbors.length; ni++) {
            var n = neighbors[ni];

            // Attack player units
            if (playerState.units) {
                for (var pu = 0; pu < playerState.units.length; pu++) {
                    var pUnit = playerState.units[pu];
                    if (pUnit.q === n.q && pUnit.r === n.r && pUnit.hp > 0) {
                        var combatResult = resolveCombat(unit, pUnit);
                        result.attacks.push(combatResult);
                        result.logs.push('AI: ' + combatResult.log);

                        // Remove dead player units
                        if (pUnit.hp <= 0) {
                            var idx = playerState.units.indexOf(pUnit);
                            if (idx >= 0) playerState.units.splice(idx, 1);
                        }
                        break;
                    }
                }
            }

            // Attack player buildings (if unit is adjacent and no unit blocking)
            for (var bi = 0; bi < playerState.buildings.length; bi++) {
                var pBuilding = playerState.buildings[bi];
                if (pBuilding.q === n.q && pBuilding.r === n.r && pBuilding.turnsRemaining <= 0) {
                    // Check no player unit on the building hex
                    var defended = false;
                    if (playerState.units) {
                        for (var du = 0; du < playerState.units.length; du++) {
                            if (playerState.units[du].q === n.q && playerState.units[du].r === n.r) {
                                defended = true;
                                break;
                            }
                        }
                    }
                    if (defended) continue;

                    var uDef = UNIT_TYPES[unit.type];
                    var damage = uDef ? uDef.attack : 5;
                    if (pBuilding.hp === undefined) {
                        pBuilding.hp = 50;
                        pBuilding.maxHp = 50;
                    }
                    pBuilding.hp -= damage;
                    var bName = BUILDING_TYPES[pBuilding.type] ? BUILDING_TYPES[pBuilding.type].name : pBuilding.type;
                    result.logs.push('AI attacks ' + bName + ' for ' + damage + ' damage');

                    if (pBuilding.hp <= 0) {
                        pBuilding.hp = 0;
                        // If TC destroyed, leave it for victory check
                        if (pBuilding.type === 'town_center') {
                            result.logs.push('AI destroyed your Town Center!');
                        } else {
                            // Mark for rebuilding
                            pBuilding.turnsRemaining = BUILDING_TYPES[pBuilding.type].turnsToBuild;
                            var key = pBuilding.q + ',' + pBuilding.r;
                            var hex = hexData.get(key);
                            if (hex && hex.building) {
                                hex.building.turnsRemaining = pBuilding.turnsRemaining;
                            }
                            result.logs.push('AI destroyed ' + bName + '!');
                        }
                    }
                    break;
                }
            }
        }
    }
}

// ── Check if AI is defeated (TC destroyed) ──
export function checkAIDefeated(aiState) {
    var tc = getAITownCenter(aiState);
    if (!tc) return true;
    if (tc.hp !== undefined && tc.hp <= 0) return true;
    return false;
}

// ── Get visible hexes for AI (used for fog of war visibility) ──
export function getAIVisibleHexes(aiState, hexData) {
    var visible = new Set();

    // AI buildings provide vision range 2
    for (var b = 0; b < aiState.buildings.length; b++) {
        var building = aiState.buildings[b];
        var bCube = axialToCube(building.q, building.r);
        hexData.forEach(function (hex, key) {
            var hexCube = axialToCube(hex.q, hex.r);
            if (cubeDistance(bCube, hexCube) <= 2) {
                visible.add(key);
            }
        });
    }

    // AI units provide vision
    for (var i = 0; i < aiState.units.length; i++) {
        var unit = aiState.units[i];
        if (unit.turnsToReady > 0) continue;
        var uDef = UNIT_TYPES[unit.type];
        if (!uDef) continue;
        var range = uDef.visionRange;
        var unitCube = axialToCube(unit.q, unit.r);
        hexData.forEach(function (hex, key) {
            var hexCube = axialToCube(hex.q, hex.r);
            if (cubeDistance(unitCube, hexCube) <= range) {
                visible.add(key);
            }
        });
    }

    return visible;
}
