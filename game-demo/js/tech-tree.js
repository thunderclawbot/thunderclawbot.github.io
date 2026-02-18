// tech-tree.js — Race-specific tech trees with prerequisites, research costs, and unlocks
// Each race has 3 branches: Economy, Military, Magic
// Techs unlock race-specific buildings, upgrades, and abilities

// Tech node states
export const TECH_STATE = {
    locked: 'locked',       // Prerequisites not met
    available: 'available', // Can be researched
    researching: 'researching', // Currently being researched
    completed: 'completed',     // Done
};

// ── Human Tech Tree ──
// Economy & diplomacy focus
const HUMAN_TREE = {
    // Economy branch
    agriculture: {
        name: 'Agriculture',
        branch: 'economy',
        cost: { food: 20, gold: 10 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['farm'] },
        description: 'Unlocks Farm construction',
    },
    commerce: {
        name: 'Commerce',
        branch: 'economy',
        cost: { food: 30, gold: 20 },
        turnsToResearch: 4,
        prerequisites: ['agriculture'],
        unlocks: { buildings: ['market'] },
        description: 'Unlocks Market — generates gold',
    },
    masonry: {
        name: 'Masonry',
        branch: 'economy',
        cost: { wood: 20, stone: 15, gold: 10 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['quarry', 'walls'] },
        description: 'Unlocks Quarry and Walls',
    },
    mining: {
        name: 'Mining',
        branch: 'economy',
        cost: { wood: 25, stone: 20, gold: 15 },
        turnsToResearch: 4,
        prerequisites: ['masonry'],
        unlocks: { buildings: ['mine'] },
        description: 'Unlocks Mine construction',
    },
    // Military branch
    militia: {
        name: 'Militia',
        branch: 'military',
        cost: { food: 25, wood: 15, gold: 15 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['barracks'] },
        description: 'Unlocks Barracks',
    },
    fortification: {
        name: 'Fortification',
        branch: 'military',
        cost: { wood: 30, stone: 40, gold: 20 },
        turnsToResearch: 5,
        prerequisites: ['militia', 'masonry'],
        unlocks: { buildings: ['castle'] },
        description: 'Unlocks Castle — strong defense',
    },
    // Magic branch
    scripture: {
        name: 'Scripture',
        branch: 'magic',
        cost: { gold: 25, mana: 10 },
        turnsToResearch: 4,
        prerequisites: [],
        unlocks: { buildings: ['chapel'] },
        description: 'Unlocks Chapel — generates mana',
    },
    arcane_studies: {
        name: 'Arcane Studies',
        branch: 'magic',
        cost: { gold: 30, mana: 20 },
        turnsToResearch: 5,
        prerequisites: ['scripture'],
        unlocks: { buildings: ['mage_tower'] },
        description: 'Unlocks Mage Tower',
    },
    divine_mandate: {
        name: 'Divine Mandate',
        branch: 'magic',
        cost: { food: 50, gold: 60, mana: 30 },
        turnsToResearch: 8,
        prerequisites: ['fortification', 'arcane_studies'],
        unlocks: { buildings: ['grand_cathedral'] },
        description: 'Unlocks Grand Cathedral — ultimate building',
    },
};

