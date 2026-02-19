// asset-loader.js — GLTF asset pipeline with procedural fallback models
// Provides model registry, preloading, and procedural low-poly model generation
// for buildings, units, terrain props, and race-specific variants.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Race color palettes (duplicated from buildings.js to avoid circular imports)
var RACE_PALETTES = {
    human: {
        primary: 0x94a3b8,
        secondary: 0x60a5fa,
        accent: 0xfbbf24,
    },
    elf: {
        primary: 0x8b6914,
        secondary: 0x10b981,
        accent: 0xc0c0c0,
    },
    orc: {
        primary: 0x3f3f3f,
        secondary: 0xdc2626,
        accent: 0xe8dcc8,
    },
};

// ── Model Registry ──
// Maps model keys to .glb file paths (relative to /game-demo/assets/models/)
// If a .glb file is not found, the procedural fallback is used.
var MODEL_REGISTRY = {
    // Terrain props
    'prop_tree_oak': 'props/tree_oak.glb',
    'prop_tree_pine': 'props/tree_pine.glb',
    'prop_tree_willow': 'props/tree_willow.glb',
    'prop_rock_large': 'props/rock_large.glb',
    'prop_rock_small': 'props/rock_small.glb',
    'prop_grass': 'props/grass.glb',

    // Buildings (shared)
    'building_town_center': 'buildings/town_center.glb',
    'building_farm': 'buildings/farm.glb',
    'building_lumber_mill': 'buildings/lumber_mill.glb',
    'building_quarry': 'buildings/quarry.glb',
    'building_mine': 'buildings/mine.glb',
    'building_barracks': 'buildings/barracks.glb',
    'building_mage_tower': 'buildings/mage_tower.glb',
    'building_walls': 'buildings/walls.glb',

    // Human buildings
    'building_market': 'buildings/market.glb',
    'building_castle': 'buildings/castle.glb',
    'building_chapel': 'buildings/chapel.glb',
    'building_grand_cathedral': 'buildings/grand_cathedral.glb',

    // Elf buildings
    'building_tree_of_life': 'buildings/tree_of_life.glb',
    'building_moonwell': 'buildings/moonwell.glb',
    'building_ancient_archive': 'buildings/ancient_archive.glb',
    'building_world_tree': 'buildings/world_tree.glb',

    // Orc buildings
    'building_war_pit': 'buildings/war_pit.glb',
    'building_blood_forge': 'buildings/blood_forge.glb',
    'building_totem': 'buildings/totem.glb',
    'building_skull_throne': 'buildings/skull_throne.glb',

    // Units
    'unit_worker': 'units/worker.glb',
    'unit_warrior': 'units/warrior.glb',
    'unit_archer': 'units/archer.glb',
    'unit_mage': 'units/mage.glb',
    'unit_hero': 'units/hero.glb',
};

// ── Loader state ──
var gltfLoader = new GLTFLoader();
var loadedModels = new Map();   // key -> THREE.Group (template)
var loadingProgress = { total: 0, loaded: 0, failed: 0 };
var modelsReady = false;

// ── Preload all models ──
// Attempts to load .glb files. If any fail, procedural fallbacks are used.
// Returns a promise that resolves when all models are loaded or fallbacked.
export function preloadModels(onProgress) {
    var keys = Object.keys(MODEL_REGISTRY);
    loadingProgress.total = keys.length;
    loadingProgress.loaded = 0;
    loadingProgress.failed = 0;

    var promises = keys.map(function (key) {
        var path = 'assets/models/' + MODEL_REGISTRY[key];
        return new Promise(function (resolve) {
            gltfLoader.load(
                path,
                function (gltf) {
                    loadedModels.set(key, gltf.scene);
                    loadingProgress.loaded++;
                    if (onProgress) onProgress(loadingProgress);
                    resolve();
                },
                undefined,
                function () {
                    // File not found — will use procedural fallback
                    loadingProgress.failed++;
                    loadingProgress.loaded++;
                    if (onProgress) onProgress(loadingProgress);
                    resolve();
                }
            );
        });
    });

    return Promise.all(promises).then(function () {
        modelsReady = true;
    });
}

// ── Get a model instance ──
// Returns a cloned THREE.Group if a .glb was loaded, or a procedural model.
export function getModel(key) {
    if (loadedModels.has(key)) {
        return loadedModels.get(key).clone();
    }
    return null;
}

// ── Check if models are ready ──
export function areModelsReady() {
    return modelsReady;
}

// ── Dispose a model group (handles children recursively) ──
export function disposeModel(obj) {
    if (!obj) return;
    obj.traverse(function (child) {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(function (m) { m.dispose(); });
                } else {
                    child.material.dispose();
                }
            }
        }
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCEDURAL MODEL GENERATORS
// Low-poly stylized models built from Three.js geometry
// 50-200 triangles per model for mobile performance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function makeMat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({
        color: color,
        roughness: 0.7,
        metalness: 0.15,
        flatShading: true,
    }, opts || {}));
}

// ── Terrain Props ──

export function createTreeOak() {
    var group = new THREE.Group();
    // Trunk
    var trunkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.3, 5);
    var trunkMat = makeMat(0x8B5E3C);
    var trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.15;
    group.add(trunk);
    // Canopy — icosahedron for organic look
    var canopyGeo = new THREE.IcosahedronGeometry(0.2, 0);
    var canopyMat = makeMat(0x228B22);
    var canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 0.4;
    canopy.scale.y = 0.8;
    group.add(canopy);
    return group;
}

export function createTreePine() {
    var group = new THREE.Group();
    // Trunk
    var trunkGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.25, 5);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x6B4226));
    trunk.position.y = 0.125;
    group.add(trunk);
    // Three cone layers
    var sizes = [{ r: 0.18, h: 0.2, y: 0.35 }, { r: 0.14, h: 0.18, y: 0.48 }, { r: 0.1, h: 0.15, y: 0.58 }];
    for (var i = 0; i < sizes.length; i++) {
        var s = sizes[i];
        var coneGeo = new THREE.ConeGeometry(s.r, s.h, 6);
        var cone = new THREE.Mesh(coneGeo, makeMat(0x0F5E1E));
        cone.position.y = s.y;
        group.add(cone);
    }
    return group;
}

