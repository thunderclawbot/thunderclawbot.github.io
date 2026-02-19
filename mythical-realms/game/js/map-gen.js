// map-gen.js — Procedural map generation with biomes, rivers, resources, and balanced spawns
// Uses simplex-like noise for elevation + moisture, then assigns biomes.
// Reference: redblobgames.com/maps/terrain-from-noise/

// ── Seeded PRNG (mulberry32) ──
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Gradient noise (2D) ──
// Simplified gradient noise with smooth interpolation, multiple octaves for detail.
function createGradientNoise(seed) {
    var rng = mulberry32(seed);
    var SIZE = 512;
    var perm = new Uint8Array(SIZE * 2);
    var grads = new Float32Array(SIZE * 2);
    for (var i = 0; i < SIZE; i++) {
        perm[i] = i;
        var angle = rng() * Math.PI * 2;
        grads[i * 2] = Math.cos(angle);
        grads[i * 2 + 1] = Math.sin(angle);
    }
    // Shuffle permutation
    for (var i = SIZE - 1; i > 0; i--) {
        var j = (rng() * (i + 1)) | 0;
        var tmp = perm[i];
        perm[i] = perm[j];
        perm[j] = tmp;
    }
    // Double the permutation table
    for (var i = 0; i < SIZE; i++) {
        perm[SIZE + i] = perm[i];
    }

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function dot(gi, x, y) {
        return grads[gi * 2] * x + grads[gi * 2 + 1] * y;
    }

    function noise2d(x, y) {
        var X = Math.floor(x) & (SIZE - 1);
        var Y = Math.floor(y) & (SIZE - 1);
        var xf = x - Math.floor(x);
        var yf = y - Math.floor(y);
        var u = fade(xf);
        var v = fade(yf);

        var aa = perm[perm[X] + Y];
        var ab = perm[perm[X] + Y + 1];
        var ba = perm[perm[X + 1] + Y];
        var bb = perm[perm[X + 1] + Y + 1];

        var x1 = lerp(dot(aa, xf, yf), dot(ba, xf - 1, yf), u);
        var x2 = lerp(dot(ab, xf, yf - 1), dot(bb, xf - 1, yf - 1), u);

        return lerp(x1, x2, v);
    }

    // Fractal Brownian motion — multi-octave noise
    return function fbm(x, y, octaves, lacunarity, gain) {
        if (octaves === undefined) octaves = 4;
        if (lacunarity === undefined) lacunarity = 2.0;
        if (gain === undefined) gain = 0.5;
        var sum = 0;
        var amp = 1;
        var freq = 1;
        var maxAmp = 0;
        for (var i = 0; i < octaves; i++) {
            sum += noise2d(x * freq, y * freq) * amp;
            maxAmp += amp;
            amp *= gain;
            freq *= lacunarity;
        }
        return sum / maxAmp; // normalized to roughly [-1, 1]
    };
}

// ── Map size presets ──
export var MAP_SIZES = {
    small:  { label: 'Small',  size: 15 },
    medium: { label: 'Medium', size: 25 },
    large:  { label: 'Large',  size: 35 },
};

// ── Biome assignment from elevation + moisture ──
// Returns terrain type string
function assignBiome(elevation, moisture) {
    if (elevation < -0.05) return 'water';
    if (elevation < 0.02) return 'swamp';
    if (elevation > 0.55) return 'mountain';

    // Mid-to-low elevations
    if (elevation < 0.25) {
        // Low elevation
        if (moisture > 0.3) return 'swamp';
        if (moisture > 0.0) return 'plains';
        return 'desert';
    }

    // Mid elevation
    if (moisture > 0.2) return 'forest';
    if (moisture > -0.1) return 'plains';
    return 'desert';
}

// ── Distance from center (used for continent shaping) ──
function distFromCenter(q, r, gridSize) {
    var cx = gridSize / 2;
    var cy = gridSize / 2;
    var dx = (q - cx) / (gridSize / 2);
    var dy = (r - cy) / (gridSize / 2);
    return Math.sqrt(dx * dx + dy * dy);
}

