// resources.js — Resource definitions, gathering rates, and race bonuses

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
export const RACE_BONUSES = {
    human: { food: 1, wood: 1,   stone: 1,   gold: 1.5, mana: 1 },
    elf:   { food: 1, wood: 1.5, stone: 1,   gold: 1,   mana: 1.3 },
    orc:   { food: 1, wood: 1,   stone: 1.5, gold: 1,   mana: 1 },
};

// Calculate gathered resources for a building given race bonuses
export function gatherResources(buildingDef, race) {
    const bonuses = RACE_BONUSES[race];
    const gathered = {};
    for (const [resource, amount] of Object.entries(buildingDef.resourcesPerTurn)) {
        gathered[resource] = Math.floor(amount * (bonuses[resource] || 1));
    }
    return gathered;
}
