// victory.js — Victory conditions, game over detection, and stats tracking
// Checks for win/loss each turn. Tracks game stats for end screen.

import { BUILDING_TYPES } from './buildings.js';

// ── Ultimate buildings per race ──
var ULTIMATE_BUILDINGS = {
    human: 'grand_cathedral',
    elf: 'world_tree',
    orc: 'skull_throne',
};

// ── Victory condition thresholds (scale by difficulty) ──
var DIFFICULTY_MULTIPLIERS = {
    easy: 0.7,
    normal: 1.0,
    hard: 1.4,
};

// Base victory conditions
var BASE_CONDITIONS = {
    population: 25,
    survive_turns: 50,
};

// ── Check victory conditions ──
// Returns { won: bool, reason: string } or null if game continues
// aiState: optional AI opponent state
export function checkVictory(gameState, difficulty, aiState) {
    var mul = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
    var race = gameState.race;

    // Condition 0: Destroy enemy Town Center (primary win condition when AI present)
    if (aiState) {
        var aiHasTC = false;
        for (var ai = 0; ai < aiState.buildings.length; ai++) {
            var ab = aiState.buildings[ai];
            if (ab.type === 'town_center') {
                if (ab.hp !== undefined && ab.hp <= 0) {
                    return { won: true, reason: 'Destroyed the enemy Town Center!' };
                }
                aiHasTC = true;
            }
        }
        if (!aiHasTC) {
            return { won: true, reason: 'Destroyed the enemy Town Center!' };
        }
    }

    // Condition 1: Build ultimate building
    var ultimateType = ULTIMATE_BUILDINGS[race];
    if (ultimateType) {
        for (var i = 0; i < gameState.buildings.length; i++) {
            var b = gameState.buildings[i];
            if (b.type === ultimateType && b.turnsRemaining <= 0) {
                return { won: true, reason: 'Built the ' + BUILDING_TYPES[ultimateType].name + '!' };
            }
        }
    }

    // Condition 2: Reach population target
    var popTarget = Math.ceil(BASE_CONDITIONS.population * mul);
    if (gameState.population.current >= popTarget) {
        return { won: true, reason: 'Reached population ' + popTarget + '!' };
    }

    // Condition 3: Survive N turns
    var surviveTarget = Math.ceil(BASE_CONDITIONS.survive_turns * mul);
    if (gameState.turn >= surviveTarget) {
        return { won: true, reason: 'Survived ' + surviveTarget + ' turns!' };
    }

    return null;
}

// ── Check defeat conditions ──
// Returns { lost: bool, reason: string } or null if game continues
export function checkDefeat(gameState) {
    // Condition 1: Town Center destroyed (HP 0 and needs rebuilding)
    var hasTownCenter = false;
    for (var i = 0; i < gameState.buildings.length; i++) {
        var b = gameState.buildings[i];
        if (b.type === 'town_center') {
            if (b.hp !== undefined && b.hp <= 0) {
                return { lost: true, reason: 'Your Town Center was destroyed!' };
            }
            hasTownCenter = true;
        }
    }
    if (!hasTownCenter) {
        return { lost: true, reason: 'Your Town Center was destroyed!' };
    }

    // Condition 2: All population lost
    if (gameState.population.current <= 0) {
        return { lost: true, reason: 'Your settlement has no remaining population.' };
    }

    return null;
}

// ── Collect game stats for summary screen ──
// aiState: optional AI opponent state for additional stats
export function collectStats(gameState, storytellerState, difficulty, startTime, aiState) {
    var totalResources = 0;
    for (var res in gameState.resources) {
        totalResources += gameState.resources[res] || 0;
    }

    var completedBuildings = 0;
    var maxLevel = 1;
    for (var i = 0; i < gameState.buildings.length; i++) {
        var b = gameState.buildings[i];
        if (b.turnsRemaining <= 0) completedBuildings++;
        if ((b.level || 1) > maxLevel) maxLevel = b.level;
    }

    var unitCount = gameState.units ? gameState.units.length : 0;
    var heroCount = 0;
    if (gameState.units) {
        for (var u = 0; u < gameState.units.length; u++) {
            if (gameState.units[u].type && gameState.units[u].type.indexOf('hero') === 0) {
                heroCount++;
            }
        }
    }

    var techCompleted = 0;
    if (gameState.techState) {
        for (var id in gameState.techState) {
            if (gameState.techState[id].status === 'completed') techCompleted++;
        }
    }

    var questsCompleted = storytellerState ? storytellerState.completedQuestCount || 0 : 0;
    var eventsTotal = storytellerState ? (storytellerState.eventLog || []).length : 0;

    var elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;

    var stats = {
        race: gameState.race,
        difficulty: difficulty,
        turns: gameState.turn,
        population: gameState.population.current,
        populationCap: gameState.population.cap,
        buildings: completedBuildings,
        maxBuildingLevel: maxLevel,
        units: unitCount,
        heroes: heroCount,
        techResearched: techCompleted,
        questsCompleted: questsCompleted,
        eventsExperienced: eventsTotal,
        totalResources: totalResources,
        resources: { ...gameState.resources },
        playTime: minutes + 'm ' + (seconds < 10 ? '0' : '') + seconds + 's',
    };

    // AI opponent stats
    if (aiState) {
        stats.enemyRace = aiState.race;
        var aiBuildings = 0;
        for (var ab = 0; ab < aiState.buildings.length; ab++) {
            if (aiState.buildings[ab].turnsRemaining <= 0) aiBuildings++;
        }
        stats.enemyBuildings = aiBuildings;
        stats.enemyUnits = aiState.units ? aiState.units.length : 0;
    }

    return stats;
}
