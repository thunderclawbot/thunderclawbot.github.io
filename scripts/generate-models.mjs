#!/usr/bin/env node
// generate-models.mjs — Generates low-poly .glb model files for the game
// Builds valid glTF 2.0 binary (.glb) directly, no browser APIs needed.
// Run with: node scripts/generate-models.mjs

import * as THREE from 'three';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

var __dirname = dirname(fileURLToPath(import.meta.url));
var MODELS_DIR = join(__dirname, '..', 'mythical-realms', 'game', 'assets', 'models');

function ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
}

function makeMat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({
        color: color,
        roughness: 0.7,
        metalness: 0.15,
        flatShading: true,
    }, opts || {}));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLB BINARY WRITER (pure Node.js, no FileReader)
// glTF 2.0 spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function colorToArray(color) {
    var c = new THREE.Color(color);
    return [c.r, c.g, c.b, 1.0];
}

function exportGroupToGLB(group) {
    // Collect all meshes from the group hierarchy
    var meshes = [];
    group.traverse(function (child) {
        if (child.isMesh) {
            meshes.push(child);
        }
    });

    if (meshes.length === 0) {
        throw new Error('No meshes found in group');
    }

    // Build glTF JSON + binary buffer
    var bufferData = [];  // array of typed array chunks
    var bufferViews = [];
    var accessors = [];
    var gltfMeshes = [];
    var gltfNodes = [];
    var gltfMaterials = [];
    var materialCache = new Map(); // color hex -> material index
    var byteOffset = 0;

    function addBufferView(typedArray) {
        var bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        // Pad to 4-byte alignment
        var padding = (4 - (bytes.length % 4)) % 4;
        var paddedBytes = new Uint8Array(bytes.length + padding);
        paddedBytes.set(bytes);
        var idx = bufferViews.length;
        bufferViews.push({
            buffer: 0,
            byteOffset: byteOffset,
            byteLength: bytes.length,
        });
        bufferData.push(paddedBytes);
        byteOffset += paddedBytes.length;
        return idx;
    }

    function addAccessor(bufferViewIdx, componentType, count, type, min, max) {
        var idx = accessors.length;
        var acc = {
            bufferView: bufferViewIdx,
            componentType: componentType,
            count: count,
            type: type,
        };
        if (min) acc.min = min;
        if (max) acc.max = max;
        accessors.push(acc);
        return idx;
    }

    function getMaterialIndex(mesh) {
        var mat = mesh.material;
        var color = mat.color ? mat.color.getHex() : 0xcccccc;
        var key = color.toString(16) + '_' + (mat.metalness || 0) + '_' + (mat.roughness || 0.7);
        if (materialCache.has(key)) return materialCache.get(key);
        var idx = gltfMaterials.length;
        var gmat = {
            pbrMetallicRoughness: {
                baseColorFactor: colorToArray(color),
                metallicFactor: mat.metalness || 0,
                roughnessFactor: mat.roughness != null ? mat.roughness : 0.7,
            },
            name: 'mat_' + idx,
        };
        if (mat.emissive && mat.emissiveIntensity > 0) {
            var ec = new THREE.Color(mat.emissive);
            gmat.emissiveFactor = [
                ec.r * mat.emissiveIntensity,
                ec.g * mat.emissiveIntensity,
                ec.b * mat.emissiveIntensity,
            ];
        }
        gltfMaterials.push(gmat);
        materialCache.set(key, idx);
        return idx;
    }

    // Process each mesh
    for (var m = 0; m < meshes.length; m++) {
        var mesh = meshes[m];
        var geo = mesh.geometry;

        // Ensure we have a non-indexed BufferGeometry with positions
        if (!geo.attributes.position) continue;

        // Apply mesh world transform to geometry
        mesh.updateMatrixWorld(true);
        var clonedGeo = geo.clone();
        clonedGeo.applyMatrix4(mesh.matrixWorld);

        // If flat shading, convert indexed to non-indexed
        if (clonedGeo.index && mesh.material.flatShading) {
            clonedGeo = clonedGeo.toNonIndexed();
        }

        var posAttr = clonedGeo.attributes.position;
        var normalAttr = clonedGeo.attributes.normal;

        // Compute normals if missing
        if (!normalAttr) {
            clonedGeo.computeVertexNormals();
            normalAttr = clonedGeo.attributes.normal;
        }

        var vertexCount = posAttr.count;

        // Position accessor
        var posArray = new Float32Array(vertexCount * 3);
        for (var i = 0; i < vertexCount; i++) {
            posArray[i * 3] = posAttr.getX(i);
            posArray[i * 3 + 1] = posAttr.getY(i);
            posArray[i * 3 + 2] = posAttr.getZ(i);
        }
        // Compute bounds
        var minPos = [Infinity, Infinity, Infinity];
        var maxPos = [-Infinity, -Infinity, -Infinity];
        for (var i = 0; i < vertexCount; i++) {
            for (var j = 0; j < 3; j++) {
                var v = posArray[i * 3 + j];
                if (v < minPos[j]) minPos[j] = v;
                if (v > maxPos[j]) maxPos[j] = v;
            }
        }
        var posBV = addBufferView(posArray);
        var posAcc = addAccessor(posBV, 5126, vertexCount, 'VEC3', minPos, maxPos);

        // Normal accessor
        var normArray = new Float32Array(vertexCount * 3);
        for (var i = 0; i < vertexCount; i++) {
            normArray[i * 3] = normalAttr.getX(i);
            normArray[i * 3 + 1] = normalAttr.getY(i);
            normArray[i * 3 + 2] = normalAttr.getZ(i);
        }
        var normBV = addBufferView(normArray);
        var normAcc = addAccessor(normBV, 5126, vertexCount, 'VEC3');

        // Index accessor (if indexed and not flat-shading)
        var primitive = {
            attributes: {
                POSITION: posAcc,
                NORMAL: normAcc,
            },
            material: getMaterialIndex(mesh),
        };

        if (clonedGeo.index) {
            var idxArray = clonedGeo.index.array;
            // Use Uint16 if possible
            var maxIdx = 0;
            for (var i = 0; i < idxArray.length; i++) {
                if (idxArray[i] > maxIdx) maxIdx = idxArray[i];
            }
            var indexTyped;
            var componentType;
            if (maxIdx < 65536) {
                indexTyped = new Uint16Array(idxArray.length);
                for (var i = 0; i < idxArray.length; i++) indexTyped[i] = idxArray[i];
                componentType = 5123; // UNSIGNED_SHORT
            } else {
                indexTyped = new Uint32Array(idxArray);
                componentType = 5125; // UNSIGNED_INT
            }
            var idxBV = addBufferView(indexTyped);
            var idxAcc = addAccessor(idxBV, componentType, indexTyped.length, 'SCALAR');
            primitive.indices = idxAcc;
        }

        gltfMeshes.push({
            primitives: [primitive],
            name: 'mesh_' + m,
        });

        gltfNodes.push({
            mesh: gltfMeshes.length - 1,
            name: 'node_' + m,
        });
    }

    // Merge all buffer chunks
    var totalBytes = byteOffset;
    var mergedBuffer = new Uint8Array(totalBytes);
    var offset = 0;
    for (var i = 0; i < bufferData.length; i++) {
        mergedBuffer.set(bufferData[i], offset);
        offset += bufferData[i].length;
    }

    // Build glTF JSON
    var nodeIndices = [];
    for (var i = 0; i < gltfNodes.length; i++) nodeIndices.push(i);

    var gltf = {
        asset: { version: '2.0', generator: 'thunderclaw-model-gen' },
        scene: 0,
        scenes: [{ nodes: nodeIndices }],
        nodes: gltfNodes,
        meshes: gltfMeshes,
        accessors: accessors,
        bufferViews: bufferViews,
        buffers: [{ byteLength: totalBytes }],
        materials: gltfMaterials,
    };

    var jsonStr = JSON.stringify(gltf);
    // Pad JSON to 4-byte alignment
    var jsonPadding = (4 - (jsonStr.length % 4)) % 4;
    jsonStr += ' '.repeat(jsonPadding);

    var jsonBytes = Buffer.from(jsonStr, 'utf8');
    var binBytes = mergedBuffer;

    // GLB header: magic (4) + version (4) + length (4) = 12 bytes
    // Chunk 0 (JSON): length (4) + type (4) + data
    // Chunk 1 (BIN): length (4) + type (4) + data
    var totalLength = 12 + 8 + jsonBytes.length + 8 + binBytes.length;
    var glb = Buffer.alloc(totalLength);

    // Header
    glb.writeUInt32LE(0x46546C67, 0); // 'glTF'
    glb.writeUInt32LE(2, 4);          // version 2
    glb.writeUInt32LE(totalLength, 8);

    // JSON chunk
    glb.writeUInt32LE(jsonBytes.length, 12);
    glb.writeUInt32LE(0x4E4F534A, 16); // 'JSON'
    jsonBytes.copy(glb, 20);

    // BIN chunk
    var binChunkOffset = 20 + jsonBytes.length;
    glb.writeUInt32LE(binBytes.length, binChunkOffset);
    glb.writeUInt32LE(0x004E4942, binChunkOffset + 4); // 'BIN\0'
    Buffer.from(binBytes).copy(glb, binChunkOffset + 8);

    return glb;
}