// ── Generate map ──
// Returns { hexes, playerSpawn, aiSpawn, seed, gridSize }
// hexes is a Map of "q,r" -> { q, r, terrain, elevation, moisture, resource, river }
export function generateMap(gridSize, seed) {
    if (seed === undefined || seed === null) {
        seed = (Math.random() * 2147483647) | 0;
    }
    seed = seed | 0; // ensure integer

    var rng = mulberry32(seed);

    // Create noise functions with different seeds
    var elevNoise = createGradientNoise(seed);
    var moistNoise = createGradientNoise(seed + 31337);
    var continentNoise = createGradientNoise(seed + 77777);

    var hexes = new Map();
    var elevationMap = new Map();

    var elevScale = 0.08;
    var moistScale = 0.1;
    var contScale = 0.04;

    // Pass 1: Generate elevation + moisture, assign biomes
    for (var q = 0; q < gridSize; q++) {
        for (var r = 0; r < gridSize; r++) {
            var key = q + ',' + r;

            // Continent shape — large-scale noise + radial falloff
            var contVal = continentNoise(q * contScale, r * contScale, 2, 2.0, 0.5);
            var dist = distFromCenter(q, r, gridSize);
            // Island/continent mask: edges are ocean
            var edgeFalloff = 1.0 - Math.pow(Math.min(dist, 1.0), 2) * 1.4;

            // Elevation: detail noise + continent shape
            var rawElev = elevNoise(q * elevScale, r * elevScale, 4, 2.0, 0.5);
            var elevation = rawElev * 0.6 + contVal * 0.4 + edgeFalloff * 0.3 - 0.15;

            // Moisture: independent noise
            var moisture = moistNoise(q * moistScale, r * moistScale, 3, 2.0, 0.5);

            var terrain = assignBiome(elevation, moisture);

            elevationMap.set(key, elevation);

            hexes.set(key, {
                q: q,
                r: r,
                terrain: terrain,
                elevation: elevation,
                moisture: moisture,
                resource: null,
                river: false,
                building: null,
                unit: null,
                explored: false,
            });
        }
    }

    // Pass 2: Ensure coastline coherence — remove isolated water/land
    smoothCoastlines(hexes, gridSize);

    // Pass 3: Rivers — trace from high elevation to water
    generateRivers(hexes, gridSize, rng, elevationMap);

    // Pass 4: Strategic resources
    placeResources(hexes, gridSize, rng);

    // Pass 5: Balanced spawn points
    var spawns = findBalancedSpawns(hexes, gridSize);

    return {
        hexes: hexes,
        playerSpawn: spawns.player,
        aiSpawn: spawns.ai,
        seed: seed,
        gridSize: gridSize,
    };
}

// ── Hex neighbors (axial coordinates) ──
var NEIGHBOR_DIRS = [
    { dq: 1, dr: 0 }, { dq: -1, dr: 0 },
    { dq: 0, dr: 1 }, { dq: 0, dr: -1 },
    { dq: 1, dr: -1 }, { dq: -1, dr: 1 },
];

function getNeighbors(q, r) {
    var out = [];
    for (var i = 0; i < NEIGHBOR_DIRS.length; i++) {
        out.push({ q: q + NEIGHBOR_DIRS[i].dq, r: r + NEIGHBOR_DIRS[i].dr });
    }
    return out;
}

// ── Smooth coastlines — remove tiny isolated patches ──
function smoothCoastlines(hexes, gridSize) {
    var changes = [];
    hexes.forEach(function (hex, key) {
        var neighbors = getNeighbors(hex.q, hex.r);
        var sameCount = 0;
        var total = 0;
        var isWater = hex.terrain === 'water';

        for (var i = 0; i < neighbors.length; i++) {
            var nk = neighbors[i].q + ',' + neighbors[i].r;
            var nh = hexes.get(nk);
            if (!nh) continue;
            total++;
            if ((nh.terrain === 'water') === isWater) sameCount++;
        }

        // If hex is completely surrounded by opposite type, flip it
        if (total > 0 && sameCount === 0) {
            if (isWater) {
                changes.push({ key: key, terrain: 'plains' });
            } else {
                changes.push({ key: key, terrain: 'water' });
            }
        }
    });

    for (var i = 0; i < changes.length; i++) {
        var h = hexes.get(changes[i].key);
        if (h) {
            h.terrain = changes[i].terrain;
            if (changes[i].terrain === 'water') h.elevation = -0.1;
        }
    }
}

