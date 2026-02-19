// game-state.js — Central game state (serializable)
// Stores turn, race, resources, buildings, population, hex improvements, tech research

import { STARTING_RESOURCES } from './resources.js';
import { createTechState } from './tech-tree.js';

const SAVE_KEY = 'thunderclaw_hex_save';

// Create initial game state for a chosen race
export function createGameState(race) {
    return {
        turn: 1,
        race,
        resources: { ...STARTING_RESOURCES[race] },
        buildings: [],          // { type, q, r, turnsRemaining, level, workers }
        population: { current: 5, cap: 5 },  // Town Center gives 5 starting pop
        hexImprovements: [],    // { q, r, turnsRemaining, bonus }
        exploredHexes: [],      // "q,r" keys
        techState: createTechState(race),  // tech research progress
    };
}

// Add a building to the state
export function addBuilding(state, type, q, r, turnsToBuild) {
    state.buildings.push({
        type,
        q,
        r,
        turnsRemaining: turnsToBuild,
        level: 1,
        workers: 0,
    });
}

// Mark a hex as explored
export function exploreHex(state, q, r) {
    const key = `${q},${r}`;
    if (!state.exploredHexes.includes(key)) {
        state.exploredHexes.push(key);
    }
}

// Get total assigned workers across all buildings
export function getAssignedWorkers(state) {
    let total = 0;
    for (const b of state.buildings) {
        total += b.workers || 0;
    }
    return total;
}

// Get available (unassigned) workers
export function getAvailableWorkers(state) {
    return state.population.current - getAssignedWorkers(state);
}

// Start a hex improvement
export function startHexImprovement(state, q, r, bonus) {
    state.hexImprovements.push({
        q, r,
        turnsRemaining: 3,
        bonus, // e.g. { food: 2 } or { wood: 2 }
    });
}

// Save game state to localStorage
export function saveGame(state) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        return true;
    } catch (e) {
        return false;
    }
}

// Load game state from localStorage
export function loadGame() {
    try {
        const json = localStorage.getItem(SAVE_KEY);
        if (!json) return null;
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// Check if a saved game exists
export function hasSavedGame() {
    return localStorage.getItem(SAVE_KEY) !== null;
}

// Delete saved game
export function deleteSavedGame() {
    localStorage.removeItem(SAVE_KEY);
}

// Serialize state for save/load
export function serializeState(state) {
    return JSON.stringify(state);
}

// Deserialize state
export function deserializeState(json) {
    return JSON.parse(json);
}