// ── Elf Tech Tree ──
// Magic & nature focus
const ELF_TREE = {
    // Economy branch
    herbalism: {
        name: 'Herbalism',
        branch: 'economy',
        cost: { food: 15, wood: 10 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['farm'] },
        description: 'Unlocks Farm construction',
    },
    forestry: {
        name: 'Forestry',
        branch: 'economy',
        cost: { food: 15, wood: 20 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['lumber_mill'] },
        description: 'Unlocks Lumber Mill',
    },
    nature_bond: {
        name: 'Nature Bond',
        branch: 'economy',
        cost: { wood: 30, mana: 15 },
        turnsToResearch: 4,
        prerequisites: ['forestry'],
        unlocks: { buildings: ['tree_of_life'] },
        description: 'Unlocks Tree of Life — wood & pop',
    },
    stonecraft: {
        name: 'Stonecraft',
        branch: 'economy',
        cost: { wood: 20, stone: 15, gold: 10 },
        turnsToResearch: 4,
        prerequisites: [],
        unlocks: { buildings: ['quarry', 'mine', 'walls'] },
        description: 'Unlocks Quarry, Mine, and Walls',
    },
    // Military branch
    sentinels: {
        name: 'Sentinels',
        branch: 'military',
        cost: { wood: 20, gold: 15, mana: 5 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['barracks'] },
        description: 'Unlocks Barracks',
    },
    // Magic branch
    moonlight: {
        name: 'Moonlight',
        branch: 'magic',
        cost: { wood: 15, mana: 15 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['moonwell'] },
        description: 'Unlocks Moonwell — mana & healing',
    },
    arcane_lore: {
        name: 'Arcane Lore',
        branch: 'magic',
        cost: { gold: 20, mana: 20 },
        turnsToResearch: 4,
        prerequisites: ['moonlight'],
        unlocks: { buildings: ['mage_tower'] },
        description: 'Unlocks Mage Tower',
    },
    ancient_knowledge: {
        name: 'Ancient Knowledge',
        branch: 'magic',
        cost: { wood: 25, gold: 25, mana: 25 },
        turnsToResearch: 5,
        prerequisites: ['arcane_lore'],
        unlocks: { buildings: ['ancient_archive'] },
        description: 'Unlocks Ancient Archive — powerful magic',
    },
    world_tree: {
        name: 'World Tree',
        branch: 'magic',
        cost: { wood: 60, gold: 40, mana: 50 },
        turnsToResearch: 8,
        prerequisites: ['nature_bond', 'ancient_knowledge'],
        unlocks: { buildings: ['world_tree'] },
        description: 'Unlocks World Tree — ultimate building',
    },
};

// ── Orc Tech Tree ──
// Military & raiding focus
const ORC_TREE = {
    // Economy branch
    foraging: {
        name: 'Foraging',
        branch: 'economy',
        cost: { food: 15, stone: 10 },
        turnsToResearch: 2,
        prerequisites: [],
        unlocks: { buildings: ['farm'] },
        description: 'Unlocks Farm construction',
    },
    logging: {
        name: 'Logging',
        branch: 'economy',
        cost: { food: 10, wood: 10, stone: 5 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['lumber_mill'] },
        description: 'Unlocks Lumber Mill',
    },
    excavation: {
        name: 'Excavation',
        branch: 'economy',
        cost: { food: 15, stone: 20, gold: 5 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['quarry', 'mine', 'walls'] },
        description: 'Unlocks Quarry, Mine, and Walls',
    },
    // Military branch
    war_drums: {
        name: 'War Drums',
        branch: 'military',
        cost: { food: 20, stone: 15 },
        turnsToResearch: 2,
        prerequisites: [],
        unlocks: { buildings: ['barracks'] },
        description: 'Unlocks Barracks',
    },
    blood_forge_tech: {
        name: 'Blood Smithing',
        branch: 'military',
        cost: { food: 30, stone: 30, gold: 15 },
        turnsToResearch: 4,
        prerequisites: ['war_drums', 'excavation'],
        unlocks: { buildings: ['blood_forge'] },
        description: 'Unlocks Blood Forge — weapons & armor',
    },
    war_pit_tech: {
        name: 'War Pits',
        branch: 'military',
        cost: { food: 40, stone: 25, gold: 20 },
        turnsToResearch: 5,
        prerequisites: ['blood_forge_tech'],
        unlocks: { buildings: ['war_pit'] },
        description: 'Unlocks War Pit — elite warriors',
    },
    // Magic branch
    spirit_call: {
        name: 'Spirit Call',
        branch: 'magic',
        cost: { food: 15, stone: 10, mana: 10 },
        turnsToResearch: 3,
        prerequisites: [],
        unlocks: { buildings: ['totem'] },
        description: 'Unlocks Totem — spiritual power',
    },
    shamanism: {
        name: 'Shamanism',
        branch: 'magic',
        cost: { stone: 20, gold: 15, mana: 15 },
        turnsToResearch: 4,
        prerequisites: ['spirit_call'],
        unlocks: { buildings: ['mage_tower'] },
        description: 'Unlocks Mage Tower',
    },
    warlord_ascension: {
        name: 'Warlord Ascension',
        branch: 'magic',
        cost: { food: 60, stone: 50, gold: 30, mana: 20 },
        turnsToResearch: 8,
        prerequisites: ['war_pit_tech', 'shamanism'],
        unlocks: { buildings: ['skull_throne'] },
        description: 'Unlocks Skull Throne — ultimate building',
    },
};