// ── River generation ──
// Start from high-elevation hexes, flow downhill to water
function generateRivers(hexes, gridSize, rng, elevationMap) {
    // Find mountain/high hexes as river sources
    var sources = [];
    hexes.forEach(function (hex) {
        if (hex.terrain === 'mountain' && hex.elevation > 0.5) {
            sources.push(hex);
        }
    });

    // Sort by elevation descending, pick a few
    sources.sort(function (a, b) { return b.elevation - a.elevation; });
    var numRivers = Math.max(2, Math.min(sources.length, Math.floor(gridSize / 5)));

    for (var ri = 0; ri < numRivers; ri++) {
        var current = sources[ri];
        if (!current) break;

        var visited = new Set();
        var maxSteps = gridSize * 2;

        for (var step = 0; step < maxSteps; step++) {
            var key = current.q + ',' + current.r;
            if (visited.has(key)) break;
            visited.add(key);

            if (current.terrain === 'water') break;

            // Mark as river (don't change mountain terrain)
            if (current.terrain !== 'mountain') {
                current.river = true;
            }

            // Find lowest neighbor
            var neighbors = getNeighbors(current.q, current.r);
            var lowestElev = current.elevation;
            var lowestHex = null;

            for (var ni = 0; ni < neighbors.length; ni++) {
                var nk = neighbors[ni].q + ',' + neighbors[ni].r;
                var nh = hexes.get(nk);
                if (!nh) continue;
                if (visited.has(nk)) continue;
                if (nh.elevation < lowestElev) {
                    lowestElev = nh.elevation;
                    lowestHex = nh;
                }
            }

            if (!lowestHex) {
                // No downhill neighbor — try any unvisited neighbor with slight randomness
                var fallback = [];
                for (var ni = 0; ni < neighbors.length; ni++) {
                    var nk = neighbors[ni].q + ',' + neighbors[ni].r;
                    var nh = hexes.get(nk);
                    if (!nh || visited.has(nk)) continue;
                    fallback.push(nh);
                }
                if (fallback.length === 0) break;
                lowestHex = fallback[(rng() * fallback.length) | 0];
            }

            current = lowestHex;
        }
    }
}

// ── Resource types and placement ──
var STRATEGIC_RESOURCES = [
    { type: 'iron',          terrain: ['mountain', 'plains'], rarity: 0.06 },
    { type: 'crystal',       terrain: ['mountain', 'forest'], rarity: 0.04 },
    { type: 'fertile_soil',  terrain: ['plains', 'swamp'],    rarity: 0.08 },
    { type: 'gold_vein',     terrain: ['mountain', 'desert'], rarity: 0.05 },
    { type: 'mana_spring',   terrain: ['forest', 'swamp'],    rarity: 0.03 },
];

function placeResources(hexes, gridSize, rng) {
    // Collect land hexes by terrain
    var landHexes = [];
    hexes.forEach(function (hex) {
        if (hex.terrain !== 'water') {
            landHexes.push(hex);
        }
    });

    for (var ri = 0; ri < STRATEGIC_RESOURCES.length; ri++) {
        var resDef = STRATEGIC_RESOURCES[ri];
        var candidates = landHexes.filter(function (h) {
            return resDef.terrain.indexOf(h.terrain) !== -1 && !h.resource;
        });

        var numToPlace = Math.max(1, Math.floor(candidates.length * resDef.rarity));

        // Shuffle candidates
        for (var i = candidates.length - 1; i > 0; i--) {
            var j = (rng() * (i + 1)) | 0;
            var tmp = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = tmp;
        }

        for (var i = 0; i < numToPlace && i < candidates.length; i++) {
            candidates[i].resource = resDef.type;
        }
    }
}

