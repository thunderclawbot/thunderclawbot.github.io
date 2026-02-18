// buildings.js — Building definitions, placement, and 3D rendering
// Buildings render as simple Three.js primitives (boxes, cylinders)

import * as THREE from 'three';
import { axialToWorld, HEX_SIZE } from './hex-grid.js';

// Building type definitions
export const BUILDING_TYPES = {
    town_center: {
        name: 'Town Center',
        cost: { food: 0, wood: 0, stone: 0, gold: 0, mana: 0 },
        turnsToBuild: 0,
        resourcesPerTurn: { food: 2, wood: 1, stone: 1, gold: 2, mana: 0 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'box',
        color: 0xfbbf24,
        scale: { x: 0.5, y: 0.6, z: 0.5 },
    },
    farm: {
        name: 'Farm',
        cost: { food: 0, wood: 20, stone: 0, gold: 5, mana: 0 },
        turnsToBuild: 2,
        resourcesPerTurn: { food: 5, wood: 0, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['plains'],
        shape: 'box',
        color: 0x4ade80,
        scale: { x: 0.6, y: 0.2, z: 0.6 },
    },
    lumber_mill: {
        name: 'Lumber Mill',
        cost: { food: 10, wood: 5, stone: 10, gold: 5, mana: 0 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 5, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['forest'],
        shape: 'cylinder',
        color: 0xa3e635,
        scale: { x: 0.25, y: 0.5, z: 0.25 },
    },
    quarry: {
        name: 'Quarry',
        cost: { food: 10, wood: 15, stone: 0, gold: 10, mana: 0 },
        turnsToBuild: 3,
        resourcesPerTurn: { food: 0, wood: 0, stone: 5, gold: 0, mana: 0 },
        requiredTerrain: ['mountain'],
        shape: 'cone',
        color: 0x94a3b8,
        scale: { x: 0.3, y: 0.5, z: 0.3 },
    },
    mine: {
        name: 'Mine',
        cost: { food: 10, wood: 20, stone: 15, gold: 0, mana: 0 },
        turnsToBuild: 4,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 5, mana: 0 },
        requiredTerrain: ['mountain', 'desert'],
        shape: 'box',
        color: 0xfbbf24,
        scale: { x: 0.3, y: 0.35, z: 0.3 },
    },
    barracks: {
        name: 'Barracks',
        cost: { food: 20, wood: 30, stone: 20, gold: 15, mana: 0 },
        turnsToBuild: 4,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 0 },
        requiredTerrain: ['plains', 'desert'],
        shape: 'box',
        color: 0xef4444,
        scale: { x: 0.45, y: 0.4, z: 0.45 },
    },
    mage_tower: {
        name: 'Mage Tower',
        cost: { food: 10, wood: 15, stone: 25, gold: 20, mana: 10 },
        turnsToBuild: 5,
        resourcesPerTurn: { food: 0, wood: 0, stone: 0, gold: 0, mana: 3 },
        requiredTerrain: ['plains', 'forest'],
        shape: 'cylinder',
        color: 0xa78bfa,
        scale: { x: 0.2, y: 0.8, z: 0.2 },
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
    },
};

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

// Deduct building cost from resources
export function deductCost(buildingType, resources) {
    const def = BUILDING_TYPES[buildingType];
    const newResources = { ...resources };
    for (const [resource, amount] of Object.entries(def.cost)) {
        newResources[resource] -= amount;
    }
    return newResources;
}

// Create a 3D mesh for a building
export function createBuildingMesh(buildingType, q, r, turnsRemaining) {
    const def = BUILDING_TYPES[buildingType];
    const pos = axialToWorld(q, r);

    const progressFraction = turnsRemaining > 0
        ? 1 - (turnsRemaining / def.turnsToBuild)
        : 1;

    // Scale Y by construction progress (min 30% during construction)
    const yScale = turnsRemaining > 0
        ? def.scale.y * (0.3 + 0.7 * progressFraction)
        : def.scale.y;

    let geometry;
    if (def.shape === 'cylinder') {
        geometry = new THREE.CylinderGeometry(def.scale.x, def.scale.x, yScale, 8);
    } else if (def.shape === 'cone') {
        geometry = new THREE.ConeGeometry(def.scale.x, yScale, 8);
    } else {
        geometry = new THREE.BoxGeometry(def.scale.x, yScale, def.scale.z);
    }

    const opacity = turnsRemaining > 0 ? 0.5 + 0.5 * progressFraction : 1;
    const material = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.6,
        metalness: 0.2,
        flatShading: true,
        transparent: turnsRemaining > 0,
        opacity,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Place on top of the hex (HEX_HEIGHT = 0.3)
    mesh.position.set(pos.x, 0.3 + yScale / 2, pos.z);

    mesh.userData = { buildingType, q, r };
    return mesh;
}

// Update a building mesh for construction progress
export function updateBuildingMesh(mesh, buildingType, turnsRemaining) {
    const def = BUILDING_TYPES[buildingType];
    const progressFraction = turnsRemaining > 0
        ? 1 - (turnsRemaining / def.turnsToBuild)
        : 1;

    const yScale = turnsRemaining > 0
        ? def.scale.y * (0.3 + 0.7 * progressFraction)
        : def.scale.y;

    // Update scale
    mesh.scale.y = yScale / def.scale.y;
    mesh.position.y = 0.3 + (yScale / 2) * (mesh.scale.y > 0 ? 1 : 1);

    // Update material opacity
    if (turnsRemaining > 0) {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.5 + 0.5 * progressFraction;
    } else {
        mesh.material.transparent = false;
        mesh.material.opacity = 1;
    }
}