function exportGLB(group, filePath) {
    ensureDir(dirname(filePath));
    var glb = exportGroupToGLB(group);
    writeFileSync(filePath, glb);
    var sizeKB = (glb.length / 1024).toFixed(1);
    console.log('  ' + filePath.split('models/')[1] + ' (' + sizeKB + ' KB)');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROP MODELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function makeTreeOak() {
    var group = new THREE.Group();
    var trunkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.3, 5);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x8B5E3C));
    trunk.position.y = 0.15;
    group.add(trunk);
    var canopyGeo = new THREE.IcosahedronGeometry(0.2, 0);
    var canopy = new THREE.Mesh(canopyGeo, makeMat(0x228B22));
    canopy.position.y = 0.4;
    canopy.scale.y = 0.8;
    group.add(canopy);
    return group;
}

function makeTreePine() {
    var group = new THREE.Group();
    var trunkGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.25, 5);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x6B4226));
    trunk.position.y = 0.125;
    group.add(trunk);
    var sizes = [
        { r: 0.18, h: 0.2, y: 0.35 },
        { r: 0.14, h: 0.18, y: 0.48 },
        { r: 0.1, h: 0.15, y: 0.58 },
    ];
    for (var i = 0; i < sizes.length; i++) {
        var s = sizes[i];
        var coneGeo = new THREE.ConeGeometry(s.r, s.h, 6);
        var cone = new THREE.Mesh(coneGeo, makeMat(0x0F5E1E));
        cone.position.y = s.y;
        group.add(cone);
    }
    return group;
}