export function createTreeWillow() {
    var group = new THREE.Group();
    // Trunk — slightly curved
    var trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.35, 5);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x7B6B4C));
    trunk.position.y = 0.175;
    group.add(trunk);
    // Drooping canopy — flattened sphere
    var canopyGeo = new THREE.SphereGeometry(0.22, 6, 4);
    var canopy = new THREE.Mesh(canopyGeo, makeMat(0x3CB371));
    canopy.position.y = 0.4;
    canopy.scale.set(1, 0.6, 1);
    group.add(canopy);
    return group;
}

export function createRockLarge() {
    var group = new THREE.Group();
    var geo = new THREE.DodecahedronGeometry(0.15, 0);
    var rock = new THREE.Mesh(geo, makeMat(0x6B6B6B));
    rock.position.y = 0.1;
    rock.scale.set(1.2, 0.7, 1);
    rock.rotation.y = Math.random() * Math.PI;
    group.add(rock);
    // Small rock beside it
    var smallGeo = new THREE.DodecahedronGeometry(0.08, 0);
    var small = new THREE.Mesh(smallGeo, makeMat(0x808080));
    small.position.set(0.12, 0.05, 0.08);
    group.add(small);
    return group;
}

export function createRockSmall() {
    var group = new THREE.Group();
    var geo = new THREE.DodecahedronGeometry(0.1, 0);
    var rock = new THREE.Mesh(geo, makeMat(0x7A7A7A));
    rock.position.y = 0.06;
    rock.scale.set(1, 0.6, 0.8);
    group.add(rock);
    return group;
}

export function createGrassClump() {
    var group = new THREE.Group();
    // 3 thin cones as grass blades
    for (var i = 0; i < 3; i++) {
        var bladeGeo = new THREE.ConeGeometry(0.02, 0.15, 3);
        var blade = new THREE.Mesh(bladeGeo, makeMat(0x5DB85D));
        var angle = (i / 3) * Math.PI * 2;
        blade.position.set(Math.cos(angle) * 0.04, 0.075, Math.sin(angle) * 0.04);
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(blade);
    }
    return group;
}

// ── Building Models ──

function createRoof(width, height, depth, color) {
    var geo = new THREE.ConeGeometry(width * 0.8, height, 4);
    var mesh = new THREE.Mesh(geo, makeMat(color));
    mesh.rotation.y = Math.PI / 4;
    return mesh;
}

export function createBuildingModel(buildingType, race) {
    var palette = RACE_PALETTES[race] || RACE_PALETTES.human;
    var model = getModel('building_' + buildingType);
    if (model) {
        tintModel(model, palette);
        return model;
    }
    // Procedural fallback
    return createProceduralBuilding(buildingType, race, palette);
}

function createProceduralBuilding(buildingType, race, palette) {
    var group = new THREE.Group();

    switch (buildingType) {
        case 'town_center':
            return buildTownCenter(group, race, palette);
        case 'farm':
            return buildFarm(group, race, palette);
        case 'lumber_mill':
            return buildLumberMill(group, race, palette);
        case 'quarry':
            return buildQuarry(group, race, palette);
        case 'mine':
            return buildMine(group, race, palette);
        case 'barracks':
            return buildBarracks(group, race, palette);
        case 'mage_tower':
            return buildMageTower(group, race, palette);
        case 'walls':
            return buildWalls(group, race, palette);
        case 'market':
            return buildMarket(group, race, palette);
        case 'castle':
            return buildCastle(group, race, palette);
        case 'chapel':
            return buildChapel(group, race, palette);
        case 'grand_cathedral':
            return buildGrandCathedral(group, race, palette);
        case 'tree_of_life':
            return buildTreeOfLife(group, race, palette);
        case 'moonwell':
            return buildMoonwell(group, race, palette);
        case 'ancient_archive':
            return buildAncientArchive(group, race, palette);
        case 'world_tree':
            return buildWorldTree(group, race, palette);
        case 'war_pit':
            return buildWarPit(group, race, palette);
        case 'blood_forge':
            return buildBloodForge(group, race, palette);
        case 'totem':
            return buildTotem(group, race, palette);
        case 'skull_throne':
            return buildSkullThrone(group, race, palette);
        default:
            // Generic box fallback
            var box = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.4, 0.4),
                makeMat(palette.primary)
            );
            box.position.y = 0.2;
            group.add(box);
            return group;
    }
}

// ── Town Center — large hall with peaked roof ──
function buildTownCenter(group, race, palette) {
    // Base/foundation
    var baseGeo = new THREE.BoxGeometry(0.6, 0.08, 0.5);
    var base = new THREE.Mesh(baseGeo, makeMat(0x555555));
    base.position.y = 0.04;
    group.add(base);
    // Main hall
    var wallColor = race === 'orc' ? 0x3F3F3F : race === 'elf' ? 0x8B6914 : 0x94A3B8;
    var hallGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4);
    var hall = new THREE.Mesh(hallGeo, makeMat(wallColor));
    hall.position.y = 0.255;
    group.add(hall);
    // Roof
    var roofColor = race === 'orc' ? 0x8B0000 : race === 'elf' ? 0x2E8B57 : 0x8B4513;
    var roof = createRoof(0.35, 0.2, 0.35, roofColor);
    roof.position.y = 0.53;
    group.add(roof);
    // Banner pole
    var poleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
    var pole = new THREE.Mesh(poleGeo, makeMat(0x8B7355));
    pole.position.set(0.2, 0.58, 0);
    group.add(pole);
    // Banner
    var bannerGeo = new THREE.PlaneGeometry(0.08, 0.12);
    var banner = new THREE.Mesh(bannerGeo, makeMat(palette.accent));
    banner.position.set(0.24, 0.62, 0);
    group.add(banner);
    return group;
}

