// game-state.js — Central game state (serializable)
// Stores turn, race, resources, buildings, units, explored hexes

import { STARTING_RESOURCES } from './resources.js';

// Create initial game state for a chosen race
export function createGameState(race) {
    return {
        turn: 1,
        race,
        resources: { ...STARTING_RESOURCES[race] },
        buildings: [],     // { type, q, r, turnsRemaining }
        units: [],         // reserved for future phases
        exploredHexes: [], // "q,r" keys
    };
}

// Add a building to the state
export function addBuilding(state, type, q, r, turnsToBuild) {
    state.buildings.push({
        type,
        q,
        r,
        turnsRemaining: turnsToBuild,
    });
}

// Mark a hex as explored
export function exploreHex(state, q, r) {
    const key = `${q},${r}`;
    if (!state.exploredHexes.includes(key)) {
        state.exploredHexes.push(key);
    }
}

// Serialize state for save/load
export function serializeState(state) {
    return JSON.stringify(state);
}

// Deserialize state
export function deserializeState(json) {
    return JSON.parse(json);
}