function makeTreeWillow() {
    var group = new THREE.Group();
    var trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.35, 5);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x7B6B4C));
    trunk.position.y = 0.175;
    group.add(trunk);
    var canopyGeo = new THREE.SphereGeometry(0.22, 6, 4);
    var canopy = new THREE.Mesh(canopyGeo, makeMat(0x3CB371));
    canopy.position.y = 0.4;
    canopy.scale.set(1, 0.6, 1);
    group.add(canopy);
    return group;
}

function makeRockLarge() {
    var group = new THREE.Group();
    var geo = new THREE.DodecahedronGeometry(0.15, 0);
    var rock = new THREE.Mesh(geo, makeMat(0x6B6B6B));
    rock.position.y = 0.1;
    rock.scale.set(1.2, 0.7, 1);
    group.add(rock);
    var smallGeo = new THREE.DodecahedronGeometry(0.08, 0);
    var small = new THREE.Mesh(smallGeo, makeMat(0x808080));
    small.position.set(0.12, 0.05, 0.08);
    group.add(small);
    return group;
}

function makeRockSmall() {
    var group = new THREE.Group();
    var geo = new THREE.DodecahedronGeometry(0.1, 0);
    var rock = new THREE.Mesh(geo, makeMat(0x7A7A7A));
    rock.position.y = 0.06;
    rock.scale.set(1, 0.6, 0.8);
    group.add(rock);
    return group;
}

