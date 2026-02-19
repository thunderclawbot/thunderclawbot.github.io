// animation.js — Tween engine, turn replay, and animation system
// Provides smooth tweening, action queue replay, camera follow, and visual effects.

import * as THREE from 'three';
import { axialToWorld, HEX_SIZE } from './hex-grid.js';

// ── Replay speed multiplier (1 = normal, 2 = fast, 0 = skip) ──
var _speedMultiplier = 1;
var _skipRequested = false;

export function setReplaySpeed(speed) {
    _speedMultiplier = speed;
}

export function getReplaySpeed() {
    return _speedMultiplier;
}

export function requestSkip() {
    _skipRequested = true;
}

// ── Minimal tween engine ──
// Tweens a value from 0..1 over `durationMs` calling `onUpdate(t)` each frame.
// Returns a promise that resolves when done.

function tween(durationMs, onUpdate, easing) {
    if (!easing) easing = easeInOutCubic;
    var effectiveDuration = _skipRequested ? 0 : durationMs / Math.max(0.25, _speedMultiplier);
    if (effectiveDuration <= 0) {
        onUpdate(1);
        return Promise.resolve();
    }
    return new Promise(function (resolve) {
        var start = performance.now();
        function tick() {
            var now = performance.now();
            var elapsed = now - start;
            if (_skipRequested) {
                onUpdate(1);
                resolve();
                return;
            }
            var t = Math.min(1, elapsed / effectiveDuration);
            onUpdate(easing(t));
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(tick);
    });
}

// Easing functions
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

// ── Delay helper ──
export function delay(ms) {
    if (_skipRequested) return Promise.resolve();
    var effectiveMs = ms / Math.max(0.25, _speedMultiplier);
    return new Promise(function (resolve) {
        setTimeout(resolve, effectiveMs);
    });
}

// ── Camera pan to a world position ──
// Smoothly moves the OrbitControls target (and camera offset) to center on pos.
export function panCameraTo(controls, camera, targetX, targetZ, durationMs) {
    if (!controls || !camera) return Promise.resolve();
    if (!durationMs) durationMs = 400;

    var startTarget = controls.target.clone();
    var startCam = camera.position.clone();
    var offset = new THREE.Vector3().subVectors(startCam, startTarget);

    var endTarget = new THREE.Vector3(targetX, startTarget.y, targetZ);
    var endCam = new THREE.Vector3(targetX + offset.x, startCam.y, targetZ + offset.z);

    return tween(durationMs, function (t) {
        controls.target.lerpVectors(startTarget, endTarget, t);
        camera.position.lerpVectors(startCam, endCam, t);
    });
}

// ── Pan camera to hex coordinates ──
export function panCameraToHex(controls, camera, q, r, durationMs) {
    var pos = axialToWorld(q, r);
    return panCameraTo(controls, camera, pos.x, pos.z, durationMs);
}

// ── Unit movement animation: smooth lerp between hexes ──
// Moves a mesh from its current position to the target hex over 0.2s per hex.
export function animateUnitMove(mesh, fromQ, fromR, toQ, toR, durationPerHex) {
    if (!mesh) return Promise.resolve();
    if (!durationPerHex) durationPerHex = 200;

    var from = axialToWorld(fromQ, fromR);
    var to = axialToWorld(toQ, toR);
    var baseY = mesh.userData ? mesh.userData.baseY || mesh.position.y : mesh.position.y;

    // Small hop during movement
    var hopHeight = 0.15;

    return tween(durationPerHex, function (t) {
        mesh.position.x = from.x + (to.x - from.x) * t;
        mesh.position.z = from.z + (to.z - from.z) * t;
        // Arc hop
        var hop = Math.sin(t * Math.PI) * hopHeight;
        mesh.position.y = baseY + hop;
    });
}

// ── Combat animation: attacker lunges toward target ──
export function animateCombatLunge(attackerMesh, defenderMesh, durationMs) {
    if (!attackerMesh || !defenderMesh) return Promise.resolve();
    if (!durationMs) durationMs = 300;

    var startPos = attackerMesh.position.clone();
    var targetPos = defenderMesh.position.clone();
    // Lunge partway toward defender (60%)
    var lungeTarget = new THREE.Vector3().lerpVectors(startPos, targetPos, 0.6);

    // Phase 1: lunge forward
    return tween(durationMs * 0.5, function (t) {
        attackerMesh.position.lerpVectors(startPos, lungeTarget, t);
    }).then(function () {
        // Phase 2: return
        return tween(durationMs * 0.5, function (t) {
            attackerMesh.position.lerpVectors(lungeTarget, startPos, t);
        });
    });
}

// ── Screen shake effect ──
export function screenShake(camera, intensity, durationMs) {
    if (!camera) return Promise.resolve();
    if (!intensity) intensity = 0.15;
    if (!durationMs) durationMs = 200;

    var originalPos = camera.position.clone();

    return tween(durationMs, function (t) {
        var decay = 1 - t;
        var shakeX = (Math.random() - 0.5) * 2 * intensity * decay;
        var shakeY = (Math.random() - 0.5) * 2 * intensity * decay;
        camera.position.x = originalPos.x + shakeX;
        camera.position.y = originalPos.y + shakeY;
    }).then(function () {
        camera.position.copy(originalPos);
    });
}

// ── Defeated unit: shrink and fade out ──
export function animateUnitDefeat(mesh, scene, durationMs) {
    if (!mesh) return Promise.resolve();
    if (!durationMs) durationMs = 600;

    var startScale = mesh.scale.clone();

    // Make materials transparent
    function setTransparent(obj) {
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(function (m) { m.transparent = true; });
            } else {
                obj.material.transparent = true;
            }
        }
        if (obj.children) {
            obj.children.forEach(setTransparent);
        }
    }
    setTransparent(mesh);

    return tween(durationMs, function (t) {
        var s = 1 - t;
        mesh.scale.set(startScale.x * s, startScale.y * s, startScale.z * s);
        // Fade opacity
        function setOpacity(obj) {
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(function (m) { m.opacity = 1 - t; });
                } else {
                    obj.material.opacity = 1 - t;
                }
            }
            if (obj.children) {
                obj.children.forEach(setOpacity);
            }
        }
        setOpacity(mesh);
    }).then(function () {
        if (scene) scene.remove(mesh);
    });
}

