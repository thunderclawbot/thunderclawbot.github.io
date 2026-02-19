// hex-grid.js — Hex grid generation and rendering
// Flat-top hexagons using axial coordinates (q, r)
// Reference: redblobgames.com/grids/hexagons

import * as THREE from 'three';
import { createTerrainProps } from './asset-loader.js';

// Terrain definitions
const TERRAIN = {
    plains:   { color: 0x4ade80, name: 'Plains' },
    forest:   { color: 0x166534, name: 'Forest' },
    mountain: { color: 0x6b7280, name: 'Mountain' },
    water:    { color: 0x3b82f6, name: 'Water' },
    desert:   { color: 0xd4a574, name: 'Desert' },
};

const TERRAIN_KEYS = Object.keys(TERRAIN);

// Hex geometry constants (flat-top)
const HEX_SIZE = 1;
const HEX_HEIGHT = 0.3;
const HEX_GAP = 0.05;

// Seeded random number generator (mulberry32)
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Simple value noise for terrain generation
function createNoiseFunc(seed) {
    const rng = mulberry32(seed);
    const SIZE = 256;
    const table = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
        table[i] = rng();
    }

    return function noise2d(x, y) {
        const scale = 0.15;
        const sx = x * scale;
        const sy = y * scale;

        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        const fx = sx - ix;
        const fy = sy - iy;

        const hash = (a, b) => table[((a * 73856093 ^ b * 19349663) & 0x7fffffff) % SIZE];

        const n00 = hash(ix, iy);
        const n10 = hash(ix + 1, iy);
        const n01 = hash(ix, iy + 1);
        const n11 = hash(ix + 1, iy + 1);

        const tx = fx * fx * (3 - 2 * fx);
        const ty = fy * fy * (3 - 2 * fy);

        const a = n00 + (n10 - n00) * tx;
        const b = n01 + (n11 - n01) * tx;
        return a + (b - a) * ty;
    };
}

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

// Determine terrain from noise value
function terrainFromNoise(value) {
    if (value < 0.2) return 'water';
    if (value < 0.4) return 'plains';
    if (value < 0.6) return 'forest';
    if (value < 0.8) return 'desert';
    return 'mountain';
}

// Create hex grid
export function createHexGrid(scene, gridSize = 20, seed = 42) {
    const noise = createNoiseFunc(seed);
    const hexShape = createHexShape(HEX_SIZE - HEX_GAP);

    const extrudeSettings = {
        depth: HEX_HEIGHT,
        bevelEnabled: false,
    };

    // Create shared geometries per terrain type
    const sharedGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    // Rotate so hex lies flat on XZ plane (extrude was along Z, we want Y-up)
    sharedGeometry.rotateX(-Math.PI / 2);

    const hexData = new Map(); // key: "q,r" -> hex data
    const hexMeshes = new Map(); // key: "q,r" -> mesh

    const materials = {};
    for (const [key, terrain] of Object.entries(TERRAIN)) {
        materials[key] = new THREE.MeshStandardMaterial({
            color: terrain.color,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true,
        });
    }

    const gridGroup = new THREE.Group();

    for (let q = 0; q < gridSize; q++) {
        for (let r = 0; r < gridSize; r++) {
            const noiseVal = noise(q, r);
            const terrain = terrainFromNoise(noiseVal);

            const hex = {
                q,
                r,
                terrain,
                building: null,
                unit: null,
                explored: false,
            };

            const key = `${q},${r}`;
            hexData.set(key, hex);

            const mesh = new THREE.Mesh(sharedGeometry, materials[terrain]);
            const pos = axialToWorld(q, r);
            mesh.position.set(pos.x, 0, pos.z);
            mesh.userData = { q, r, key };

            hexMeshes.set(key, mesh);
            gridGroup.add(mesh);
        }
    }

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

export { TERRAIN, HEX_SIZE };