function makeGrass() {
    var group = new THREE.Group();
    for (var i = 0; i < 3; i++) {
        var bladeGeo = new THREE.ConeGeometry(0.02, 0.15, 3);
        var blade = new THREE.Mesh(bladeGeo, makeMat(0x5DB85D));
        var angle = (i / 3) * Math.PI * 2;
        blade.position.set(Math.cos(angle) * 0.04, 0.075, Math.sin(angle) * 0.04);
        group.add(blade);
    }
    return group;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUILDING MODELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function makeTownCenter() {
    var group = new THREE.Group();
    var baseGeo = new THREE.BoxGeometry(0.6, 0.08, 0.5);
    var base = new THREE.Mesh(baseGeo, makeMat(0x555555));
    base.position.y = 0.04;
    group.add(base);
    var hallGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4);
    var hall = new THREE.Mesh(hallGeo, makeMat(0x94A3B8));
    hall.position.y = 0.255;
    group.add(hall);
    var roofGeo = new THREE.ConeGeometry(0.28, 0.2, 4);
    var roof = new THREE.Mesh(roofGeo, makeMat(0x8B4513));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.53;
    group.add(roof);
    var poleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
    var pole = new THREE.Mesh(poleGeo, makeMat(0x8B7355));
    pole.position.set(0.2, 0.58, 0);
    group.add(pole);
    return group;
}

function makeFarm() {
    var group = new THREE.Group();
    var soilGeo = new THREE.BoxGeometry(0.6, 0.04, 0.5);
    var soil = new THREE.Mesh(soilGeo, makeMat(0x5C4033));
    soil.position.y = 0.02;
    group.add(soil);
    for (var i = -2; i <= 2; i++) {
        var rowGeo = new THREE.BoxGeometry(0.5, 0.06, 0.04);
        var row = new THREE.Mesh(rowGeo, makeMat(0x4CAF50));
        row.position.set(0, 0.07, i * 0.09);
        group.add(row);
    }
    var houseGeo = new THREE.BoxGeometry(0.12, 0.12, 0.1);
    var house = new THREE.Mesh(houseGeo, makeMat(0xA0826D));
    house.position.set(-0.22, 0.1, -0.18);
    group.add(house);
    var hRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.08, 4),
        makeMat(0x8B4513)
    );
    hRoof.rotation.y = Math.PI / 4;
    hRoof.position.set(-0.22, 0.2, -0.18);
    group.add(hRoof);
    return group;
}

function makeLumberMill() {
    var group = new THREE.Group();
    var bodyGeo = new THREE.BoxGeometry(0.3, 0.3, 0.25);
    var body = new THREE.Mesh(bodyGeo, makeMat(0x6B4226));
    body.position.y = 0.15;
    group.add(body);
    var roofGeo = new THREE.ConeGeometry(0.22, 0.15, 4);
    var roof = new THREE.Mesh(roofGeo, makeMat(0x654321));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.38;
    group.add(roof);
    var sawGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.01, 8);
    var saw = new THREE.Mesh(sawGeo, makeMat(0xC0C0C0, { metalness: 0.6 }));
    saw.rotation.x = Math.PI / 2;
    saw.position.set(0.18, 0.15, 0);
    group.add(saw);
    for (var i = 0; i < 3; i++) {
        var logGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 5);
        var log = new THREE.Mesh(logGeo, makeMat(0x8B5E3C));
        log.rotation.z = Math.PI / 2;
        log.position.set(-0.2, 0.05 + i * 0.06, (i - 1) * 0.05);
        group.add(log);
    }
    return group;
}

