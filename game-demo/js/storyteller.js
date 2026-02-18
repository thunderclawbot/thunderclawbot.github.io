// storyteller.js — AI Storyteller: event/quest generator & building HP (Cassandra-style)
// Monitors game state and generates contextual events/quests each turn.
// "Cassandra Classic": predictable escalation with occasional mercy.

import { BUILDING_TYPES } from './buildings.js';

// ── Building HP table ──
// Base HP per building type. Walls/Barracks/Castle/War Pit give defensive bonus.
var BUILDING_HP = {
    town_center: 100,
    farm: 40,
    lumber_mill: 50,
    quarry: 60,
    mine: 60,
    barracks: 80,
    mage_tower: 50,
    walls: 120,
    market: 50,
    castle: 120,
    chapel: 50,
    grand_cathedral: 150,
    tree_of_life: 70,
    moonwell: 50,
    ancient_archive: 60,
    world_tree: 160,
    war_pit: 90,
    blood_forge: 70,
    totem: 40,
    skull_throne: 150,
};

// ── Defense buildings that reduce raid damage ──
var DEFENSE_BUILDINGS = ['walls', 'barracks', 'castle', 'war_pit'];

// ── Event pools ──

var BOON_EVENTS = [
    {
        name: 'Wandering Settlers',
        text: 'A group of travelers seeks refuge in your settlement.',
        effect: function (state) {
            var gain = 1 + Math.floor(Math.random() * 2);
            state.population.current = Math.min(state.population.cap, state.population.current + gain);
            return '+' + gain + ' population';
        },
    },
    {
        name: 'Resource Discovery',
        text: 'Your workers discovered a rich deposit nearby!',
        effect: function (state) {
            var resources = ['food', 'wood', 'stone', 'gold'];
            var res = resources[Math.floor(Math.random() * resources.length)];
            var amount = 15 + Math.floor(Math.random() * 20);
            state.resources[res] = (state.resources[res] || 0) + amount;
            return '+' + amount + ' ' + res;
        },
    },
    {
        name: 'Favorable Weather',
        text: 'Clear skies and warm rain bless your farmlands.',
        effect: function (state) {
            var foodGain = 10 + Math.floor(Math.random() * 15);
            state.resources.food = (state.resources.food || 0) + foodGain;
            return '+' + foodGain + ' food';
        },
    },
    {
        name: 'Trade Caravan',
        text: 'A merchant caravan passes through, trading generously.',
        effect: function (state) {
            var goldGain = 10 + Math.floor(Math.random() * 15);
            state.resources.gold = (state.resources.gold || 0) + goldGain;
            return '+' + goldGain + ' gold';
        },
    },
    {
        name: 'Mana Surge',
        text: 'A ley line flares beneath your settlement, releasing magical energy.',
        effect: function (state) {
            var manaGain = 5 + Math.floor(Math.random() * 10);
            state.resources.mana = (state.resources.mana || 0) + manaGain;
            return '+' + manaGain + ' mana';
        },
    },
];

var CHALLENGE_EVENTS = [
    {
        name: 'Bandit Raid',
        text: 'A band of raiders attacks your settlement!',
        isRaid: true,
        effect: function (state, hexData) {
            return executeRaid(state, hexData, 'bandits');
        },
    },
    {
        name: 'Plague',
        text: 'A mysterious sickness spreads through your people.',
        effect: function (state) {
            var loss = Math.max(1, Math.floor(state.population.current * 0.15));
            state.population.current = Math.max(1, state.population.current - loss);
            return '-' + loss + ' population';
        },
    },
    {
        name: 'Drought',
        text: 'A dry spell withers your crops.',
        effect: function (state) {
            var loss = Math.min(state.resources.food, 10 + Math.floor(Math.random() * 15));
            state.resources.food = Math.max(0, state.resources.food - loss);
            return '-' + loss + ' food';
        },
    },
    {
        name: 'Resource Shortage',
        text: 'Supply lines are disrupted. Stores are depleted.',
        effect: function (state) {
            var resources = ['wood', 'stone', 'gold'];
            var res = resources[Math.floor(Math.random() * resources.length)];
            var loss = Math.min(state.resources[res] || 0, 10 + Math.floor(Math.random() * 10));
            state.resources[res] = Math.max(0, (state.resources[res] || 0) - loss);
            return '-' + loss + ' ' + res;
        },
    },
    {
        name: 'Wolf Attack',
        text: 'Wolves descend from the hills, threatening your workers!',
        isRaid: true,
        effect: function (state, hexData) {
            return executeRaid(state, hexData, 'wolves');
        },
    },
];

