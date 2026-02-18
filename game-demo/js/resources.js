// resources.js — Resource definitions, gathering rates, race bonuses, terrain bonuses

export const RESOURCE_TYPES = ['food', 'wood', 'stone', 'gold', 'mana'];

// Display info for each resource
export const RESOURCE_INFO = {
    food:  { label: 'Food',  icon: 'F', color: '#4ade80' },
    wood:  { label: 'Wood',  icon: 'W', color: '#a3e635' },
    stone: { label: 'Stone', icon: 'S', color: '#94a3b8' },
    gold:  { label: 'Gold',  icon: 'G', color: '#fbbf24' },
    mana:  { label: 'Mana',  icon: 'M', color: '#a78bfa' },
};

// Starting resources per race
export const STARTING_RESOURCES = {
    human: { food: 50, wood: 30, stone: 20, gold: 30, mana: 5 },
    elf:   { food: 40, wood: 50, stone: 10, gold: 20, mana: 15 },
    orc:   { food: 60, wood: 20, stone: 40, gold: 15, mana: 5 },
};

// Race bonuses (multiplier applied to base gathering rate)
// Expanded: each race now has stronger identity
export const RACE_BONUSES = {
    human: { food: 1.1, wood: 1,   stone: 1,   gold: 1.5, mana: 1 },
    elf:   { food: 1,   wood: 1.5, stone: 0.8, gold: 1,   mana: 1.4 },
    orc:   { food: 1.2, wood: 0.9, stone: 1.5, gold: 1,   mana: 0.8 },
};

// Terrain bonuses — passive resource bonus per turn for buildings on matching terrain
export const TERRAIN_BONUSES = {
    plains:   { food: 1, wood: 0, stone: 0, gold: 0, mana: 0 },
    forest:   { food: 0, wood: 1, stone: 0, gold: 0, mana: 0 },
    mountain: { food: 0, wood: 0, stone: 1, gold: 0, mana: 0 },
    desert:   { food: 0, wood: 0, stone: 0, gold: 1, mana: 0 },
    water:    { food: 0, wood: 0, stone: 0, gold: 0, mana: 0 },
};

// Calculate gathered resources for a building given race bonuses
// workerRatio: fraction of worker slots filled (0 to 1), defaults to 1 for backward compat
export function gatherResources(buildingDef, race, workerRatio) {
    if (workerRatio === undefined) workerRatio = 1;
    const bonuses = RACE_BONUSES[race];
    const gathered = {};
    for (const [resource, amount] of Object.entries(buildingDef.resourcesPerTurn)) {
        gathered[resource] = Math.floor(amount * (bonuses[resource] || 1) * workerRatio);
    }
    return gathered;
}