function makeQuarry() {
    var group = new THREE.Group();
    var steps = [
        { w: 0.5, h: 0.08, d: 0.5, y: 0.04 },
        { w: 0.38, h: 0.08, d: 0.38, y: 0.12 },
        { w: 0.25, h: 0.08, d: 0.25, y: 0.2 },
    ];
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var stepGeo = new THREE.BoxGeometry(s.w, s.h, s.d);
        var step = new THREE.Mesh(stepGeo, makeMat(0x808080));
        step.position.y = s.y;
        group.add(step);
    }
    var poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4);
    var pole = new THREE.Mesh(poleGeo, makeMat(0x654321));
    pole.position.set(0.15, 0.4, 0.15);
    group.add(pole);
    return group;
}

function makeMine() {
    var group = new THREE.Group();
    var rockGeo = new THREE.DodecahedronGeometry(0.22, 0);
    var rock = new THREE.Mesh(rockGeo, makeMat(0x6B6B6B));
    rock.position.y = 0.18;
    rock.scale.set(1.2, 0.8, 0.8);
    group.add(rock);
    var tunnelGeo = new THREE.BoxGeometry(0.12, 0.15, 0.1);
    var tunnel = new THREE.Mesh(tunnelGeo, makeMat(0x1A1A1A));
    tunnel.position.set(0, 0.1, 0.14);
    group.add(tunnel);
    for (var side = -1; side <= 1; side += 2) {
        var beamGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
        var beam = new THREE.Mesh(beamGeo, makeMat(0x8B5E3C));
        beam.position.set(side * 0.06, 0.1, 0.19);
        group.add(beam);
    }
    var topGeo = new THREE.BoxGeometry(0.14, 0.02, 0.02);
    var top = new THREE.Mesh(topGeo, makeMat(0x8B5E3C));
    top.position.set(0, 0.19, 0.19);
    group.add(top);
    return group;
}

function makeBarracks() {
    var group = new THREE.Group();
    var bodyGeo = new THREE.BoxGeometry(0.45, 0.3, 0.4);
    var body = new THREE.Mesh(bodyGeo, makeMat(0x94A3B8));
    body.position.y = 0.15;
    group.add(body);
    var roofGeo = new THREE.BoxGeometry(0.5, 0.04, 0.45);
    var roof = new THREE.Mesh(roofGeo, makeMat(0x60A5FA));
    roof.position.y = 0.32;
    group.add(roof);
    var dummyPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4),
        makeMat(0x654321)
    );
    dummyPole.position.set(0.28, 0.1, 0);
    group.add(dummyPole);
    var dummyBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.02),
        makeMat(0xC4A882)
    );
    dummyBody.position.set(0.28, 0.18, 0);
    group.add(dummyBody);
    return group;
}

function makeMageTower() {
    var group = new THREE.Group();
    var baseGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.15, 6);
    var base = new THREE.Mesh(baseGeo, makeMat(0x555555));
    base.position.y = 0.075;
    group.add(base);
    var towerGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.5, 6);
    var tower = new THREE.Mesh(towerGeo, makeMat(0x6B6B8D));
    tower.position.y = 0.4;
    group.add(tower);
    var roofGeo = new THREE.ConeGeometry(0.15, 0.2, 6);
    var roof = new THREE.Mesh(roofGeo, makeMat(0x4B0082));
    roof.position.y = 0.75;
    group.add(roof);
    var crystalGeo = new THREE.OctahedronGeometry(0.05, 0);
    var crystal = new THREE.Mesh(crystalGeo, makeMat(0xA78BFA, {
        emissive: 0xA78BFA,
        emissiveIntensity: 0.5,
    }));
    crystal.position.y = 0.88;
    group.add(crystal);
    return group;
}

