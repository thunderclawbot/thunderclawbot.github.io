// turn.js — Turn system: end turn, gather resources, advance construction

import { BUILDING_TYPES } from './buildings.js';
import { gatherResources } from './resources.js';

// Process end of turn: gather resources, advance construction
export function processTurn(state, onBuildingComplete) {
    state.turn += 1;

    // Gather resources from completed buildings
    for (const building of state.buildings) {
        if (building.turnsRemaining <= 0) {
            const def = BUILDING_TYPES[building.type];
            const gathered = gatherResources(def, state.race);
            for (const [resource, amount] of Object.entries(gathered)) {
                state.resources[resource] = (state.resources[resource] || 0) + amount;
            }
        }
    }

    // Advance construction
    for (const building of state.buildings) {
        if (building.turnsRemaining > 0) {
            building.turnsRemaining -= 1;
            if (building.turnsRemaining <= 0 && onBuildingComplete) {
                onBuildingComplete(building);
            }
        }
    }
}