var STORY_EVENTS = [
    {
        name: 'Travelers Arrive',
        text: 'Weary travelers bring tales of distant kingdoms and strange lands.',
        effect: function () { return ''; },
    },
    {
        name: 'Omen in the Sky',
        text: 'A strange light streaks across the night sky. Your people whisper of portents.',
        effect: function () { return ''; },
    },
    {
        name: 'Ancient Ruins Found',
        text: 'Scouts report crumbling ruins at the edge of your territory.',
        effect: function (state) {
            var gain = 3 + Math.floor(Math.random() * 5);
            state.resources.gold = (state.resources.gold || 0) + gain;
            return '+' + gain + ' gold';
        },
    },
    {
        name: 'Festival',
        text: 'Your people hold a spontaneous celebration. Morale soars!',
        effect: function () { return ''; },
    },
    {
        name: 'Mysterious Stranger',
        text: 'A hooded figure offers cryptic advice, then vanishes into the night.',
        effect: function (state) {
            var gain = 2 + Math.floor(Math.random() * 4);
            state.resources.mana = (state.resources.mana || 0) + gain;
            return '+' + gain + ' mana';
        },
    },
];

// ── Quest templates ──

var QUEST_TEMPLATES = [
    {
        type: 'build',
        generate: function (state) {
            var candidates = ['farm', 'lumber_mill', 'quarry', 'mine', 'barracks', 'walls'];
            var target = candidates[Math.floor(Math.random() * candidates.length)];
            var def = BUILDING_TYPES[target];
            if (!def) return null;
            var count = 1 + Math.floor(Math.random() * 2);
            return {
                name: 'Build ' + count + ' ' + def.name + (count > 1 ? 's' : ''),
                description: 'Construct ' + count + ' ' + def.name + (count > 1 ? 's' : '') + ' to strengthen your settlement.',
                objectiveType: 'build',
                objectiveTarget: target,
                objectiveCount: count,
                turnsRemaining: 8 + count * 3,
                reward: generateReward(state),
            };
        },
    },
    {
        type: 'population',
        generate: function (state) {
            var target = state.population.current + 2 + Math.floor(Math.random() * 3);
            return {
                name: 'Reach Population ' + target,
                description: 'Grow your settlement to ' + target + ' citizens.',
                objectiveType: 'population',
                objectiveTarget: target,
                objectiveCount: target,
                turnsRemaining: 10 + Math.floor(Math.random() * 5),
                reward: generateReward(state),
            };
        },
    },
    {
        type: 'resource',
        generate: function (state) {
            var resources = ['food', 'wood', 'stone', 'gold'];
            var res = resources[Math.floor(Math.random() * resources.length)];
            var current = state.resources[res] || 0;
            var target = current + 30 + Math.floor(Math.random() * 40);
            return {
                name: 'Stockpile ' + target + ' ' + res,
                description: 'Accumulate at least ' + target + ' ' + res + ' in your stores.',
                objectiveType: 'resource',
                objectiveTarget: res,
                objectiveCount: target,
                turnsRemaining: 8 + Math.floor(Math.random() * 6),
                reward: generateReward(state),
            };
        },
    },
];

function generateReward(state) {
    var reward = {};
    var resources = ['food', 'wood', 'stone', 'gold', 'mana'];
    // Give 1-2 resource types as reward
    var count = 1 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
        var res = resources[Math.floor(Math.random() * resources.length)];
        reward[res] = (reward[res] || 0) + 15 + Math.floor(Math.random() * 25);
    }
    // Sometimes add population reward
    if (Math.random() < 0.3) {
        reward.population = 1 + Math.floor(Math.random() * 2);
    }
    return reward;
}

// ── Raid system ──