function makeWalls() {
    var group = new THREE.Group();
    var wallGeo = new THREE.BoxGeometry(0.7, 0.25, 0.08);
    var wall = new THREE.Mesh(wallGeo, makeMat(0x94A3B8));
    wall.position.y = 0.125;
    group.add(wall);
    for (var i = -3; i <= 3; i++) {
        if (i % 2 === 0) continue;
        var crenGeo = new THREE.BoxGeometry(0.06, 0.08, 0.08);
        var cren = new THREE.Mesh(crenGeo, makeMat(0x94A3B8));
        cren.position.set(i * 0.08, 0.29, 0);
        group.add(cren);
    }
    return group;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIT MODELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function makeWorker() {
    var group = new THREE.Group();
    var bodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.18, 5);
    var body = new THREE.Mesh(bodyGeo, makeMat(0x8B7355));
    body.position.y = 0.09;
    group.add(body);
    var headGeo = new THREE.SphereGeometry(0.05, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(0xF0C8A0));
    head.position.y = 0.23;
    group.add(head);
    var toolGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 3);
    var tool = new THREE.Mesh(toolGeo, makeMat(0x654321));
    tool.position.set(0.08, 0.12, 0);
    tool.rotation.z = -0.5;
    group.add(tool);
    return group;
}

function makeWarrior() {
    var group = new THREE.Group();
    var torsoGeo = new THREE.BoxGeometry(0.14, 0.2, 0.1);
    var torso = new THREE.Mesh(torsoGeo, makeMat(0x60A5FA, { metalness: 0.3 }));
    torso.position.y = 0.13;
    group.add(torso);
    var legGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
    var legs = new THREE.Mesh(legGeo, makeMat(0x4A4A4A));
    legs.position.y = 0.05;
    group.add(legs);
    var headGeo = new THREE.SphereGeometry(0.06, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(0x60A5FA, { metalness: 0.4 }));
    head.position.y = 0.28;
    group.add(head);
    var swordGeo = new THREE.BoxGeometry(0.02, 0.2, 0.01);
    var sword = new THREE.Mesh(swordGeo, makeMat(0xC0C0C0, { metalness: 0.5 }));
    sword.position.set(0.12, 0.18, 0);
    sword.rotation.z = -0.2;
    group.add(sword);
    var shieldGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 6);
    var shield = new THREE.Mesh(shieldGeo, makeMat(0x94A3B8));
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.1, 0.15, 0);
    group.add(shield);
    return group;
}

function makeArcher() {
    var group = new THREE.Group();
    var bodyGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.22, 5);
    var body = new THREE.Mesh(bodyGeo, makeMat(0x8B4513));
    body.position.y = 0.11;
    group.add(body);
    var headGeo = new THREE.SphereGeometry(0.05, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(0xF0C8A0));
    head.position.y = 0.27;
    group.add(head);
    var bowGeo = new THREE.TorusGeometry(0.08, 0.008, 4, 8, Math.PI);
    var bow = new THREE.Mesh(bowGeo, makeMat(0x8B5E3C));
    bow.position.set(-0.08, 0.18, 0);
    bow.rotation.z = Math.PI / 2;
    group.add(bow);
    var quiverGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.12, 4);
    var quiver = new THREE.Mesh(quiverGeo, makeMat(0x654321));
    quiver.position.set(0.04, 0.18, -0.06);
    quiver.rotation.z = 0.2;
    group.add(quiver);
    return group;
}

function makeMage() {
    var group = new THREE.Group();
    var robeGeo = new THREE.ConeGeometry(0.1, 0.25, 6);
    var robe = new THREE.Mesh(robeGeo, makeMat(0x4B0082));
    robe.position.y = 0.125;
    group.add(robe);
    var headGeo = new THREE.SphereGeometry(0.055, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(0xFFDBB5));
    head.position.y = 0.3;
    group.add(head);
    var hatGeo = new THREE.ConeGeometry(0.06, 0.12, 4);
    var hat = new THREE.Mesh(hatGeo, makeMat(0x4B0082));
    hat.position.y = 0.38;
    group.add(hat);
    var staffGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 3);
    var staff = new THREE.Mesh(staffGeo, makeMat(0x654321));
    staff.position.set(0.1, 0.15, 0);
    group.add(staff);
    var crystalGeo = new THREE.OctahedronGeometry(0.03, 0);
    var crystal = new THREE.Mesh(crystalGeo, makeMat(0xA78BFA, {
        emissive: 0xA78BFA,
        emissiveIntensity: 0.5,
    }));
    crystal.position.set(0.1, 0.34, 0);
    group.add(crystal);
    return group;
}