// ── Farm — flat fields with fence ──
function buildFarm(group, race, palette) {
    // Soil plot
    var soilGeo = new THREE.BoxGeometry(0.6, 0.04, 0.5);
    var soil = new THREE.Mesh(soilGeo, makeMat(0x5C4033));
    soil.position.y = 0.02;
    group.add(soil);
    // Crop rows (green ridges)
    for (var i = -2; i <= 2; i++) {
        var rowGeo = new THREE.BoxGeometry(0.5, 0.06, 0.04);
        var row = new THREE.Mesh(rowGeo, makeMat(0x4CAF50));
        row.position.set(0, 0.07, i * 0.09);
        group.add(row);
    }
    // Small farmhouse
    var houseGeo = new THREE.BoxGeometry(0.12, 0.12, 0.1);
    var houseColor = race === 'elf' ? 0x8B6914 : race === 'orc' ? 0x3F3F3F : 0xA0826D;
    var house = new THREE.Mesh(houseGeo, makeMat(houseColor));
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

// ── Lumber Mill — sawmill with log pile ──
function buildLumberMill(group, race, palette) {
    // Main structure
    var wallColor = race === 'elf' ? 0x8B6914 : 0x6B4226;
    var bodyGeo = new THREE.BoxGeometry(0.3, 0.3, 0.25);
    var body = new THREE.Mesh(bodyGeo, makeMat(wallColor));
    body.position.y = 0.15;
    group.add(body);
    // Pointed roof
    var roofGeo = new THREE.ConeGeometry(0.22, 0.15, 4);
    var roof = new THREE.Mesh(roofGeo, makeMat(0x654321));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.38;
    group.add(roof);
    // Saw blade (flat cylinder)
    var sawGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.01, 8);
    var saw = new THREE.Mesh(sawGeo, makeMat(0xC0C0C0, { metalness: 0.6 }));
    saw.rotation.x = Math.PI / 2;
    saw.position.set(0.18, 0.15, 0);
    group.add(saw);
    // Log pile
    for (var i = 0; i < 3; i++) {
        var logGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 5);
        var log = new THREE.Mesh(logGeo, makeMat(0x8B5E3C));
        log.rotation.z = Math.PI / 2;
        log.position.set(-0.2, 0.05 + i * 0.06, (i - 1) * 0.05);
        group.add(log);
    }
    return group;
}

// ── Quarry — stepped stone pit ──
function buildQuarry(group, race, palette) {
    // Stepped pit
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
    // Crane/derrick
    var poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4);
    var pole = new THREE.Mesh(poleGeo, makeMat(0x654321));
    pole.position.set(0.15, 0.4, 0.15);
    group.add(pole);
    // Arm
    var armGeo = new THREE.BoxGeometry(0.2, 0.015, 0.015);
    var arm = new THREE.Mesh(armGeo, makeMat(0x654321));
    arm.position.set(0.05, 0.57, 0.15);
    group.add(arm);
    return group;
}

// ── Mine — tunnel entrance in rock face ──
function buildMine(group, race, palette) {
    // Rock face
    var rockGeo = new THREE.DodecahedronGeometry(0.22, 0);
    var rock = new THREE.Mesh(rockGeo, makeMat(0x6B6B6B));
    rock.position.y = 0.18;
    rock.scale.set(1.2, 0.8, 0.8);
    group.add(rock);
    // Tunnel entrance (dark box)
    var tunnelGeo = new THREE.BoxGeometry(0.12, 0.15, 0.1);
    var tunnel = new THREE.Mesh(tunnelGeo, makeMat(0x1A1A1A));
    tunnel.position.set(0, 0.1, 0.14);
    group.add(tunnel);
    // Support beams
    for (var side = -1; side <= 1; side += 2) {
        var beamGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
        var beam = new THREE.Mesh(beamGeo, makeMat(0x8B5E3C));
        beam.position.set(side * 0.06, 0.1, 0.19);
        group.add(beam);
    }
    // Top beam
    var topGeo = new THREE.BoxGeometry(0.14, 0.02, 0.02);
    var top = new THREE.Mesh(topGeo, makeMat(0x8B5E3C));
    top.position.set(0, 0.19, 0.19);
    group.add(top);
    // Mine cart
    var cartGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
    var cart = new THREE.Mesh(cartGeo, makeMat(palette.accent, { metalness: 0.4 }));
    cart.position.set(0, 0.04, 0.25);
    group.add(cart);
    return group;
}

// ── Barracks — military building ──
function buildBarracks(group, race, palette) {
    var wallColor = race === 'orc' ? 0x3F3F3F : race === 'elf' ? 0x8B6914 : 0x94A3B8;
    // Main building
    var bodyGeo = new THREE.BoxGeometry(0.45, 0.3, 0.4);
    var body = new THREE.Mesh(bodyGeo, makeMat(wallColor));
    body.position.y = 0.15;
    group.add(body);
    // Roof
    var roofColor = palette.secondary;
    var roofGeo = new THREE.BoxGeometry(0.5, 0.04, 0.45);
    var roof = new THREE.Mesh(roofGeo, makeMat(roofColor));
    roof.position.y = 0.32;
    group.add(roof);
    // Training dummy
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
    // Weapon rack
    for (var i = 0; i < 2; i++) {
        var spear = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, 0.2, 3),
            makeMat(0xA0A0A0, { metalness: 0.5 })
        );
        spear.position.set(-0.28, 0.1, -0.1 + i * 0.1);
        group.add(spear);
    }
    return group;
}