// ── Balanced spawn finding ──
// Find two land positions with:
// 1. Maximum distance from each other
// 2. Adequate land and resources nearby
// 3. Roughly equal resource access
function findBalancedSpawns(hexes, gridSize) {
    // Collect valid spawn candidates (land hexes not on edges, not water/mountain)
    var candidates = [];
    var margin = Math.max(2, Math.floor(gridSize * 0.15));
    hexes.forEach(function (hex) {
        if (hex.q < margin || hex.q >= gridSize - margin) return;
        if (hex.r < margin || hex.r >= gridSize - margin) return;
        if (hex.terrain === 'water' || hex.terrain === 'mountain') return;

        // Must have at least 3 buildable neighbors
        var neighbors = getNeighbors(hex.q, hex.r);
        var buildable = 0;
        for (var i = 0; i < neighbors.length; i++) {
            var nk = neighbors[i].q + ',' + neighbors[i].r;
            var nh = hexes.get(nk);
            if (nh && nh.terrain !== 'water' && nh.terrain !== 'mountain') buildable++;
        }
        if (buildable < 3) return;

        candidates.push(hex);
    });

    if (candidates.length < 2) {
        // Fallback: just use center-ish positions
        var c = Math.floor(gridSize / 2);
        return {
            player: { q: Math.floor(c / 2), r: Math.floor(c / 2) },
            ai: { q: gridSize - Math.floor(c / 2), r: gridSize - Math.floor(c / 2) },
        };
    }

    // Score each candidate by nearby resources (within radius 4)
    function scoreSpawn(hex) {
        var score = 0;
        for (var dq = -4; dq <= 4; dq++) {
            for (var dr = -4; dr <= 4; dr++) {
                var nk = (hex.q + dq) + ',' + (hex.r + dr);
                var nh = hexes.get(nk);
                if (!nh) continue;
                if (nh.terrain === 'water') continue;
                score += 1; // land hex nearby
                if (nh.resource) score += 3;
                if (nh.terrain === 'plains') score += 0.5;
                if (nh.terrain === 'forest') score += 0.5;
                if (nh.river) score += 1;
            }
        }
        return score;
    }

    // Score all candidates
    for (var i = 0; i < candidates.length; i++) {
        candidates[i]._spawnScore = scoreSpawn(candidates[i]);
    }

    // Find the best pair: maximize distance while keeping scores balanced
    var bestPair = null;
    var bestScore = -Infinity;

    // Sample pairs for performance (don't check all O(n^2))
    var maxSamples = Math.min(candidates.length, 80);
    // Sort by score descending and take top candidates
    candidates.sort(function (a, b) { return b._spawnScore - a._spawnScore; });
    var topCandidates = candidates.slice(0, maxSamples);

    for (var i = 0; i < topCandidates.length; i++) {
        for (var j = i + 1; j < topCandidates.length; j++) {
            var a = topCandidates[i];
            var b = topCandidates[j];

            var dq = a.q - b.q;
            var dr = a.r - b.r;
            var dist = Math.sqrt(dq * dq + dr * dr);

            // Want distance to be at least 40% of gridSize
            if (dist < gridSize * 0.4) continue;

            var scoreDiff = Math.abs(a._spawnScore - b._spawnScore);
            // Combined score: high distance + low score difference + high total score
            var pairScore = dist * 2 - scoreDiff * 0.5 + (a._spawnScore + b._spawnScore) * 0.1;

            if (pairScore > bestScore) {
                bestScore = pairScore;
                bestPair = [a, b];
            }
        }
    }

    if (!bestPair) {
        // Fallback — take first and last in candidate list
        bestPair = [topCandidates[0], topCandidates[topCandidates.length - 1]];
    }

    // Assign player to the spawn closer to top-left, AI to bottom-right
    var p0 = bestPair[0];
    var p1 = bestPair[1];
    if (p0.q + p0.r > p1.q + p1.r) {
        var tmp = p0;
        p0 = p1;
        p1 = tmp;
    }

    return {
        player: { q: p0.q, r: p0.r },
        ai: { q: p1.q, r: p1.r },
    };
}

// ── Seed display helpers ──
export function seedToString(seed) {
    // Convert integer seed to a readable hex string
    return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function stringToSeed(str) {
    var val = parseInt(str, 16);
    if (isNaN(val)) return null;
    return val | 0;
}

export { STRATEGIC_RESOURCES };