function makeHero() {
    var group = new THREE.Group();
    var torsoGeo = new THREE.BoxGeometry(0.18, 0.25, 0.12);
    var torso = new THREE.Mesh(torsoGeo, makeMat(0xFBBF24, { metalness: 0.4 }));
    torso.position.y = 0.16;
    group.add(torso);
    var legGeo = new THREE.BoxGeometry(0.16, 0.1, 0.1);
    var legs = new THREE.Mesh(legGeo, makeMat(0x94A3B8, { metalness: 0.3 }));
    legs.position.y = 0.05;
    group.add(legs);
    var headGeo = new THREE.SphereGeometry(0.07, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(0xFBBF24, { metalness: 0.3 }));
    head.position.y = 0.34;
    group.add(head);
    var swordGeo = new THREE.BoxGeometry(0.025, 0.28, 0.012);
    var sword = new THREE.Mesh(swordGeo, makeMat(0xE0E0E0, { metalness: 0.6 }));
    sword.position.set(0.14, 0.2, 0);
    sword.rotation.z = -0.15;
    group.add(sword);
    return group;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERATE ALL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function main() {
    console.log('Generating .glb models...\n');

    // Props (6 models)
    console.log('Props:');
    exportGLB(makeTreeOak(), join(MODELS_DIR, 'props', 'tree_oak.glb'));
    exportGLB(makeTreePine(), join(MODELS_DIR, 'props', 'tree_pine.glb'));
    exportGLB(makeTreeWillow(), join(MODELS_DIR, 'props', 'tree_willow.glb'));
    exportGLB(makeRockLarge(), join(MODELS_DIR, 'props', 'rock_large.glb'));
    exportGLB(makeRockSmall(), join(MODELS_DIR, 'props', 'rock_small.glb'));
    exportGLB(makeGrass(), join(MODELS_DIR, 'props', 'grass.glb'));

    // Buildings (8 generic models)
    console.log('\nBuildings:');
    exportGLB(makeTownCenter(), join(MODELS_DIR, 'buildings', 'town_center.glb'));
    exportGLB(makeFarm(), join(MODELS_DIR, 'buildings', 'farm.glb'));
    exportGLB(makeLumberMill(), join(MODELS_DIR, 'buildings', 'lumber_mill.glb'));
    exportGLB(makeQuarry(), join(MODELS_DIR, 'buildings', 'quarry.glb'));
    exportGLB(makeMine(), join(MODELS_DIR, 'buildings', 'mine.glb'));
    exportGLB(makeBarracks(), join(MODELS_DIR, 'buildings', 'barracks.glb'));
    exportGLB(makeMageTower(), join(MODELS_DIR, 'buildings', 'mage_tower.glb'));
    exportGLB(makeWalls(), join(MODELS_DIR, 'buildings', 'walls.glb'));

    // Units (5 models — worker, warrior, archer, mage, hero)
    console.log('\nUnits:');
    exportGLB(makeWorker(), join(MODELS_DIR, 'units', 'worker.glb'));
    exportGLB(makeWarrior(), join(MODELS_DIR, 'units', 'warrior.glb'));
    exportGLB(makeArcher(), join(MODELS_DIR, 'units', 'archer.glb'));
    exportGLB(makeMage(), join(MODELS_DIR, 'units', 'mage.glb'));
    exportGLB(makeHero(), join(MODELS_DIR, 'units', 'hero.glb'));

    console.log('\nDone! Generated 19 .glb models.');
}

main();