// ── Mage Tower — tall spire with crystal ──
function buildMageTower(group, race, palette) {
    // Base
    var baseGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.15, 6);
    var base = new THREE.Mesh(baseGeo, makeMat(0x555555));
    base.position.y = 0.075;
    group.add(base);
    // Tower body
    var towerGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.5, 6);
    var towerColor = race === 'elf' ? 0x8B6914 : race === 'orc' ? 0x3F3F3F : 0x6B6B8D;
    var tower = new THREE.Mesh(towerGeo, makeMat(towerColor));
    tower.position.y = 0.4;
    group.add(tower);
    // Conical roof
    var roofGeo = new THREE.ConeGeometry(0.15, 0.2, 6);
    var roof = new THREE.Mesh(roofGeo, makeMat(0x4B0082));
    roof.position.y = 0.75;
    group.add(roof);
    // Glowing crystal on top
    var crystalGeo = new THREE.OctahedronGeometry(0.05, 0);
    var crystal = new THREE.Mesh(crystalGeo, makeMat(0xA78BFA, {
        emissive: 0xA78BFA,
        emissiveIntensity: 0.5,
        metalness: 0.3,
    }));
    crystal.position.y = 0.88;
    group.add(crystal);
    return group;
}

// ── Walls — stone wall segment ──
function buildWalls(group, race, palette) {
    var wallColor = race === 'orc' ? 0x3F3F3F : race === 'elf' ? 0x556B2F : palette.primary;
    // Wall segment
    var wallGeo = new THREE.BoxGeometry(0.7, 0.25, 0.08);
    var wall = new THREE.Mesh(wallGeo, makeMat(wallColor));
    wall.position.y = 0.125;
    group.add(wall);
    // Crenellations
    for (var i = -3; i <= 3; i++) {
        if (i % 2 === 0) continue;
        var crenGeo = new THREE.BoxGeometry(0.06, 0.08, 0.08);
        var cren = new THREE.Mesh(crenGeo, makeMat(wallColor));
        cren.position.set(i * 0.08, 0.29, 0);
        group.add(cren);
    }
    return group;
}

// ── Market (Human) — stall with awning ──
function buildMarket(group, race, palette) {
    // Counter
    var counterGeo = new THREE.BoxGeometry(0.4, 0.15, 0.2);
    var counter = new THREE.Mesh(counterGeo, makeMat(0x8B6914));
    counter.position.y = 0.075;
    group.add(counter);
    // Posts
    for (var x = -1; x <= 1; x += 2) {
        var postGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4);
        var post = new THREE.Mesh(postGeo, makeMat(0x654321));
        post.position.set(x * 0.18, 0.325, 0.08);
        group.add(post);
    }
    // Awning
    var awningGeo = new THREE.BoxGeometry(0.45, 0.02, 0.25);
    var awning = new THREE.Mesh(awningGeo, makeMat(0x60A5FA));
    awning.position.set(0, 0.48, 0.02);
    awning.rotation.z = 0.1;
    group.add(awning);
    // Wares (small boxes)
    for (var i = 0; i < 3; i++) {
        var wareGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        var ware = new THREE.Mesh(wareGeo, makeMat(palette.accent));
        ware.position.set(-0.12 + i * 0.12, 0.18, 0);
        group.add(ware);
    }
    return group;
}

// ── Castle (Human) — fortress with towers ──
function buildCastle(group, race, palette) {
    // Main keep
    var keepGeo = new THREE.BoxGeometry(0.4, 0.45, 0.35);
    var keep = new THREE.Mesh(keepGeo, makeMat(0x94A3B8));
    keep.position.y = 0.225;
    group.add(keep);
    // Corner towers
    var corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (var i = 0; i < corners.length; i++) {
        var c = corners[i];
        var towerGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6);
        var tower = new THREE.Mesh(towerGeo, makeMat(0x94A3B8));
        tower.position.set(c[0] * 0.2, 0.275, c[1] * 0.17);
        group.add(tower);
        // Tower cap
        var capGeo = new THREE.ConeGeometry(0.07, 0.1, 6);
        var cap = new THREE.Mesh(capGeo, makeMat(0x60A5FA));
        cap.position.set(c[0] * 0.2, 0.6, c[1] * 0.17);
        group.add(cap);
    }
    // Gate
    var gateGeo = new THREE.BoxGeometry(0.1, 0.15, 0.04);
    var gate = new THREE.Mesh(gateGeo, makeMat(0x3F3F3F));
    gate.position.set(0, 0.08, 0.19);
    group.add(gate);
    return group;
}

// ── Chapel (Human) — small church with cross ──
function buildChapel(group, race, palette) {
    // Body
    var bodyGeo = new THREE.BoxGeometry(0.2, 0.3, 0.25);
    var body = new THREE.Mesh(bodyGeo, makeMat(0xF0F0FF));
    body.position.y = 0.15;
    group.add(body);
    // Steeple
    var steepleGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
    var steeple = new THREE.Mesh(steepleGeo, makeMat(0xE0E0F0));
    steeple.rotation.y = Math.PI / 4;
    steeple.position.y = 0.45;
    group.add(steeple);
    // Cross
    var crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.1, 0.015),
        makeMat(palette.accent)
    );
    crossV.position.y = 0.65;
    group.add(crossV);
    var crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.015, 0.015),
        makeMat(palette.accent)
    );
    crossH.position.y = 0.66;
    group.add(crossH);
    return group;
}

// ── Grand Cathedral (Human) — large ornate church ──
function buildGrandCathedral(group, race, palette) {
    // Nave
    var naveGeo = new THREE.BoxGeometry(0.35, 0.5, 0.5);
    var nave = new THREE.Mesh(naveGeo, makeMat(0xF0F0FF));
    nave.position.y = 0.25;
    group.add(nave);
    // Twin spires
    for (var s = -1; s <= 1; s += 2) {
        var spireGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.6, 6);
        var spire = new THREE.Mesh(spireGeo, makeMat(0xE0E0F0));
        spire.position.set(s * 0.15, 0.55, -0.2);
        group.add(spire);
        var tipGeo = new THREE.ConeGeometry(0.05, 0.2, 6);
        var tip = new THREE.Mesh(tipGeo, makeMat(palette.accent));
        tip.position.set(s * 0.15, 0.95, -0.2);
        group.add(tip);
    }
    // Rose window (disc)
    var windowGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 8);
    var windowMesh = new THREE.Mesh(windowGeo, makeMat(0xA78BFA, {
        emissive: 0xA78BFA,
        emissiveIntensity: 0.3,
    }));
    windowMesh.rotation.x = Math.PI / 2;
    windowMesh.position.set(0, 0.35, 0.26);
    group.add(windowMesh);
    return group;
}