// ── Building complete: scale bounce + particle burst ──
export function animateBuildingComplete(mesh, scene, durationMs) {
    if (!mesh) return Promise.resolve();
    if (!durationMs) durationMs = 400;

    var baseScale = mesh.scale.clone();
    var bounceMax = 1.2;

    // Scale bounce: 1.0 → 1.2 → 1.0
    return tween(durationMs, function (t) {
        var bounce;
        if (t < 0.4) {
            // Scale up
            bounce = 1 + (bounceMax - 1) * (t / 0.4);
        } else {
            // Scale back down
            bounce = bounceMax - (bounceMax - 1) * ((t - 0.4) / 0.6);
        }
        mesh.scale.set(baseScale.x * bounce, baseScale.y * bounce, baseScale.z * bounce);
    }, easeOutBack).then(function () {
        mesh.scale.copy(baseScale);
        // Spawn particle burst
        if (scene) {
            spawnParticleBurst(scene, mesh.position, 8, 0xfbbf24);
        }
    });
}

// ── Particle burst helper ──
function spawnParticleBurst(scene, position, count, color) {
    if (!count) count = 8;
    if (!color) color = 0xfbbf24;

    var particles = [];
    for (var i = 0; i < count; i++) {
        var mat = new THREE.SpriteMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 1,
        });
        var sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.12, 0.12, 0.12);
        sprite.position.copy(position);
        scene.add(sprite);

        var angle = (i / count) * Math.PI * 2;
        var speed = 0.8 + Math.random() * 0.4;
        particles.push({
            sprite: sprite,
            vx: Math.cos(angle) * speed,
            vy: 0.5 + Math.random() * 0.5,
            vz: Math.sin(angle) * speed,
        });
    }

    // Animate particles over 300ms
    tween(300, function (t) {
        for (var p = 0; p < particles.length; p++) {
            var part = particles[p];
            part.sprite.position.x = position.x + part.vx * t;
            part.sprite.position.y = position.y + part.vy * t;
            part.sprite.position.z = position.z + part.vz * t;
            part.sprite.material.opacity = 1 - t;
        }
    }).then(function () {
        for (var p = 0; p < particles.length; p++) {
            scene.remove(particles[p].sprite);
            particles[p].sprite.material.dispose();
        }
    });
}

