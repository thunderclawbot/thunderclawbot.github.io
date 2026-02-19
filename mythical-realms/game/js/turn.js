// turn.js — Turn system: end turn, gather resources, advance construction, hex improvements, tech research

import { BUILDING_TYPES, recalcPopulationCap } from './buildings.js';
import { gatherResources, TERRAIN_BONUSES } from './resources.js';
import { advanceResearch } from './tech-tree.js';

// Process end of turn: gather resources, advance construction, process hex improvements, advance research
// hexData: Map of "q,r" -> hex object (for terrain lookup)
export function processTurn(state, onBuildingComplete, hexData) {
    state.turn += 1;

    const gathered = {}; // Track total gathered this turn for visualization

    // Gather resources from completed buildings (scaled by worker ratio)
    for (const building of state.buildings) {
        if (building.turnsRemaining <= 0) {
            const def = BUILDING_TYPES[building.type];
            const maxWorkers = def.workerSlots || 0;
            const workerRatio = maxWorkers > 0 ? (building.workers || 0) / maxWorkers : 1;

            // Only produce if workers assigned (or no worker slots e.g. walls)
            if (maxWorkers === 0 || workerRatio > 0) {
                const res = gatherResources(def, state.race, workerRatio);
                for (const [resource, amount] of Object.entries(res)) {
                    state.resources[resource] = (state.resources[resource] || 0) + amount;
                    gathered[resource] = (gathered[resource] || 0) + amount;
                }

                // Apply terrain bonus if hexData available
                if (hexData) {
                    const key = building.q + ',' + building.r;
                    const hex = hexData.get(key);
                    if (hex) {
                        const tBonus = TERRAIN_BONUSES[hex.terrain];
                        if (tBonus) {
                            for (const [resource, amount] of Object.entries(tBonus)) {
                                if (amount > 0) {
                                    state.resources[resource] = (state.resources[resource] || 0) + amount;
                                    gathered[resource] = (gathered[resource] || 0) + amount;
                                }
                            }
                        }
                    }
                }
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

    // Advance hex improvements
    if (state.hexImprovements) {
        for (const imp of state.hexImprovements) {
            if (imp.turnsRemaining > 0) {
                imp.turnsRemaining -= 1;
            }
        }

        // Apply completed hex improvement bonuses
        for (const imp of state.hexImprovements) {
            if (imp.turnsRemaining <= 0 && imp.bonus) {
                for (const [resource, amount] of Object.entries(imp.bonus)) {
                    if (amount > 0) {
                        state.resources[resource] = (state.resources[resource] || 0) + amount;
                        gathered[resource] = (gathered[resource] || 0) + amount;
                    }
                }
            }
        }
    }

    // Advance tech research
    var completedTechs = [];
    if (state.techState) {
        completedTechs = advanceResearch(state.race, state.techState);
    }

    // Recalculate population cap
    recalcPopulationCap(state);

    // Population growth: +1 per turn if current < cap and enough food
    if (state.population.current < state.population.cap && state.resources.food >= 5) {
        state.population.current += 1;
        state.resources.food -= 5;
    }

    return { gathered: gathered, completedTechs: completedTechs };
}