// ── Tree of Life (Elf) — living tree building ──
function buildTreeOfLife(group, race, palette) {
    // Thick trunk
    var trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 6);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x8B6914));
    trunk.position.y = 0.2;
    group.add(trunk);
    // Large canopy
    var canopyGeo = new THREE.IcosahedronGeometry(0.25, 1);
    var canopy = new THREE.Mesh(canopyGeo, makeMat(0x10B981));
    canopy.position.y = 0.55;
    canopy.scale.y = 0.7;
    group.add(canopy);
    // Glowing roots
    for (var i = 0; i < 3; i++) {
        var angle = (i / 3) * Math.PI * 2;
        var rootGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.15, 3);
        var root = new THREE.Mesh(rootGeo, makeMat(0x10B981, {
            emissive: 0x10B981,
            emissiveIntensity: 0.3,
        }));
        root.position.set(Math.cos(angle) * 0.12, 0.05, Math.sin(angle) * 0.12);
        root.rotation.z = Math.cos(angle) * 0.5;
        root.rotation.x = Math.sin(angle) * 0.5;
        group.add(root);
    }
    return group;
}

// ── Moonwell (Elf) — glowing pool ──
function buildMoonwell(group, race, palette) {
    // Stone ring
    var ringGeo = new THREE.TorusGeometry(0.15, 0.03, 6, 8);
    var ring = new THREE.Mesh(ringGeo, makeMat(0xC0C0C0));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);
    // Water surface (glowing)
    var waterGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 8);
    var water = new THREE.Mesh(waterGeo, makeMat(0x87CEEB, {
        emissive: 0xC0C0FF,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.8,
    }));
    water.position.y = 0.06;
    group.add(water);
    // Small pillars
    for (var i = 0; i < 4; i++) {
        var angle = (i / 4) * Math.PI * 2;
        var pillarGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.15, 4);
        var pillar = new THREE.Mesh(pillarGeo, makeMat(0xC0C0C0));
        pillar.position.set(Math.cos(angle) * 0.17, 0.1, Math.sin(angle) * 0.17);
        group.add(pillar);
    }
    return group;
}

// ── Ancient Archive (Elf) — tower of knowledge ──
function buildAncientArchive(group, race, palette) {
    // Main tower
    var towerGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.5, 6);
    var tower = new THREE.Mesh(towerGeo, makeMat(0x8B6914));
    tower.position.y = 0.25;
    group.add(tower);
    // Open book shape on top (two planes)
    for (var side = -1; side <= 1; side += 2) {
        var pageGeo = new THREE.PlaneGeometry(0.1, 0.12);
        var page = new THREE.Mesh(pageGeo, makeMat(0xFAF0E6));
        page.position.set(side * 0.04, 0.55, 0);
        page.rotation.y = side * 0.3;
        group.add(page);
    }
    // Vine wrapping
    var vineGeo = new THREE.TorusGeometry(0.17, 0.01, 4, 8, Math.PI);
    var vine = new THREE.Mesh(vineGeo, makeMat(0x228B22));
    vine.position.y = 0.3;
    group.add(vine);
    return group;
}

// ── World Tree (Elf ultimate) — massive tree ──
function buildWorldTree(group, race, palette) {
    // Massive trunk
    var trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.7, 8);
    var trunk = new THREE.Mesh(trunkGeo, makeMat(0x8B6914));
    trunk.position.y = 0.35;
    group.add(trunk);
    // Multi-layer canopy
    var layers = [
        { r: 0.35, y: 0.8, color: 0x0F5E1E },
        { r: 0.3, y: 1.0, color: 0x10B981 },
        { r: 0.2, y: 1.15, color: 0x2ECC71 },
    ];
    for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        var layerGeo = new THREE.IcosahedronGeometry(l.r, 1);
        var layerMesh = new THREE.Mesh(layerGeo, makeMat(l.color));
        layerMesh.position.y = l.y;
        layerMesh.scale.y = 0.5;
        group.add(layerMesh);
    }
    // Glow particles at base
    var glowGeo = new THREE.SphereGeometry(0.05, 4, 4);
    var glowMat = makeMat(0x10B981, {
        emissive: 0x10B981,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.7,
    });
    for (var g = 0; g < 4; g++) {
        var angle = (g / 4) * Math.PI * 2;
        var glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(Math.cos(angle) * 0.2, 0.08, Math.sin(angle) * 0.2);
        group.add(glow);
    }
    return group;
}

// ── War Pit (Orc) — sunken fighting arena ──
function buildWarPit(group, race, palette) {
    // Outer ring
    var outerGeo = new THREE.TorusGeometry(0.2, 0.06, 4, 8);
    var outer = new THREE.Mesh(outerGeo, makeMat(0x3F3F3F));
    outer.rotation.x = Math.PI / 2;
    outer.position.y = 0.08;
    group.add(outer);
    // Inner pit floor (dark)
    var pitGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 8);
    var pit = new THREE.Mesh(pitGeo, makeMat(0x2A2A2A));
    pit.position.y = 0.02;
    group.add(pit);
    // Spike posts
    for (var i = 0; i < 4; i++) {
        var angle = (i / 4) * Math.PI * 2;
        var spikeGeo = new THREE.ConeGeometry(0.02, 0.2, 4);
        var spike = new THREE.Mesh(spikeGeo, makeMat(0xE8DCC8));
        spike.position.set(Math.cos(angle) * 0.22, 0.18, Math.sin(angle) * 0.22);
        group.add(spike);
    }
    // Skull decoration
    var skullGeo = new THREE.SphereGeometry(0.04, 6, 4);
    var skull = new THREE.Mesh(skullGeo, makeMat(0xE8DCC8));
    skull.position.set(0, 0.22, 0.22);
    skull.scale.y = 0.8;
    group.add(skull);
    return group;
}

