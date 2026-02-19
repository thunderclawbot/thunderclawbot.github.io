// hex-grid.js — Hex grid generation and rendering
// Flat-top hexagons using axial coordinates (q, r)
// Reference: redblobgames.com/grids/hexagons
// Uses InstancedMesh for draw-call batching (one draw call per terrain type)

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

// Fog/highlight color constants
var FOG_DIM_FACTOR = 0.35;
var FOG_DARK_COLOR = new THREE.Color(0x0a0a12);
var HOVER_TINT = new THREE.Color(0x333333);
var SELECT_TINT = new THREE.Color(0xfbbf24);

// Create hex grid using InstancedMesh for draw-call batching
// One InstancedMesh per material bucket (terrain type + river)
// Returns an API object for raycasting, color updates, and fog
export function createHexGrid(scene, gridSize, mapData) {
    var hexShape = createHexShape(HEX_SIZE - HEX_GAP);
    var extrudeSettings = { depth: HEX_HEIGHT, bevelEnabled: false };
    var sharedGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    sharedGeometry.rotateX(-Math.PI / 2);

    var hexData = mapData ? mapData.hexes : new Map();

    // ── Group hexes by material bucket ──
    // Each bucket gets one InstancedMesh
    var buckets = {}; // materialKey -> [{ hex, key, pos, yOffset }]

    hexData.forEach(function (hex, key) {
        var matKey = hex.river ? 'river' : hex.terrain;
        if (!buckets[matKey]) buckets[matKey] = [];

        var pos = axialToWorld(hex.q, hex.r);
        var yOffset = 0;
        if (hex.terrain === 'water') yOffset = -0.08;
        else if (hex.terrain === 'mountain') yOffset = 0.15;

        buckets[matKey].push({ hex: hex, key: key, pos: pos, yOffset: yOffset });
    });

    // ── Create materials ──
    var materials = {};
    for (var tKey in TERRAIN) {
        materials[tKey] = new THREE.MeshStandardMaterial({
            color: TERRAIN[tKey].color,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true,
        });
    }
    materials.river = new THREE.MeshStandardMaterial({
        color: 0x4a90d9,
        roughness: 0.6,
        metalness: 0.15,
        flatShading: true,
    });

    var gridGroup = new THREE.Group();

    // ── Mapping structures ──
    // hexKey -> { instancedMesh, instanceId, baseColor }
    var hexLookup = new Map();
    // For raycasting: array of all InstancedMeshes
    var instancedMeshes = [];
    // Per InstancedMesh: instanceId -> hexKey
    var instanceToKey = new Map(); // InstancedMesh.uuid -> array of hexKeys

    // Dummy matrix for setting instance transforms
    var matrix = new THREE.Matrix4();
    var baseColor = new THREE.Color();

    for (var matKey in buckets) {
        var bucket = buckets[matKey];
        var count = bucket.length;
        var mat = materials[matKey] || materials.plains;

        var instancedMesh = new THREE.InstancedMesh(sharedGeometry, mat, count);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // Enable per-instance colors
        instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(count * 3), 3
        );
        instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        var keyArray = new Array(count);

        for (var i = 0; i < count; i++) {
            var entry = bucket[i];
            matrix.makeTranslation(entry.pos.x, entry.yOffset, entry.pos.z);
            instancedMesh.setMatrixAt(i, matrix);

            // Set base color from material
            baseColor.set(mat.color);
            instancedMesh.setColorAt(i, baseColor);

            keyArray[i] = entry.key;

            hexLookup.set(entry.key, {
                instancedMesh: instancedMesh,
                instanceId: i,
                baseColor: baseColor.clone(),
            });
        }

        instanceToKey.set(instancedMesh.uuid, keyArray);
        instancedMesh.userData.keyArray = keyArray;
        instancedMesh.frustumCulled = true;

        instancedMeshes.push(instancedMesh);
        gridGroup.add(instancedMesh);
    }

    // ── Backward-compatible hexMeshes map ──
    // input.js expects hexMeshes.get(key) to return objects with .userData.key
    // We create lightweight proxy objects that hold the key for compatibility
    var hexMeshes = new Map();
    hexData.forEach(function (hex, key) {
        hexMeshes.set(key, { userData: { q: hex.q, r: hex.r, key: key } });
    });

    // ── Terrain props (trees, rocks, grass) ──
    var propGroup = new THREE.Group();
    var propsByHex = new Map(); // hexKey -> [prop meshes]
    hexData.forEach(function (hex, key) {
        var propSeed = hex.q * 73856093 + hex.r * 19349663;
        var props = createTerrainProps(hex.terrain, propSeed);
        if (props.length > 0) {
            var hexProps = [];
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                var worldPos = axialToWorld(hex.q, hex.r);
                prop.position.x += worldPos.x;
                prop.position.y += HEX_HEIGHT;
                prop.position.z += worldPos.z;
                prop.userData.propHexKey = key;
                propGroup.add(prop);
                hexProps.push(prop);
            }
            propsByHex.set(key, hexProps);
        }
    });
    gridGroup.add(propGroup);

    scene.add(gridGroup);

    // ── API for color updates (hover, selection, fog) ──
    var _colorTmp = new THREE.Color();

    function setHexColor(key, color) {
        var info = hexLookup.get(key);
        if (!info) return;
        _colorTmp.set(color);
        info.instancedMesh.setColorAt(info.instanceId, _colorTmp);
        info.instancedMesh.instanceColor.needsUpdate = true;
    }

    function resetHexColor(key) {
        var info = hexLookup.get(key);
        if (!info) return;
        info.instancedMesh.setColorAt(info.instanceId, info.baseColor);
        info.instancedMesh.instanceColor.needsUpdate = true;
    }

    function setHexEmissiveTint(key, tintColor, intensity) {
        var info = hexLookup.get(key);
        if (!info) return;
        _colorTmp.copy(info.baseColor);
        // Add the tint color scaled by intensity (simulates emissive glow)
        _colorTmp.r += tintColor.r * intensity;
        _colorTmp.g += tintColor.g * intensity;
        _colorTmp.b += tintColor.b * intensity;
        info.instancedMesh.setColorAt(info.instanceId, _colorTmp);
        info.instancedMesh.instanceColor.needsUpdate = true;
    }

    function applyFogToHex(key, state) {
        // state: 'visible', 'explored', 'hidden'
        var info = hexLookup.get(key);
        if (!info) return;
        var isVisible = state === 'visible';
        if (isVisible) {
            info.instancedMesh.setColorAt(info.instanceId, info.baseColor);
        } else if (state === 'explored') {
            _colorTmp.copy(info.baseColor).multiplyScalar(FOG_DIM_FACTOR);
            info.instancedMesh.setColorAt(info.instanceId, _colorTmp);
        } else {
            info.instancedMesh.setColorAt(info.instanceId, FOG_DARK_COLOR);
        }
        info.instancedMesh.instanceColor.needsUpdate = true;

        // Toggle terrain prop visibility
        var hexProps = propsByHex.get(key);
        if (hexProps) {
            for (var p = 0; p < hexProps.length; p++) {
                hexProps[p].visible = isVisible;
            }
        }
    }

    // Batch fog update — updates all hexes in one pass, then flags needsUpdate once per mesh
    // Also toggles terrain prop visibility: only visible hexes show props
    function applyFogBatch(visibleHexes, exploredHexes) {
        var exploredSet = new Set(exploredHexes);
        var dirtyMeshes = new Set();

        hexData.forEach(function (hex, key) {
            var info = hexLookup.get(key);
            if (!info) return;
            var isVisible = visibleHexes.has(key);
            if (isVisible) {
                info.instancedMesh.setColorAt(info.instanceId, info.baseColor);
            } else if (exploredSet.has(key)) {
                _colorTmp.copy(info.baseColor).multiplyScalar(FOG_DIM_FACTOR);
                info.instancedMesh.setColorAt(info.instanceId, _colorTmp);
            } else {
                info.instancedMesh.setColorAt(info.instanceId, FOG_DARK_COLOR);
            }
            dirtyMeshes.add(info.instancedMesh);

            // Toggle terrain prop visibility
            var hexProps = propsByHex.get(key);
            if (hexProps) {
                for (var p = 0; p < hexProps.length; p++) {
                    hexProps[p].visible = isVisible;
                }
            }
        });

        dirtyMeshes.forEach(function (mesh) {
            mesh.instanceColor.needsUpdate = true;
        });
    }

    // Resolve a raycast instanceId to a hex key
    function resolveInstanceHit(instancedMesh, instanceId) {
        var keyArray = instancedMesh.userData.keyArray;
        if (keyArray && instanceId >= 0 && instanceId < keyArray.length) {
            return keyArray[instanceId];
        }
        return null;
    }

    return {
        hexData: hexData,
        hexMeshes: hexMeshes,
        gridGroup: gridGroup,
        materials: materials,
        propGroup: propGroup,
        propsByHex: propsByHex,
        // InstancedMesh API
        instancedMeshes: instancedMeshes,
        hexLookup: hexLookup,
        setHexColor: setHexColor,
        resetHexColor: resetHexColor,
        setHexEmissiveTint: setHexEmissiveTint,
        applyFogToHex: applyFogToHex,
        applyFogBatch: applyFogBatch,
        resolveInstanceHit: resolveInstanceHit,
    };
}

export { TERRAIN, TERRAIN_COLORS_HEX, RESOURCE_COLORS, HEX_SIZE, HEX_HEIGHT };
