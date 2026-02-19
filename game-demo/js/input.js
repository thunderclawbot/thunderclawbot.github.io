// input.js — Hex selection via raycasting
// Click/tap to select, hover for highlight, info overlay
// Touch: long-press for tooltip, double-tap to center

import * as THREE from 'three';
import { TERRAIN } from './hex-grid.js';
import { BUILDING_TYPES } from './buildings.js';
import { UNIT_TYPES } from './units.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Colors
const HOVER_EMISSIVE = 0x333333;
const SELECT_EMISSIVE = 0xfbbf24;

export function setupInput(camera, hexMeshes, hexData, callbacks) {
    let hoveredMesh = null;
    let selectedKey = null;
    let visibleHexSet = new Set(); // Track which hexes are currently visible (not fogged)

    const meshArray = Array.from(hexMeshes.values());
    const overlay = document.getElementById('hex-info');
    const touchTooltip = document.getElementById('touch-tooltip');

    const onSelect = callbacks && callbacks.onSelect;
    const getGameState = callbacks && callbacks.getGameState;
    const onDoubleTap = callbacks && callbacks.onDoubleTap;

    function getIntersected(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshArray, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }

    function getIntersectedFromXY(clientX, clientY) {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshArray, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }

    function clearHover() {
        if (hoveredMesh && hoveredMesh.userData.key !== selectedKey) {
            hoveredMesh.material = hoveredMesh._originalMaterial || hoveredMesh.material;
            if (hoveredMesh._hoverMaterial) {
                hoveredMesh._hoverMaterial.dispose();
                hoveredMesh._hoverMaterial = null;
            }
        }
        hoveredMesh = null;
    }

    function setHover(mesh) {
        if (mesh.userData.key === selectedKey) return;
        // Don't hover on fogged hexes
        if (!visibleHexSet.has(mesh.userData.key)) return;
        if (!mesh._originalMaterial) {
            mesh._originalMaterial = mesh.material;
        }
        const hoverMat = mesh.material.clone();
        hoverMat.emissive = new THREE.Color(HOVER_EMISSIVE);
        mesh._hoverMaterial = hoverMat;
        mesh.material = hoverMat;
        hoveredMesh = mesh;
    }

    function updateOverlay(key) {
        if (!key) {
            overlay.classList.remove('visible');
            return;
        }
        // Don't show info for fogged hexes
        if (!visibleHexSet.has(key)) {
            overlay.classList.remove('visible');
            return;
        }
        const data = hexData.get(key);
        if (!data) return;

        const terrain = TERRAIN[data.terrain];
        let terrainLabel = terrain ? terrain.name : data.terrain;
        if (data.river) terrainLabel += ' (River)';
        let html = '<div class="hex-coord">Hex (' + data.q + ', ' + data.r + ')</div>' +
            '<div class="hex-terrain">' + terrainLabel + '</div>';

        if (data.resource) {
            const resLabels = { iron: 'Iron', crystal: 'Crystal', fertile_soil: 'Fertile Soil', gold_vein: 'Gold Vein', mana_spring: 'Mana Spring' };
            html += '<div class="hex-building" style="color:#a78bfa">Resource: ' + (resLabels[data.resource] || data.resource) + '</div>';
        }

        if (data.building) {
            const def = BUILDING_TYPES[data.building.type];
            const level = data.building.level || 1;
            const levelStr = level > 1 ? ' Lv.' + level : '';
            const status = data.building.turnsRemaining > 0
                ? ' (building: ' + data.building.turnsRemaining + ' turns)'
                : '';
            html += '<div class="hex-building">' + def.name + levelStr + status + '</div>';
        }

        if (data.improvement) {
            if (data.improvement.turnsRemaining > 0) {
                html += '<div class="hex-building">Improving: ' + data.improvement.turnsRemaining + ' turns left</div>';
            } else {
                html += '<div class="hex-building">Improved</div>';
            }
        }

        // Show unit info
        var gs = getGameState ? getGameState() : null;
        if (gs && gs.units) {
            for (var i = 0; i < gs.units.length; i++) {
                var u = gs.units[i];
                if (u.q === data.q && u.r === data.r) {
                    var uDef = UNIT_TYPES[u.type];
                    if (uDef) {
                        var unitInfo = uDef.name;
                        if (u.turnsToReady > 0) {
                            unitInfo += ' (training: ' + u.turnsToReady + ' turns)';
                        } else {
                            unitInfo += ' — HP:' + u.hp + '/' + u.maxHp;
                            unitInfo += ' Moves:' + u.movesLeft;
                        }
                        html += '<div class="hex-unit">' + unitInfo + '</div>';
                        if (uDef.isHero && uDef.abilityName) {
                            html += '<div class="hex-unit-ability">' + uDef.abilityName + ': ' + uDef.abilityDesc + '</div>';
                        }
                    }
                }
            }
        }

        overlay.innerHTML = html;
        overlay.classList.add('visible');
    }

    function selectHex(key) {
        // Deselect previous
        if (selectedKey) {
            const prevMesh = hexMeshes.get(selectedKey);
            if (prevMesh) {
                prevMesh.material = prevMesh._originalMaterial || prevMesh.material;
                if (prevMesh._selectMaterial) {
                    prevMesh._selectMaterial.dispose();
                    prevMesh._selectMaterial = null;
                }
            }
        }

        selectedKey = key;

        if (key) {
            const mesh = hexMeshes.get(key);
            if (mesh) {
                if (!mesh._originalMaterial) {
                    mesh._originalMaterial = mesh.material;
                }
                const selMat = mesh.material.clone();
                selMat.emissive = new THREE.Color(SELECT_EMISSIVE);
                selMat.emissiveIntensity = 0.4;
                mesh._selectMaterial = selMat;
                mesh.material = selMat;
            }
        }

        updateOverlay(key);
        if (onSelect) onSelect(key);
    }

    // Mouse move — hover
    function onMouseMove(event) {
        const hit = getIntersected(event);
        if (hit !== hoveredMesh) {
            clearHover();
            if (hit) setHover(hit);
        }
    }

    // Click — select
    function onClick(event) {
        // Ignore clicks on UI overlays
        if (event.target.closest('#build-menu') ||
            event.target.closest('#end-turn-btn') ||
            event.target.closest('#race-select') ||
            event.target.closest('#resource-bar') ||
            event.target.closest('#turn-counter') ||
            event.target.closest('#pop-bar') ||
            event.target.closest('#save-load-bar') ||
            event.target.closest('#minimap') ||
            event.target.closest('#pwa-install-banner') ||
            event.target.closest('#sound-controls') ||
            event.target.closest('#tech-tree-btn') ||
            event.target.closest('#event-log-btn') ||
            event.target.closest('#quest-panel')) {
            return;
        }

        const hit = getIntersected(event);
        if (hit && visibleHexSet.has(hit.userData.key)) {
            selectHex(hit.userData.key);
        } else {
            selectHex(null);
        }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    // ── Touch gesture handling ──
    var longPressTimer = null;
    var lastTapTime = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var isTouchDrag = false;

    function showTouchTooltip(clientX, clientY, key) {
        if (!touchTooltip || !key) return;
        if (!visibleHexSet.has(key)) return;
        var data = hexData.get(key);
        if (!data) return;

        var terrain = TERRAIN[data.terrain];
        var label = terrain ? terrain.name : data.terrain;
        var html = label;

        if (data.building) {
            var def = BUILDING_TYPES[data.building.type];
            html += '<br>' + def.name;
        }

        var gs = getGameState ? getGameState() : null;
        if (gs && gs.units) {
            for (var i = 0; i < gs.units.length; i++) {
                var u = gs.units[i];
                if (u.q === data.q && u.r === data.r) {
                    var uDef = UNIT_TYPES[u.type];
                    if (uDef) html += '<br>' + uDef.name + ' HP:' + u.hp + '/' + u.maxHp;
                }
            }
        }

        touchTooltip.innerHTML = html;
        touchTooltip.style.left = Math.min(clientX, window.innerWidth - 210) + 'px';
        touchTooltip.style.top = (clientY - 60) + 'px';
        touchTooltip.classList.add('visible');
    }

    function hideTouchTooltip() {
        if (touchTooltip) touchTooltip.classList.remove('visible');
    }

    function onTouchStart(e) {
        if (e.touches.length !== 1) {
            // Multi-touch — let OrbitControls handle (pinch/pan)
            clearTimeout(longPressTimer);
            hideTouchTooltip();
            return;
        }

        var touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouchDrag = false;

        // Long-press detection (500ms)
        longPressTimer = setTimeout(function () {
            var hit = getIntersectedFromXY(touchStartX, touchStartY);
            if (hit && visibleHexSet.has(hit.userData.key)) {
                showTouchTooltip(touchStartX, touchStartY, hit.userData.key);
            }
        }, 500);
    }

    function onTouchMove(e) {
        if (e.touches.length !== 1) return;
        var touch = e.touches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            isTouchDrag = true;
            clearTimeout(longPressTimer);
            hideTouchTooltip();
        }
    }

    function onTouchEnd(e) {
        clearTimeout(longPressTimer);
        hideTouchTooltip();

        if (isTouchDrag) return;
        if (e.changedTouches.length === 0) return;

        var touch = e.changedTouches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;

        // Only fire tap if finger didn't move much
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;

        // Ignore taps on UI
        if (touch.target.closest('#build-menu') ||
            touch.target.closest('#end-turn-btn') ||
            touch.target.closest('#race-select') ||
            touch.target.closest('#resource-bar') ||
            touch.target.closest('#turn-counter') ||
            touch.target.closest('#pop-bar') ||
            touch.target.closest('#save-load-bar') ||
            touch.target.closest('#minimap') ||
            touch.target.closest('#pwa-install-banner') ||
            touch.target.closest('#sound-controls') ||
            touch.target.closest('#tech-tree-btn') ||
            touch.target.closest('#event-log-btn') ||
            touch.target.closest('#quest-panel')) {
            return;
        }

        var now = Date.now();
        var hit = getIntersectedFromXY(touch.clientX, touch.clientY);

        // Double-tap detection (300ms window)
        if (now - lastTapTime < 300 && hit && visibleHexSet.has(hit.userData.key)) {
            // Double-tap: center camera on hex
            if (onDoubleTap) {
                onDoubleTap(hit.userData.key);
            }
            lastTapTime = 0;
            return;
        }

        lastTapTime = now;

        // Single tap: select hex
        if (hit && visibleHexSet.has(hit.userData.key)) {
            selectHex(hit.userData.key);
        } else {
            selectHex(null);
        }
    }

    // Use passive: false for touchstart so we can still detect gestures
    // But touchmove/touchend can be passive
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return {
        selectHex,
        getSelectedKey: function () { return selectedKey; },
        refreshSelection: function () {
            updateOverlay(selectedKey);
        },
        setVisibleHexes: function (hexSet) {
            visibleHexSet = hexSet;
        },
    };
}