// ── Blood Forge (Orc) — smithy with red glow ──
function buildBloodForge(group, race, palette) {
    // Forge body
    var bodyGeo = new THREE.BoxGeometry(0.35, 0.3, 0.3);
    var body = new THREE.Mesh(bodyGeo, makeMat(0x3F3F3F));
    body.position.y = 0.15;
    group.add(body);
    // Chimney
    var chimneyGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 5);
    var chimney = new THREE.Mesh(chimneyGeo, makeMat(0x2A2A2A));
    chimney.position.set(0.1, 0.4, -0.08);
    group.add(chimney);
    // Fire glow
    var fireGeo = new THREE.SphereGeometry(0.06, 4, 4);
    var fire = new THREE.Mesh(fireGeo, makeMat(0xDC2626, {
        emissive: 0xDC2626,
        emissiveIntensity: 0.6,
    }));
    fire.position.set(0, 0.1, 0.18);
    group.add(fire);
    // Anvil
    var anvilGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
    var anvil = new THREE.Mesh(anvilGeo, makeMat(0x555555, { metalness: 0.5 }));
    anvil.position.set(-0.15, 0.06, 0.12);
    group.add(anvil);
    return group;
}

// ── Totem (Orc) — tall carved pole ──
function buildTotem(group, race, palette) {
    // Main pole
    var poleGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.55, 5);
    var pole = new THREE.Mesh(poleGeo, makeMat(0x8B5E3C));
    pole.position.y = 0.275;
    group.add(pole);
    // Face carvings (small boxes stacked)
    var faceColors = [0xDC2626, 0xE8DCC8, 0x3F3F3F];
    for (var i = 0; i < 3; i++) {
        var faceGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        var face = new THREE.Mesh(faceGeo, makeMat(faceColors[i]));
        face.position.set(0, 0.15 + i * 0.12, 0);
        face.rotation.y = i * 0.4;
        group.add(face);
    }
    // Glowing eyes on top face
    for (var side = -1; side <= 1; side += 2) {
        var eyeGeo = new THREE.SphereGeometry(0.015, 4, 4);
        var eye = new THREE.Mesh(eyeGeo, makeMat(0xA78BFA, {
            emissive: 0xA78BFA,
            emissiveIntensity: 0.5,
        }));
        eye.position.set(side * 0.025, 0.42, 0.04);
        group.add(eye);
    }
    return group;
}

// ── Skull Throne (Orc ultimate) — bone/iron seat of power ──
function buildSkullThrone(group, race, palette) {
    // Base platform
    var baseGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 6);
    var base = new THREE.Mesh(baseGeo, makeMat(0x3F3F3F));
    base.position.y = 0.05;
    group.add(base);
    // Throne back
    var backGeo = new THREE.BoxGeometry(0.3, 0.6, 0.08);
    var back = new THREE.Mesh(backGeo, makeMat(0x2A2A2A));
    back.position.set(0, 0.4, -0.12);
    group.add(back);
    // Seat
    var seatGeo = new THREE.BoxGeometry(0.25, 0.06, 0.2);
    var seat = new THREE.Mesh(seatGeo, makeMat(0xDC2626));
    seat.position.set(0, 0.18, 0);
    group.add(seat);
    // Skull ornaments on top
    for (var s = -1; s <= 1; s += 2) {
        var skullGeo = new THREE.SphereGeometry(0.06, 6, 4);
        var skull = new THREE.Mesh(skullGeo, makeMat(0xE8DCC8));
        skull.position.set(s * 0.14, 0.75, -0.12);
        skull.scale.y = 0.8;
        group.add(skull);
    }
    // Spikes
    for (var i = 0; i < 3; i++) {
        var spikeGeo = new THREE.ConeGeometry(0.02, 0.15, 4);
        var spike = new THREE.Mesh(spikeGeo, makeMat(0xE8DCC8));
        spike.position.set(-0.1 + i * 0.1, 0.8, -0.14);
        group.add(spike);
    }
    return group;
}

// ── Unit Models ──

export function createUnitModel(unitType, race) {
    var palette = RACE_PALETTES[race] || RACE_PALETTES.human;

    // Try loading glb first
    var baseType = unitType.replace(/_human$|_elf$|_orc$/, '');
    var model = getModel('unit_' + baseType);
    if (model) {
        tintModel(model, palette);
        return model;
    }

    // Procedural fallback
    return createProceduralUnit(unitType, race, palette);
}

function createProceduralUnit(unitType, race, palette) {
    var group = new THREE.Group();
    var baseType = unitType.replace(/_human$|_elf$|_orc$/, '');

    switch (baseType) {
        case 'worker':
            return buildWorker(group, race, palette);
        case 'warrior':
            return buildWarrior(group, race, palette);
        case 'archer':
            return buildArcher(group, race, palette);
        case 'mage':
            return buildMage(group, race, palette);
        case 'hero':
            return buildHero(group, race, palette);
        default:
            // Generic unit
            var body = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.3, 6),
                makeMat(palette.secondary)
            );
            body.position.y = 0.15;
            group.add(body);
            return group;
    }
}

// ── Worker — small figure with tool ──
function buildWorker(group, race, palette) {
    // Body
    var bodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.18, 5);
    var bodyColor = race === 'orc' ? 0x556B2F : race === 'elf' ? 0x8B6914 : 0x8B7355;
    var body = new THREE.Mesh(bodyGeo, makeMat(bodyColor));
    body.position.y = 0.09;
    group.add(body);
    // Head
    var headGeo = new THREE.SphereGeometry(0.05, 6, 4);
    var skinColor = race === 'orc' ? 0x556B2F : race === 'elf' ? 0xFFDBB5 : 0xF0C8A0;
    var head = new THREE.Mesh(headGeo, makeMat(skinColor));
    head.position.y = 0.23;
    group.add(head);
    // Tool (pickaxe handle)
    var toolGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 3);
    var tool = new THREE.Mesh(toolGeo, makeMat(0x654321));
    tool.position.set(0.08, 0.12, 0);
    tool.rotation.z = -0.5;
    group.add(tool);
    return group;
}