function executeRaid(state, hexData, raidType) {
    var completedBuildings = [];
    for (var i = 0; i < state.buildings.length; i++) {
        var b = state.buildings[i];
        if (b.turnsRemaining <= 0 && b.type !== 'town_center') {
            completedBuildings.push(b);
        }
    }

    if (completedBuildings.length === 0) {
        return 'Your settlement has nothing to raid.';
    }

    // Calculate defense reduction from walls/barracks
    var defenseReduction = 0;
    for (var d = 0; d < state.buildings.length; d++) {
        var db = state.buildings[d];
        if (db.turnsRemaining <= 0 && DEFENSE_BUILDINGS.indexOf(db.type) >= 0) {
            defenseReduction += 10 + (db.level || 1) * 5;
        }
    }

    // Base raid damage scales with turn
    var baseDamage = 15 + Math.floor(state.turn * 1.5);
    if (raidType === 'wolves') baseDamage = Math.floor(baseDamage * 0.6);

    var actualDamage = Math.max(5, baseDamage - defenseReduction);

    // Pick a random target building
    var target = completedBuildings[Math.floor(Math.random() * completedBuildings.length)];
    if (target.hp === undefined) {
        var baseHp = BUILDING_HP[target.type] || 50;
        target.hp = baseHp * (target.level || 1);
        target.maxHp = target.hp;
    }

    target.hp -= actualDamage;
    var resultParts = [target.type.replace(/_/g, ' ') + ' took ' + actualDamage + ' damage'];

    if (defenseReduction > 0) {
        resultParts.push('defenses blocked ' + defenseReduction + ' damage');
    }

    // Building destroyed
    if (target.hp <= 0) {
        target.hp = 0;
        target.turnsRemaining = BUILDING_TYPES[target.type].turnsToBuild;
        resultParts.push(BUILDING_TYPES[target.type].name + ' destroyed! Needs rebuilding.');

        // Update hexData
        if (hexData) {
            var key = target.q + ',' + target.r;
            var hex = hexData.get(key);
            if (hex && hex.building) {
                hex.building.turnsRemaining = target.turnsRemaining;
            }
        }
    }

    return resultParts.join('. ');
}

// ── Difficulty calculation ──

function getDifficulty(state) {
    // Cassandra-style escalation based on settlement power
    var buildingCount = 0;
    for (var i = 0; i < state.buildings.length; i++) {
        if (state.buildings[i].turnsRemaining <= 0) buildingCount++;
    }

    var totalResources = 0;
    for (var res in state.resources) {
        totalResources += state.resources[res] || 0;
    }

    var power = buildingCount * 10 +
                state.population.current * 5 +
                totalResources * 0.1 +
                state.turn * 2;

    // Difficulty tiers: 0-3
    if (power < 50) return 0;
    if (power < 120) return 1;
    if (power < 250) return 2;
    return 3;
}

// ── Event probability weights ──

function getEventWeights(state, stState) {
    var difficulty = getDifficulty(state);

    // Base weights: [boon, challenge, story, quest, nothing]
    // Higher difficulty = more challenges, better rewards
    var weights;
    switch (difficulty) {
        case 0: weights = [30, 5,  20, 15, 30]; break;  // Early: mostly peaceful
        case 1: weights = [25, 15, 15, 20, 25]; break;  // Growing: challenges begin
        case 2: weights = [20, 25, 10, 20, 25]; break;  // Strong: real threats
        case 3: weights = [15, 35, 10, 15, 25]; break;  // Late: constant pressure
        default: weights = [25, 15, 15, 20, 25]; break;
    }

    // No major event (challenge) in consecutive turns
    if (stState.lastMajorEventTurn >= state.turn - 1) {
        weights[1] = Math.floor(weights[1] * 0.3);
    }

    // Don't issue quests if we already have 2+
    if (stState.activeQuests.length >= 2) {
        weights[3] = 0;
    }

    // Grace period: no challenges in the first 3 turns
    if (state.turn <= 3) {
        weights[1] = 0;
    }

    return weights;
}

function weightedRandom(weights) {
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += weights[i];
    if (total === 0) return weights.length - 1;
    var r = Math.random() * total;
    var cumulative = 0;
    for (var j = 0; j < weights.length; j++) {
        cumulative += weights[j];
        if (r < cumulative) return j;
    }
    return weights.length - 1;
}

// ── Exported API ──

// Initialize building HP for all existing buildings
export function initBuildingHP(state) {
    for (var i = 0; i < state.buildings.length; i++) {
        var b = state.buildings[i];
        if (b.hp === undefined) {
            var baseHp = BUILDING_HP[b.type] || 50;
            b.hp = baseHp * (b.level || 1);
            b.maxHp = b.hp;
        }
    }
}