// ── Floating resource number (+N) rising from buildings ──
// Creates a DOM overlay element that rises and fades.
export function spawnFloatingNumber(text, worldPos, camera, color) {
    if (!camera || !worldPos) return;
    if (!color) color = '#fbbf24';

    var el = document.createElement('div');
    el.className = 'floating-number';
    el.textContent = text;
    el.style.color = color;
    document.body.appendChild(el);

    // Project world position to screen
    var vec = new THREE.Vector3(worldPos.x, worldPos.y + 0.5, worldPos.z);

    var startTime = performance.now();
    var duration = 1200 / Math.max(0.25, _speedMultiplier);
    if (_skipRequested) duration = 0;

    function updatePosition() {
        var elapsed = performance.now() - startTime;
        var t = Math.min(1, elapsed / Math.max(1, duration));

        vec.set(worldPos.x, worldPos.y + 0.5 + t * 1.0, worldPos.z);
        var projected = vec.clone().project(camera);
        var x = (projected.x * 0.5 + 0.5) * window.innerWidth;
        var y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.opacity = String(1 - t);

        if (t < 1 && !_skipRequested) {
            requestAnimationFrame(updatePosition);
        } else {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
    }

    if (duration > 0) {
        requestAnimationFrame(updatePosition);
    } else {
        if (el.parentNode) el.parentNode.removeChild(el);
    }
}

// ── Storyteller event: screen dim + card slide ──
export function animateStorytellerEvent(durationMs) {
    if (!durationMs) durationMs = 1500;

    var dimOverlay = document.getElementById('anim-screen-dim');
    if (!dimOverlay) return Promise.resolve();

    // Show dim
    dimOverlay.classList.add('visible');

    return delay(durationMs).then(function () {
        dimOverlay.classList.remove('visible');
    });
}

// ── "Enemy is thinking..." overlay ──
export function showEnemyThinking() {
    var el = document.getElementById('anim-enemy-thinking');
    if (el) el.classList.add('visible');
}

export function hideEnemyThinking() {
    var el = document.getElementById('anim-enemy-thinking');
    if (el) el.classList.remove('visible');
}

// ── Speed control UI ──
export function initSpeedControls() {
    var speedBtns = document.querySelectorAll('.anim-speed-btn');
    speedBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            speedBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var speed = parseFloat(btn.getAttribute('data-speed'));
            if (speed === 0) {
                requestSkip();
            } else {
                _speedMultiplier = speed;
            }
        });
    });

    // Spacebar skip
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && _isReplaying) {
            e.preventDefault();
            requestSkip();
        }
    });
}

// ── Replay state ──
var _isReplaying = false;

export function isReplaying() {
    return _isReplaying;
}

// ── Turn replay: plays events sequentially with camera following ──
// events: array of { type, q, r, data }
// ctx: { controls, camera, scene, ... } — dependencies
export async function playTurnAnimations(events, ctx) {
    if (!events || events.length === 0) return;

    _isReplaying = true;
    _skipRequested = false;

    // Show speed controls
    var speedBar = document.getElementById('anim-speed-bar');
    if (speedBar) speedBar.classList.add('visible');

    for (var i = 0; i < events.length; i++) {
        if (_skipRequested) break;

        var event = events[i];

        // Pan camera to event location
        if (event.q !== undefined && event.r !== undefined) {
            await panCameraToHex(ctx.controls, ctx.camera, event.q, event.r, 300);
        }

        // Play animation based on type
        switch (event.type) {
            case 'unit_move':
                if (event.mesh) {
                    await animateUnitMove(event.mesh, event.fromQ, event.fromR, event.q, event.r, 200);
                }
                break;

            case 'combat':
                if (event.attackerMesh && event.defenderMesh) {
                    await animateCombatLunge(event.attackerMesh, event.defenderMesh, 300);
                    await screenShake(ctx.camera, 0.12, 150);
                }
                if (event.defeatedMesh) {
                    await animateUnitDefeat(event.defeatedMesh, ctx.scene, 500);
                }
                break;

            case 'building_complete':
                if (event.mesh) {
                    await animateBuildingComplete(event.mesh, ctx.scene, 400);
                }
                break;

            case 'resource_gather':
                // Floating numbers — fire and forget, no await needed
                if (event.gathered && ctx.camera) {
                    for (var res in event.gathered) {
                        if (event.gathered[res] > 0 && event.worldPos) {
                            spawnFloatingNumber('+' + event.gathered[res], event.worldPos, ctx.camera, event.color || '#fbbf24');
                        }
                    }
                }
                break;

            case 'storyteller_event':
                await animateStorytellerEvent(1200);
                break;

            case 'ai_action':
                // Generic AI action — just show briefly
                break;
        }

        // Brief pause between actions
        await delay(300);
    }

    // Hide speed controls
    if (speedBar) speedBar.classList.remove('visible');

    _isReplaying = false;
    _skipRequested = false;
}

// Reset replay state (call at start of each turn)
export function resetReplayState() {
    _skipRequested = false;
    _isReplaying = false;
    _speedMultiplier = 1;
}