// ── Warrior — armored figure with sword/axe ──
function buildWarrior(group, race, palette) {
    // Torso
    var torsoGeo = new THREE.BoxGeometry(0.14, 0.2, 0.1);
    var armorColor = palette.secondary;
    var torso = new THREE.Mesh(torsoGeo, makeMat(armorColor, { metalness: 0.3 }));
    torso.position.y = 0.13;
    group.add(torso);
    // Legs
    var legGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
    var legs = new THREE.Mesh(legGeo, makeMat(0x4A4A4A));
    legs.position.y = 0.05;
    group.add(legs);
    // Head with helmet
    var headGeo = new THREE.SphereGeometry(0.06, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(armorColor, { metalness: 0.4 }));
    head.position.y = 0.28;
    group.add(head);
    // Helmet crest
    if (race === 'human') {
        var crestGeo = new THREE.BoxGeometry(0.02, 0.06, 0.08);
        var crest = new THREE.Mesh(crestGeo, makeMat(0xDC2626));
        crest.position.y = 0.34;
        group.add(crest);
    }
    // Weapon
    if (race === 'orc') {
        // Axe
        var axeHandle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.2, 3),
            makeMat(0x654321)
        );
        axeHandle.position.set(0.12, 0.15, 0);
        axeHandle.rotation.z = -0.3;
        group.add(axeHandle);
        var axeHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.08, 0.015),
            makeMat(0x808080, { metalness: 0.5 })
        );
        axeHead.position.set(0.15, 0.24, 0);
        group.add(axeHead);
    } else {
        // Sword
        var swordGeo = new THREE.BoxGeometry(0.02, 0.2, 0.01);
        var sword = new THREE.Mesh(swordGeo, makeMat(0xC0C0C0, { metalness: 0.5 }));
        sword.position.set(0.12, 0.18, 0);
        sword.rotation.z = -0.2;
        group.add(sword);
    }
    // Shield
    var shieldGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 6);
    var shield = new THREE.Mesh(shieldGeo, makeMat(palette.primary));
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.1, 0.15, 0);
    group.add(shield);
    return group;
}

// ── Archer — slender figure with bow ──
function buildArcher(group, race, palette) {
    // Slim body
    var bodyGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.22, 5);
    var bodyColor = race === 'elf' ? 0x228B22 : race === 'orc' ? 0x556B2F : 0x8B4513;
    var body = new THREE.Mesh(bodyGeo, makeMat(bodyColor));
    body.position.y = 0.11;
    group.add(body);
    // Head
    var headGeo = new THREE.SphereGeometry(0.05, 6, 4);
    var skinColor = race === 'orc' ? 0x556B2F : race === 'elf' ? 0xFFDBB5 : 0xF0C8A0;
    var head = new THREE.Mesh(headGeo, makeMat(skinColor));
    head.position.y = 0.27;
    group.add(head);
    // Hood/hat
    if (race === 'elf') {
        var hoodGeo = new THREE.ConeGeometry(0.05, 0.06, 4);
        var hood = new THREE.Mesh(hoodGeo, makeMat(0x228B22));
        hood.position.y = 0.33;
        group.add(hood);
    }
    // Bow (torus arc)
    var bowGeo = new THREE.TorusGeometry(0.08, 0.008, 4, 8, Math.PI);
    var bow = new THREE.Mesh(bowGeo, makeMat(0x8B5E3C));
    bow.position.set(-0.08, 0.18, 0);
    bow.rotation.z = Math.PI / 2;
    group.add(bow);
    // Quiver on back
    var quiverGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.12, 4);
    var quiver = new THREE.Mesh(quiverGeo, makeMat(0x654321));
    quiver.position.set(0.04, 0.18, -0.06);
    quiver.rotation.z = 0.2;
    group.add(quiver);
    return group;
}

// ── Mage — robed figure with staff ──
function buildMage(group, race, palette) {
    // Robe (cone shape)
    var robeColor = race === 'orc' ? 0x3F3F3F : race === 'elf' ? 0x2E8B57 : 0x4B0082;
    var robeGeo = new THREE.ConeGeometry(0.1, 0.25, 6);
    var robe = new THREE.Mesh(robeGeo, makeMat(robeColor));
    robe.position.y = 0.125;
    group.add(robe);
    // Head
    var headGeo = new THREE.SphereGeometry(0.055, 6, 4);
    var skinColor = race === 'orc' ? 0x556B2F : 0xFFDBB5;
    var head = new THREE.Mesh(headGeo, makeMat(skinColor));
    head.position.y = 0.3;
    group.add(head);
    // Wizard hat/hood
    var hatGeo = new THREE.ConeGeometry(0.06, 0.12, 4);
    var hat = new THREE.Mesh(hatGeo, makeMat(robeColor));
    hat.position.y = 0.38;
    group.add(hat);
    // Staff
    var staffGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 3);
    var staff = new THREE.Mesh(staffGeo, makeMat(0x654321));
    staff.position.set(0.1, 0.15, 0);
    group.add(staff);
    // Staff crystal
    var crystalGeo = new THREE.OctahedronGeometry(0.03, 0);
    var crystal = new THREE.Mesh(crystalGeo, makeMat(0xA78BFA, {
        emissive: 0xA78BFA,
        emissiveIntensity: 0.5,
    }));
    crystal.position.set(0.1, 0.34, 0);
    group.add(crystal);
    return group;
}

