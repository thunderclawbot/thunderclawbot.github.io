// input.js — Hex selection via raycasting (InstancedMesh-aware)
// Click/tap to select, hover for highlight, info overlay
// Touch: long-press for tooltip, double-tap to center

import * as THREE from 'three';
import { TERRAIN } from './hex-grid.js';
import { BUILDING_TYPES } from './buildings.js';
import { UNIT_TYPES } from './units.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Colors
const HOVER_TINT = new THREE.Color(0x333333);
const SELECT_TINT = new THREE.Color(0xfbbf24);

export function setupInput(camera, hexMeshes, hexData, callbacks, gridApi) {
    let hoveredKey = null;
    let selectedKey = null;
    let visibleHexSet = new Set();

    var instancedMeshes = gridApi ? gridApi.instancedMeshes : [];
    var resolveHit = gridApi ? gridApi.resolveInstanceHit : null;
    var setHexEmissiveTint = gridApi ? gridApi.setHexEmissiveTint : null;
    var resetHexColor = gridApi ? gridApi.resetHexColor : null;
    var hexLookup = gridApi ? gridApi.hexLookup : null;

    const overlay = document.getElementById('hex-info');
    const touchTooltip = document.getElementById('touch-tooltip');

    const onSelect = callbacks && callbacks.onSelect;
    const getGameState = callbacks && callbacks.getGameState;
    const onDoubleTap = callbacks && callbacks.onDoubleTap;

    function getIntersectedKey(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        if (instancedMeshes.length > 0 && resolveHit) {
            var intersects = raycaster.intersectObjects(instancedMeshes, false);
            if (intersects.length > 0) {
                var hit = intersects[0];
                return resolveHit(hit.object, hit.instanceId);
            }
            return null;
        }

        // Fallback for non-instanced (shouldn't happen but safe)
        var meshArray = Array.from(hexMeshes.values()).filter(function (m) { return m.isMesh; });
        var intersects2 = raycaster.intersectObjects(meshArray, false);
        if (intersects2.length > 0) {
            return intersects2[0].object.userData.key || null;
        }
        return null;
    }

    function getIntersectedFromXY(clientX, clientY) {
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshArray, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }

    function clearHover() {
        if (hoveredKey && hoveredKey !== selectedKey && resetHexColor) {
            // If this hex is fogged, we need to re-apply fog rather than base color
            // For simplicity, just reset to base — fog update will correct on next cycle
            resetHexColor(hoveredKey);
        }
        hoveredKey = null;
    }

    function setHover(key) {
        if (key === selectedKey) return;
        if (!visibleHexSet.has(key)) return;
        if (setHexEmissiveTint) {
            setHexEmissiveTint(key, HOVER_TINT, 0.4);
        }
        hoveredKey = key;
    }

    function updateOverlay(key) {
        if (!key) {
            overlay.classList.remove('visible');
            return;
        }
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
        if (selectedKey && resetHexColor) {
            resetHexColor(selectedKey);
        }

        selectedKey = key;

        if (key && setHexEmissiveTint) {
            setHexEmissiveTint(key, SELECT_TINT, 0.5);
        }

        updateOverlay(key);
        if (onSelect) onSelect(key);
    }

    // Mouse move — hover
    function onMouseMove(event) {
        var hitKey = getIntersectedKey(event);
        if (hitKey !== hoveredKey) {
            clearHover();
            if (hitKey) setHover(hitKey);
        }
    }

    // Click — select
    function onClick(event) {
        // Ignore clicks on UI overlays
        if (event.target.closest('#build-menu') ||
            event.target.closest('#bottom-bar') ||
            event.target.closest('#race-select') ||
            event.target.closest('#resource-bar') ||
            event.target.closest('#turn-counter') ||
            event.target.closest('#pop-bar') ||
            event.target.closest('#minimap') ||
            event.target.closest('#pwa-install-banner') ||
            event.target.closest('#sound-controls') ||
            event.target.closest('#quest-panel') ||
            event.target.closest('#hex-info') ||
            event.target.closest('#combat-log') ||
            event.target.closest('.hud-controls') ||
            event.target.closest('#tech-tree-panel') ||
            event.target.closest('#event-log-panel') ||
            event.target.closest('#event-toast') ||
            event.target.closest('#tutorial-overlay') ||
            event.target.closest('#game-over-screen') ||
            event.target.closest('#mp-lobby') ||
            event.target.closest('#mp-chat') ||
            event.target.closest('#mp-chat-toggle') ||
            event.target.closest('#anim-speed-bar') ||
            event.target.closest('#research-status')) {
            return;
        }

        var hitKey = getIntersectedKey(event);
        if (hitKey && visibleHexSet.has(hitKey)) {
            selectHex(hitKey);
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
            touch.target.closest('#bottom-bar') ||
            touch.target.closest('#race-select') ||
            touch.target.closest('#resource-bar') ||
            touch.target.closest('#turn-counter') ||
            touch.target.closest('#pop-bar') ||
            touch.target.closest('#minimap') ||
            touch.target.closest('#pwa-install-banner') ||
            touch.target.closest('#sound-controls') ||
            touch.target.closest('#quest-panel') ||
            touch.target.closest('#hex-info') ||
            touch.target.closest('#combat-log') ||
            touch.target.closest('.hud-controls') ||
            touch.target.closest('#tech-tree-panel') ||
            touch.target.closest('#event-log-panel') ||
            touch.target.closest('#event-toast') ||
            touch.target.closest('#tutorial-overlay') ||
            touch.target.closest('#game-over-screen') ||
            touch.target.closest('#mp-lobby') ||
            touch.target.closest('#mp-chat') ||
            touch.target.closest('#mp-chat-toggle') ||
            touch.target.closest('#anim-speed-bar') ||
            touch.target.closest('#research-status')) {
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