// All race trees
export const RACE_TECH_TREES = {
    human: HUMAN_TREE,
    elf: ELF_TREE,
    orc: ORC_TREE,
};

// Initialize tech research state for a race
export function createTechState(race) {
    var tree = RACE_TECH_TREES[race];
    var state = {};
    for (var id in tree) {
        state[id] = {
            status: TECH_STATE.locked,
            turnsRemaining: 0,
        };
    }
    // Unlock techs with no prerequisites
    for (var id2 in tree) {
        if (tree[id2].prerequisites.length === 0) {
            state[id2].status = TECH_STATE.available;
        }
    }
    return state;
}

// Check if a tech can be researched
export function canResearchTech(techId, race, techState, resources) {
    var tree = RACE_TECH_TREES[race];
    var tech = tree[techId];
    if (!tech) return { ok: false, reason: 'Unknown tech' };

    var ts = techState[techId];
    if (ts.status === TECH_STATE.completed) return { ok: false, reason: 'Already researched' };
    if (ts.status === TECH_STATE.researching) return { ok: false, reason: 'Already researching' };
    if (ts.status === TECH_STATE.locked) return { ok: false, reason: 'Prerequisites not met' };

    // Check if already researching something else
    for (var id in techState) {
        if (techState[id].status === TECH_STATE.researching) {
            return { ok: false, reason: 'Already researching ' + tree[id].name };
        }
    }

    // Check resources
    for (var res in tech.cost) {
        if ((resources[res] || 0) < tech.cost[res]) {
            return { ok: false, reason: 'Not enough ' + res };
        }
    }

    return { ok: true };
}

// Start researching a tech
export function startResearch(techId, race, techState, resources) {
    var tree = RACE_TECH_TREES[race];
    var tech = tree[techId];

    // Deduct cost
    var newResources = {};
    for (var res in resources) {
        newResources[res] = resources[res];
    }
    for (var res2 in tech.cost) {
        newResources[res2] -= tech.cost[res2];
    }

    techState[techId].status = TECH_STATE.researching;
    techState[techId].turnsRemaining = tech.turnsToResearch;

    return newResources;
}

// Advance research by one turn — returns list of completed tech ids
export function advanceResearch(race, techState) {
    var tree = RACE_TECH_TREES[race];
    var completed = [];

    for (var id in techState) {
        if (techState[id].status === TECH_STATE.researching) {
            techState[id].turnsRemaining -= 1;
            if (techState[id].turnsRemaining <= 0) {
                techState[id].status = TECH_STATE.completed;
                completed.push(id);
            }
        }
    }

    // Update available techs based on newly completed prerequisites
    if (completed.length > 0) {
        updateAvailableTechs(race, techState);
    }

    return completed;
}

// Recalculate which techs are available based on completed prerequisites
export function updateAvailableTechs(race, techState) {
    var tree = RACE_TECH_TREES[race];
    for (var id in tree) {
        if (techState[id].status !== TECH_STATE.locked) continue;
        var prereqs = tree[id].prerequisites;
        var allMet = true;
        for (var i = 0; i < prereqs.length; i++) {
            if (!techState[prereqs[i]] || techState[prereqs[i]].status !== TECH_STATE.completed) {
                allMet = false;
                break;
            }
        }
        if (allMet) {
            techState[id].status = TECH_STATE.available;
        }
    }
}

// Get set of all buildings unlocked by completed techs
export function getUnlockedBuildings(race, techState) {
    var tree = RACE_TECH_TREES[race];
    var unlocked = new Set();
    // Town Center is always available
    unlocked.add('town_center');
    for (var id in techState) {
        if (techState[id].status === TECH_STATE.completed) {
            var tech = tree[id];
            if (tech.unlocks && tech.unlocks.buildings) {
                for (var i = 0; i < tech.unlocks.buildings.length; i++) {
                    unlocked.add(tech.unlocks.buildings[i]);
                }
            }
        }
    }
    return unlocked;
}

// Get the currently researching tech (or null)
export function getCurrentResearch(techState) {
    for (var id in techState) {
        if (techState[id].status === TECH_STATE.researching) {
            return id;
        }
    }
    return null;
}
