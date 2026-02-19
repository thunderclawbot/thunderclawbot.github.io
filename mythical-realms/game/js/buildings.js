// buildings.js — Building definitions, placement, upgrades, and 3D rendering
// Buildings render as simple Three.js primitives (boxes, cylinders)
// Includes race-specific building variants with unique colors and stats

import * as THREE from 'three';
import { axialToWorld, HEX_SIZE } from './hex-grid.js';
import { createBuildingModel, areModelsReady, disposeModel } from './asset-loader.js';

// ── Race Color Palettes ──
export const RACE_PALETTES = {
    human: {
        primary: 0x94a3b8,    // stone gray
        secondary: 0x60a5fa,  // blue
        accent: 0xfbbf24,     // gold
    },
    elf: {
        primary: 0x8b6914,    // wood brown
        secondary: 0x10b981,  // emerald green
        accent: 0xc0c0c0,     // silver
    },
    orc: {
        primary: 0x3f3f3f,    // dark iron
        secondary: 0xdc2626,  // red
        accent: 0xe8dcc8,     // bone white
    },
};

// Building type definitions
// workerSlots: max workers that can be assigned
// populationCap: added to settlement pop cap when complete
export const BUILDING_TYPES = {
    // ── Shared Buildings ──
    town_center: {
        name: 'Town Center',
        cost: { food: 0, wood: 0, stone: 0, gold: 0, mana: 0 },
        turnsToBuild: 0,
        resourcesPerTurn: { food: 2, wood: 1, stone: 1, gold: 2, mana: 0 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'box',
        color: 0xfbbf24,
        scale: { x: 0.5, y: 0.6, z: 0.5 },
        workerSlots: 2,
        populationCap: 5,
        races: ['human', 'elf', 'orc'],
    },
    farm: {
        name: 'Farm',
        cost: { food: 0, wood: 15, stone: 0, gold: 5, mana: 0 },
        turnsToBuild: 2,
        resourcesPerTurn: { food: 6, wood: 0, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['plains'],
        shape: 'box',
        color: 0x4ade80,
        scale: { x: 0.6, y: 0.2, z: 0.6 },
        workerSlots: 2,
        populationCap: 3,
        races: ['human', 'elf', 'orc'],
    },
    lumber_mill: {
        name: 'Lumber Mill',
        cost: { food: 10, wood: 5, stone: 5, gold: 5, mana: 0 },
        turnsToBuild: 2,
        resourcesPerTurn: { food: 0, wood: 6, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['forest'],
        shape: 'cylinder',
        color: 0xa3e635,
        scale: { x: 0.25, y: 0.5, z: 0.25 },
        workerSlots: 2,
        populationCap: 0,
        races: ['human', 'elf', 'orc'],
    },
    quarry: {
        name: 'Quarry',
        cost: { food: 10, wood: 10, stone: 0, gold: 5, mana: 0 },
        turnsToBuild: 2,
        resourcesPerTurn: { food: 0, wood: 0, stone: 6, gold: 0, mana: 0 },
        requiredTerrain: ['mountain'],
        shape: 'cone',
        color: 0x94a3b8,
        scale: { x: 0.3, y: 0.5, z: 0.3 },
        workerSlots: 2,
        populationCap: 0,
        races: ['human', 'elf', 'orc'],
    },
    mine: {
        name: 'Mine',
        cost: { food: 10, wood: 15, stone: 10, gold: 0, mana: 0 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 5, mana: 0 },
        requiredTerrain: ['mountain', 'desert'],
        shape: 'box',
        color: 0xfbbf24,
        scale: { x: 0.3, y: 0.35, z: 0.3 },
        workerSlots: 2,
        populationCap: 0,
        races: ['human', 'elf', 'orc'],
    },
    barracks: {
        name: 'Barracks',
        cost: { food: 15, wood: 25, stone: 15, gold: 10, mana: 0 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'box',
        color: 0xef4444,
        scale: { x: 0.45, y: 0.4, z: 0.45 },
        workerSlots: 1,
        populationCap: 0,
        races: ['human', 'elf', 'orc'],
    },
    mage_tower: {
        name: 'Mage Tower',
        cost: { food: 10, wood: 15, stone: 20, gold: 15, mana: 8 },
        turnsToBuild: 4,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 3 },
        requiredTerrain: ['plains', 'forest'],
        shape: 'cylinder',
        color: 0xa78bfa,
        scale: { x: 0.2, y: 0.8, z: 0.2 },
        workerSlots: 1,
        populationCap: 0,
        races: ['human', 'elf', 'orc'],
    },
    walls: {
        name: 'Walls',
        cost: { food: 0, wood: 10, stone: 30, gold: 5, mana: 0 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['plains', 'desert', 'mountain'],
        shape: 'box',
        color: 0x78716c,
        scale: { x: 0.7, y: 0.3, z: 0.1 },
        workerSlots: 0,
        populationCap: 0,
        races: ['human', 'elf', 'orc'],
    },

    // ── Human-specific Buildings ──
    market: {
        name: 'Market',
        cost: { food: 15, wood: 25, stone: 10, gold: 10, mana: 0 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 6, mana: 0 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'box',
        color: 0x60a5fa,    // human blue
        scale: { x: 0.5, y: 0.35, z: 0.4 },
        workerSlots: 2,
        populationCap: 0,
        races: ['human'],
    },
    castle: {
        name: 'Castle',
        cost: { food: 20, wood: 40, stone: 50, gold: 30, mana: 0 },
        turnsToBuild: 6,
        resourcesPerTurn: { food: 0, wood: 0, stone: 2, gold: 3, mana: 0 },
        requiredTerrain: ['plains', 'mountain'],
        shape: 'box',
        color: 0x94a3b8,    // stone gray
        scale: { x: 0.55, y: 0.7, z: 0.55 },
        workerSlots: 2,
        populationCap: 5,
        races: ['human'],
    },
    chapel: {
        name: 'Chapel',
        cost: { food: 10, wood: 20, stone: 15, gold: 15, mana: 5 },
        turnsToBuild: 4,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 1, mana: 3 },
        requiredTerrain: ['plains', 'forest'],
        shape: 'cone',
        color: 0xf0f0ff,    // pale white/blue
        scale: { x: 0.25, y: 0.65, z: 0.25 },
        workerSlots: 1,
        populationCap: 0,
        races: ['human'],
    },
    // Human ultimate
    grand_cathedral: {
        name: 'Grand Cathedral',
        cost: { food: 40, wood: 60, stone: 80, gold: 60, mana: 30 },
        turnsToBuild: 10,
        resourcesPerTurn: { food: 2, wood: 0, stone: 0, gold: 8, mana: 5 },
        requiredTerrain: ['plains'],
        shape: 'cone',
        color: 0xfbbf24,    // gold
        scale: { x: 0.4, y: 1.2, z: 0.4 },
        workerSlots: 3,
        populationCap: 8,
        races: ['human'],
    },

    // ── Elf-specific Buildings ──
    tree_of_life: {
        name: 'Tree of Life',
        cost: { food: 10, wood: 30, stone: 5, gold: 10, mana: 10 },
        turnsToBuild: 4,
        resourcesPerTurn: { food: 2, wood: 4, stone: 0, gold: 0, mana: 1 },
        requiredTerrain: ['forest', 'plains'],
        shape: 'cone',
        color: 0x10b981,    // emerald green
        scale: { x: 0.3, y: 0.7, z: 0.3 },
        workerSlots: 2,
        populationCap: 4,
        races: ['elf'],
    },
    moonwell: {
        name: 'Moonwell',
        cost: { food: 5, wood: 15, stone: 10, gold: 10, mana: 10 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 5 },
        requiredTerrain: ['forest', 'plains'],
        shape: 'cylinder',
        color: 0xc0c0c0,    // silver
        scale: { x: 0.3, y: 0.2, z: 0.3 },
        workerSlots: 1,
        populationCap: 0,
        races: ['elf'],
    },
    ancient_archive: {
        name: 'Ancient Archive',
        cost: { food: 10, wood: 25, stone: 20, gold: 25, mana: 20 },
        turnsToBuild: 5,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 3, mana: 4 },
        requiredTerrain: ['forest'],
        shape: 'cylinder',
        color: 0xc0c0c0,    // silver
        scale: { x: 0.3, y: 0.6, z: 0.3 },
        workerSlots: 2,
        populationCap: 0,
        races: ['elf'],
    },
    // Elf ultimate
    world_tree: {
        name: 'World Tree',
        cost: { food: 30, wood: 80, stone: 20, gold: 40, mana: 50 },
        turnsToBuild: 10,
        resourcesPerTurn: { food: 3, wood: 6, stone: 0, gold: 2, mana: 8 },
        requiredTerrain: ['forest'],
        shape: 'cone',
        color: 0x10b981,    // emerald green
        scale: { x: 0.45, y: 1.4, z: 0.45 },
        workerSlots: 3,
        populationCap: 10,
        races: ['elf'],
    },

    // ── Orc-specific Buildings ──
    war_pit: {
        name: 'War Pit',
        cost: { food: 30, wood: 20, stone: 35, gold: 15, mana: 0 },
        turnsToBuild: 5,
        resourcesPerTurn: { food: 0, wood: 0, stone: 2, gold: 0, mana: 0 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'cylinder',
        color: 0xdc2626,    // red
        scale: { x: 0.4, y: 0.3, z: 0.4 },
        workerSlots: 2,
        populationCap: 4,
        races: ['orc'],
    },
    blood_forge: {
        name: 'Blood Forge',
        cost: { food: 20, wood: 25, stone: 30, gold: 20, mana: 0 },
        turnsToBuild: 4,
        resourcesPerTurn: { food: 0, wood: 0, stone: 3, gold: 3, mana: 0 },
        requiredTerrain: ['mountain', 'desert'],
        shape: 'box',
        color: 0x3f3f3f,    // dark iron
        scale: { x: 0.4, y: 0.45, z: 0.35 },
        workerSlots: 2,
        populationCap: 0,
        races: ['orc'],
    },
    totem: {
        name: 'Totem',
        cost: { food: 10, wood: 15, stone: 15, gold: 5, mana: 5 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 4 },
        requiredTerrain: ['plains', 'desert', 'forest'],
        shape: 'cylinder',
        color: 0xe8dcc8,    // bone white
        scale: { x: 0.15, y: 0.7, z: 0.15 },
        workerSlots: 1,
        populationCap: 0,
        races: ['orc'],
    },
    // Orc ultimate
    skull_throne: {
        name: 'Skull Throne',
        cost: { food: 50, wood: 30, stone: 70, gold: 40, mana: 20 },
        turnsToBuild: 10,
        resourcesPerTurn: { food: 4, wood: 0, stone: 5, gold: 5, mana: 3 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'box',
        color: 0xdc2626,    // red
        scale: { x: 0.5, y: 1.0, z: 0.5 },
        workerSlots: 3,
        populationCap: 8,
        races: ['orc'],
    },
};

// Upgrade costs per level (level 2 and level 3)
export const UPGRADE_COSTS = {
    2: { food: 15, wood: 25, stone: 20, gold: 15, mana: 0 },
    3: { food: 30, wood: 50, stone: 40, gold: 30, mana: 5 },
};

// Level multipliers — applied to scale and resourcesPerTurn
export const LEVEL_MULTIPLIERS = {
    1: 1.0,
    2: 1.2,
    3: 1.5,
};

// Get the color for a building based on race palette
export function getBuildingColor(buildingType, race) {
    var def = BUILDING_TYPES[buildingType];
    if (!def) return 0xffffff;

    // Race-specific buildings use their own colors
    if (def.races && def.races.length === 1) {
        return def.color;
    }

    // Shared buildings — tint based on race palette
    var palette = RACE_PALETTES[race];
    if (!palette) return def.color;

    // Town center uses race accent color
    if (buildingType === 'town_center') return palette.accent;
    // Barracks uses race secondary (military)
    if (buildingType === 'barracks') return palette.secondary;
    // Walls use race primary
    if (buildingType === 'walls') return palette.primary;

    return def.color;
}

// Get buildings available to a specific race
export function getBuildingsForRace(race) {
    var result = {};
    for (var key in BUILDING_TYPES) {
        var def = BUILDING_TYPES[key];
        if (def.races && def.races.includes(race)) {
            result[key] = def;
        }
    }
    return result;
}

// Check if a building can be placed on a hex
export function canPlaceBuilding(buildingType, hexData, resources) {
    const def = BUILDING_TYPES[buildingType];
    if (!def) return { ok: false, reason: 'Unknown building type' };

    // Check terrain
    if (!def.requiredTerrain.includes(hexData.terrain)) {
        return { ok: false, reason: `Requires ${def.requiredTerrain.join(' or ')} terrain` };
    }

    // Check not water
    if (hexData.terrain === 'water') {
        return { ok: false, reason: 'Cannot build on water' };
    }

    // Check hex is empty
    if (hexData.building) {
        return { ok: false, reason: 'Hex already has a building' };
    }

    // Check resources
    for (const [resource, amount] of Object.entries(def.cost)) {
        if ((resources[resource] || 0) < amount) {
            return { ok: false, reason: `Not enough ${resource}` };
        }
    }

    return { ok: true };
}

// Check if a building can be upgraded
export function canUpgradeBuilding(building, resources) {
    if (building.turnsRemaining > 0) return { ok: false, reason: 'Still under construction' };
    if (building.level >= 3) return { ok: false, reason: 'Already max level' };

    const nextLevel = building.level + 1;
    const cost = UPGRADE_COSTS[nextLevel];
    for (const [resource, amount] of Object.entries(cost)) {
        if ((resources[resource] || 0) < amount) {
            return { ok: false, reason: `Not enough ${resource}` };
        }
    }

    return { ok: true, cost };
}

// Deduct building cost from resources
export function deductCost(buildingType, resources) {
    const def = BUILDING_TYPES[buildingType];
    const newResources = { ...resources };
    for (const [resource, amount] of Object.entries(def.cost)) {
        newResources[resource] -= amount;
    }
    return newResources;
}

// Deduct upgrade cost from resources
export function deductUpgradeCost(level, resources) {
    const cost = UPGRADE_COSTS[level];
    const newResources = { ...resources };
    for (const [resource, amount] of Object.entries(cost)) {
        newResources[resource] -= amount;
    }
    return newResources;
}

// Create a 3D mesh for a building (with optional race-based color)
// Uses the new asset pipeline with procedural model fallback
export function createBuildingMesh(buildingType, q, r, turnsRemaining, level, race) {
    if (level === undefined) level = 1;
    const def = BUILDING_TYPES[buildingType];
    const pos = axialToWorld(q, r);
    const levelMul = LEVEL_MULTIPLIERS[level] || 1;

    const progressFraction = turnsRemaining > 0
        ? 1 - (turnsRemaining / def.turnsToBuild)
        : 1;

    // Try to use the new model system
    var modelGroup = null;
    try {
        modelGroup = createBuildingModel(buildingType, race || 'human');
    } catch (e) {
        // Fallback to primitive
    }

    if (modelGroup) {
        // Apply level scaling
        var levelScale = level > 1 ? 1 + (level - 1) * 0.15 : 1;
        modelGroup.scale.set(levelScale, levelScale * levelMul, levelScale);

        // Construction progress: scale down and make transparent
        if (turnsRemaining > 0) {
            var yScaleFactor = 0.3 + 0.7 * progressFraction;
            modelGroup.scale.y *= yScaleFactor;
            var opacity = 0.5 + 0.5 * progressFraction;
            modelGroup.traverse(function (child) {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                }
            });
        }

        // Level glow for upgraded buildings
        if (level > 1) {
            modelGroup.traverse(function (child) {
                if (child.isMesh && child.material && child.material.color) {
                    child.material = child.material.clone();
                    child.material.color.offsetHSL(0, 0, (level - 1) * 0.08);
                }
            });
        }

        modelGroup.position.set(pos.x, 0.3, pos.z);
        modelGroup.userData = { buildingType: buildingType, q: q, r: r, level: level, isModelGroup: true };
        return modelGroup;
    }

    // ── Primitive fallback ──
    const baseY = def.scale.y * levelMul;
    const yScale = turnsRemaining > 0
        ? baseY * (0.3 + 0.7 * progressFraction)
        : baseY;

    const scaleX = def.scale.x * (level > 1 ? 1 + (level - 1) * 0.15 : 1);
    const scaleZ = (def.scale.z || def.scale.x) * (level > 1 ? 1 + (level - 1) * 0.15 : 1);

    let geometry;
    if (def.shape === 'cylinder') {
        geometry = new THREE.CylinderGeometry(scaleX, scaleX, yScale, 8);
    } else if (def.shape === 'cone') {
        geometry = new THREE.ConeGeometry(scaleX, yScale, 8);
    } else {
        geometry = new THREE.BoxGeometry(scaleX, yScale, scaleZ);
    }

    var buildOpacity = turnsRemaining > 0 ? 0.5 + 0.5 * progressFraction : 1;

    var colorHex = race ? getBuildingColor(buildingType, race) : def.color;
    const baseColor = new THREE.Color(colorHex);
    if (level > 1) {
        baseColor.offsetHSL(0, 0, (level - 1) * 0.08);
    }

    const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.6,
        metalness: 0.2,
        flatShading: true,
        transparent: turnsRemaining > 0,
        opacity: buildOpacity,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, 0.3 + yScale / 2, pos.z);

    mesh.userData = { buildingType, q, r, level };
    return mesh;
}

// Update a building mesh for construction progress
export function updateBuildingMesh(mesh, buildingType, turnsRemaining) {
    const def = BUILDING_TYPES[buildingType];
    const progressFraction = turnsRemaining > 0
        ? 1 - (turnsRemaining / def.turnsToBuild)
        : 1;

    // Handle model group (new system)
    if (mesh.userData && mesh.userData.isModelGroup) {
        var yScaleFactor = turnsRemaining > 0 ? 0.3 + 0.7 * progressFraction : 1;
        mesh.scale.y = yScaleFactor;
        var opacity = turnsRemaining > 0 ? 0.5 + 0.5 * progressFraction : 1;
        mesh.traverse(function (child) {
            if (child.isMesh) {
                child.material.transparent = turnsRemaining > 0;
                child.material.opacity = opacity;
            }
        });
        return;
    }

    // Primitive fallback
    const yScale = turnsRemaining > 0
        ? def.scale.y * (0.3 + 0.7 * progressFraction)
        : def.scale.y;

    mesh.scale.y = yScale / def.scale.y;
    mesh.position.y = 0.3 + (yScale / 2) * (mesh.scale.y > 0 ? 1 : 1);

    if (turnsRemaining > 0) {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.5 + 0.5 * progressFraction;
    } else {
        mesh.material.transparent = false;
        mesh.material.opacity = 1;
    }
}

// Recalculate population cap from all completed buildings
export function recalcPopulationCap(state) {
    let cap = 0;
    for (const b of state.buildings) {
        if (b.turnsRemaining <= 0) {
            const def = BUILDING_TYPES[b.type];
            cap += (def.populationCap || 0) * (b.level || 1);
        }
    }
    state.population.cap = cap;
}
