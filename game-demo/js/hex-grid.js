// hex-grid.js — Hex grid generation and rendering
// Flat-top hexagons using axial coordinates (q, r)
// Reference: redblobgames.com/grids/hexagons

import * as THREE from 'three';
import { createTerrainProps } from './asset-loader.js';

// Terrain definitions — expanded with swamp biome + river variant
const TERRAIN = {
    plains:   { color: 0x4ade80, name: 'Plains' },
    forest:   { color: 0x166534, name: 'Forest' },
    mountain: { color: 0x6b7280, name: 'Mountain' },
    water:    { color: 0x3b82f6, name: 'Water' },
    desert:   { color: 0xd4a574, name: 'Desert' },
    swamp:    { color: 0x5b7a3a, name: 'Swamp' },
};

// Colors for minimap (hex string versions)
const TERRAIN_COLORS_HEX = {
    plains:   '#4ade80',
    forest:   '#166534',
    mountain: '#6b7280',
    water:    '#3b82f6',
    desert:   '#d4a574',
    swamp:    '#5b7a3a',
};

// Resource hex colors for minimap
const RESOURCE_COLORS = {
    iron:         '#94a3b8',
    crystal:      '#a78bfa',
    fertile_soil: '#4ade80',
    gold_vein:    '#fbbf24',
    mana_spring:  '#818cf8',
};

const TERRAIN_KEYS = Object.keys(TERRAIN);

// Hex geometry constants (flat-top)
const HEX_SIZE = 1;
const HEX_HEIGHT = 0.3;
const HEX_GAP = 0.05;

// Convert axial (q, r) to world position (flat-top hex)
export function axialToWorld(q, r) {
    const x = HEX_SIZE * (3 / 2 * q);
    const z = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, z };
}

// Cube coordinate helpers
export function axialToCube(q, r) {
    return { x: q, y: -q - r, z: r };
}

export function cubeToAxial(x, y, z) {
    return { q: x, r: z };
}

export function cubeDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

// Create flat-top hex shape
function createHexShape(size) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const x = size * Math.cos(angle);
        const y = size * Math.sin(angle);
        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();
    return shape;
}

// Create hex grid from pre-generated map data (from map-gen.js)
// mapData.hexes is a Map of "q,r" -> hex objects with terrain, resource, river, etc.
export function createHexGrid(scene, gridSize, mapData) {
    var hexShape = createHexShape(HEX_SIZE - HEX_GAP);

    var extrudeSettings = {
        depth: HEX_HEIGHT,
        bevelEnabled: false,
    };

    // Create shared geometry
    var sharedGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    sharedGeometry.rotateX(-Math.PI / 2);

    var hexData = mapData ? mapData.hexes : new Map();
    var hexMeshes = new Map();

    var materials = {};
    for (var tKey in TERRAIN) {
        materials[tKey] = new THREE.MeshStandardMaterial({
            color: TERRAIN[tKey].color,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true,
        });
    }

    // River material — slightly blue-tinted version of terrain
    var riverMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a90d9,
        roughness: 0.6,
        metalness: 0.15,
        flatShading: true,
    });

    var gridGroup = new THREE.Group();

    hexData.forEach(function (hex, key) {
        var mat = hex.river ? riverMaterial : (materials[hex.terrain] || materials.plains);
        var mesh = new THREE.Mesh(sharedGeometry, mat);
        var pos = axialToWorld(hex.q, hex.r);

        // Slight Y offset for elevation feel (water lower, mountains higher)
        var yOffset = 0;
        if (hex.terrain === 'water') yOffset = -0.08;
        else if (hex.terrain === 'mountain') yOffset = 0.15;

        mesh.position.set(pos.x, yOffset, pos.z);
        mesh.userData = { q: hex.q, r: hex.r, key: key };

        hexMeshes.set(key, mesh);
        gridGroup.add(mesh);
    });

    // Add terrain props (trees, rocks, grass) to hexes
    var propGroup = new THREE.Group();
    hexData.forEach(function (hex, key) {
        var propSeed = hex.q * 73856093 + hex.r * 19349663;
        var props = createTerrainProps(hex.terrain, propSeed);
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            var worldPos = axialToWorld(hex.q, hex.r);
            prop.position.x += worldPos.x;
            prop.position.y += HEX_HEIGHT;
            prop.position.z += worldPos.z;
            prop.userData.propHexKey = key;
            propGroup.add(prop);
        }
    });
    gridGroup.add(propGroup);

    scene.add(gridGroup);

    return { hexData, hexMeshes, gridGroup, materials, propGroup };
}

export { TERRAIN, TERRAIN_COLORS_HEX, RESOURCE_COLORS, HEX_SIZE };