// ── Hero — larger, more ornate figure ──
function buildHero(group, race, palette) {
    // Base scale 1.3x larger than normal units
    // Armored torso
    var torsoGeo = new THREE.BoxGeometry(0.18, 0.25, 0.12);
    var torso = new THREE.Mesh(torsoGeo, makeMat(palette.accent, { metalness: 0.4 }));
    torso.position.y = 0.16;
    group.add(torso);
    // Legs
    var legGeo = new THREE.BoxGeometry(0.16, 0.1, 0.1);
    var legs = new THREE.Mesh(legGeo, makeMat(palette.primary, { metalness: 0.3 }));
    legs.position.y = 0.05;
    group.add(legs);
    // Head
    var headGeo = new THREE.SphereGeometry(0.07, 6, 4);
    var head = new THREE.Mesh(headGeo, makeMat(palette.accent, { metalness: 0.3 }));
    head.position.y = 0.34;
    group.add(head);
    // Crown/horns based on race
    if (race === 'human') {
        // Crown
        var crownGeo = new THREE.TorusGeometry(0.06, 0.015, 4, 6);
        var crown = new THREE.Mesh(crownGeo, makeMat(0xFFD700, { metalness: 0.6 }));
        crown.position.y = 0.39;
        crown.rotation.x = Math.PI / 2;
        group.add(crown);
    } else if (race === 'orc') {
        // Horns
        for (var side = -1; side <= 1; side += 2) {
            var hornGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
            var horn = new THREE.Mesh(hornGeo, makeMat(0xE8DCC8));
            horn.position.set(side * 0.06, 0.4, 0);
            horn.rotation.z = side * 0.4;
            group.add(horn);
        }
    } else {
        // Elf — glowing circlet
        var circletGeo = new THREE.TorusGeometry(0.065, 0.01, 4, 8);
        var circlet = new THREE.Mesh(circletGeo, makeMat(0xC0C0C0, {
            emissive: 0xC0C0FF,
            emissiveIntensity: 0.4,
            metalness: 0.5,
        }));
        circlet.position.y = 0.38;
        circlet.rotation.x = Math.PI / 2;
        group.add(circlet);
    }
    // Cape
    var capeGeo = new THREE.PlaneGeometry(0.16, 0.2);
    var cape = new THREE.Mesh(capeGeo, makeMat(palette.secondary, {
        side: THREE.DoubleSide,
    }));
    cape.position.set(0, 0.18, -0.08);
    cape.rotation.x = 0.15;
    group.add(cape);
    // Weapon — large sword
    var swordGeo = new THREE.BoxGeometry(0.025, 0.28, 0.012);
    var sword = new THREE.Mesh(swordGeo, makeMat(0xE0E0E0, { metalness: 0.6 }));
    sword.position.set(0.14, 0.2, 0);
    sword.rotation.z = -0.15;
    group.add(sword);
    // Hero glow ring
    var glowRingGeo = new THREE.RingGeometry(0.15, 0.2, 16);
    var glowRing = new THREE.Mesh(glowRingGeo, new THREE.MeshBasicMaterial({
        color: palette.accent,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
    }));
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.01;
    group.add(glowRing);
    return group;
}

// ── Helper: tint a loaded model with race palette ──
function tintModel(model, palette) {
    model.traverse(function (child) {
        if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.color.lerp(new THREE.Color(palette.primary), 0.3);
        }
    });
}

// ── Terrain prop placement helper ──
// Returns an array of prop groups to place on a hex
export function createTerrainProps(terrain, seed) {
    var props = [];
    // Seeded pseudo-random for consistent placement
    var rng = mulberry32Simple(seed);

    switch (terrain) {
        case 'forest':
            // 1-2 trees
            var treeCount = rng() > 0.5 ? 2 : 1;
            for (var i = 0; i < treeCount; i++) {
                var treeType = rng();
                var tree;
                if (treeType < 0.4) tree = createTreeOak();
                else if (treeType < 0.7) tree = createTreePine();
                else tree = createTreeWillow();
                // Offset within hex
                var angle = rng() * Math.PI * 2;
                var dist = rng() * 0.3;
                tree.position.x = Math.cos(angle) * dist;
                tree.position.z = Math.sin(angle) * dist;
                tree.scale.multiplyScalar(0.7 + rng() * 0.4);
                tree.rotation.y = rng() * Math.PI * 2;
                props.push(tree);
            }
            break;
        case 'mountain':
            // 1-2 rocks
            var rockCount = rng() > 0.6 ? 2 : 1;
            for (var r = 0; r < rockCount; r++) {
                var rock = rng() > 0.5 ? createRockLarge() : createRockSmall();
                var rAngle = rng() * Math.PI * 2;
                var rDist = rng() * 0.25;
                rock.position.x = Math.cos(rAngle) * rDist;
                rock.position.z = Math.sin(rAngle) * rDist;
                rock.rotation.y = rng() * Math.PI * 2;
                props.push(rock);
            }
            break;
        case 'plains':
            // Occasional grass clump
            if (rng() > 0.6) {
                var grass = createGrassClump();
                grass.position.x = (rng() - 0.5) * 0.5;
                grass.position.z = (rng() - 0.5) * 0.5;
                props.push(grass);
            }
            break;
        case 'desert':
            // Occasional small rock
            if (rng() > 0.75) {
                var desertRock = createRockSmall();
                desertRock.position.x = (rng() - 0.5) * 0.4;
                desertRock.position.z = (rng() - 0.5) * 0.4;
                var sandColor = new THREE.Color(0xD4A574);
                desertRock.traverse(function (child) {
                    if (child.isMesh) {
                        child.material = child.material.clone();
                        child.material.color.lerp(sandColor, 0.4);
                    }
                });
                props.push(desertRock);
            }
            break;
    }

    return props;
}

// Simple seeded RNG (same mulberry32 as hex-grid.js)
function mulberry32Simple(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Idle animation ──
// Call each frame with deltaTime to apply gentle bob to unit groups
export function applyIdleAnimation(group, time, isHero) {
    if (!group) return;
    var bobSpeed = isHero ? 1.5 : 2;
    var bobHeight = isHero ? 0.04 : 0.025;
    group.position.y = group.userData.baseY + Math.sin(time * bobSpeed) * bobHeight;
    // Gentle rotation for heroes
    if (isHero) {
        group.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
}

// ── Loading progress helpers ──
export function getLoadingProgress() {
    return loadingProgress;
}