// Create initial storyteller state
export function createStorytellerState() {
    return {
        lastMajorEventTurn: 0,
        lastEventTurn: 0,
        eventLog: [],
        activeQuests: [],
        completedQuestCount: 0,
    };
}

// Get quest progress for display
export function getQuestProgress(quest, gameState) {
    switch (quest.objectiveType) {
        case 'build': {
            var count = 0;
            for (var i = 0; i < gameState.buildings.length; i++) {
                var b = gameState.buildings[i];
                if (b.type === quest.objectiveTarget && b.turnsRemaining <= 0) {
                    count++;
                }
            }
            return { current: Math.min(count, quest.objectiveCount), target: quest.objectiveCount };
        }
        case 'population':
            return { current: Math.min(gameState.population.current, quest.objectiveCount), target: quest.objectiveCount };
        case 'resource':
            return {
                current: Math.min(gameState.resources[quest.objectiveTarget] || 0, quest.objectiveCount),
                target: quest.objectiveCount,
            };
        default:
            return { current: 0, target: quest.objectiveCount || 1 };
    }
}

// Process one storyteller turn
// Returns: { event: {...}|null, completedQuests: [...], failedQuests: [...], newQuest: {...}|null }
export function processStorytellerTurn(gameState, stState, hexData) {
    var result = {
        event: null,
        completedQuests: [],
        failedQuests: [],
        newQuest: null,
    };

    // ── Check quest completion / failure ──
    var stillActive = [];
    for (var qi = 0; qi < stState.activeQuests.length; qi++) {
        var quest = stState.activeQuests[qi];
        quest.turnsRemaining--;

        var progress = getQuestProgress(quest, gameState);
        if (progress.current >= progress.target) {
            // Quest completed — award rewards
            result.completedQuests.push(quest);
            stState.completedQuestCount++;

            for (var res in quest.reward) {
                if (res === 'population') {
                    gameState.population.current = Math.min(
                        gameState.population.cap,
                        gameState.population.current + quest.reward[res]
                    );
                } else {
                    gameState.resources[res] = (gameState.resources[res] || 0) + quest.reward[res];
                }
            }
        } else if (quest.turnsRemaining <= 0) {
            // Quest failed
            result.failedQuests.push(quest);
        } else {
            stillActive.push(quest);
        }
    }
    stState.activeQuests = stillActive;

    // ── Determine event for this turn ──
    var weights = getEventWeights(gameState, stState);
    var category = weightedRandom(weights);
    // 0=boon, 1=challenge, 2=story, 3=quest, 4=nothing

    if (category === 0) {
        // Boon
        var boon = BOON_EVENTS[Math.floor(Math.random() * BOON_EVENTS.length)];
        var boonResult = boon.effect(gameState);
        result.event = {
            category: 'boon',
            name: boon.name,
            text: boon.text,
            result: boonResult,
            isRaid: false,
        };
        stState.eventLog.push({ turn: gameState.turn, category: 'boon', name: boon.name, text: boon.text, result: boonResult });
        stState.lastEventTurn = gameState.turn;
    } else if (category === 1) {
        // Challenge
        var challenge = CHALLENGE_EVENTS[Math.floor(Math.random() * CHALLENGE_EVENTS.length)];
        var chalResult = challenge.effect(gameState, hexData);
        result.event = {
            category: 'challenge',
            name: challenge.name,
            text: challenge.text,
            result: chalResult,
            isRaid: !!challenge.isRaid,
        };
        stState.eventLog.push({ turn: gameState.turn, category: 'challenge', name: challenge.name, text: challenge.text, result: chalResult });
        stState.lastMajorEventTurn = gameState.turn;
        stState.lastEventTurn = gameState.turn;
    } else if (category === 2) {
        // Story flavor
        var story = STORY_EVENTS[Math.floor(Math.random() * STORY_EVENTS.length)];
        var storyResult = story.effect(gameState);
        result.event = {
            category: 'story',
            name: story.name,
            text: story.text,
            result: storyResult,
            isRaid: false,
        };
        stState.eventLog.push({ turn: gameState.turn, category: 'story', name: story.name, text: story.text, result: storyResult });
        stState.lastEventTurn = gameState.turn;
    } else if (category === 3) {
        // New quest
        var template = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];
        var newQuest = template.generate(gameState);
        if (newQuest) {
            stState.activeQuests.push(newQuest);
            result.newQuest = newQuest;
        }
    }
    // category 4 = nothing happens this turn

    return result;
}
