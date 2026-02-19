// sound.js — Procedural sound effects & ambient music (Web Audio API)
// All sounds are generated procedurally — no external audio files needed.

var audioCtx = null;
var masterGain = null;
var musicGain = null;
var sfxGain = null;
var musicPlaying = false;
var musicNodes = [];
var sfxEnabled = true;
var musicEnabled = true;

// Initialize audio context (must be called from a user gesture)
export function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(masterGain);
}

export function setSfxEnabled(v) { sfxEnabled = v; }
export function setMusicEnabled(v) {
    musicEnabled = v;
    if (musicGain) musicGain.gain.value = v ? 0.15 : 0;
}
export function isMusicPlaying() { return musicPlaying; }

// ── SFX Helpers ──

function playTone(freq, duration, type, gainVal, detune) {
    if (!audioCtx || !sfxEnabled) return;
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    g.gain.setValueAtTime(gainVal || 0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, gainVal) {
    if (!audioCtx || !sfxEnabled) return;
    var bufferSize = audioCtx.sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    var source = audioCtx.createBufferSource();
    source.buffer = buffer;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(gainVal || 0.1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    source.connect(g);
    g.connect(sfxGain);
    source.start();
}

// ── Sound Effects ──

export function playClick() {
    playTone(800, 0.08, 'sine', 0.2);
    playTone(1200, 0.05, 'sine', 0.1);
}

export function playBuild() {
    playNoise(0.1, 0.15);
    playTone(200, 0.15, 'triangle', 0.2);
    setTimeout(function () {
        playTone(300, 0.12, 'triangle', 0.15);
    }, 80);
}

export function playTurnEnd() {
    playTone(440, 0.15, 'sine', 0.2);
    setTimeout(function () {
        playTone(554, 0.15, 'sine', 0.2);
    }, 100);
    setTimeout(function () {
        playTone(659, 0.2, 'sine', 0.25);
    }, 200);
}

export function playEventNotification() {
    playTone(660, 0.12, 'sine', 0.25);
    setTimeout(function () {
        playTone(880, 0.15, 'sine', 0.2);
    }, 120);
}

export function playCombat() {
    playNoise(0.15, 0.2);
    playTone(150, 0.2, 'sawtooth', 0.15);
    setTimeout(function () {
        playNoise(0.1, 0.15);
        playTone(100, 0.15, 'sawtooth', 0.1);
    }, 100);
}

export function playVictory() {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
        (function (idx) {
            setTimeout(function () {
                playTone(notes[idx], 0.3, 'sine', 0.25);
                playTone(notes[idx] * 1.5, 0.3, 'sine', 0.1);
            }, idx * 150);
        })(i);
    }
}

export function playDefeat() {
    var notes = [440, 370, 311, 261];
    for (var i = 0; i < notes.length; i++) {
        (function (idx) {
            setTimeout(function () {
                playTone(notes[idx], 0.4, 'sine', 0.2);
            }, idx * 200);
        })(i);
    }
}

export function playQuestComplete() {
    playTone(587, 0.15, 'sine', 0.2);
    setTimeout(function () {
        playTone(740, 0.15, 'sine', 0.2);
    }, 100);
    setTimeout(function () {
        playTone(880, 0.25, 'sine', 0.25);
    }, 200);
}

// ── Procedural Ambient Music ──
// Uses slow, layered oscillators to create a gentle ambient pad

export function startMusic() {
    if (!audioCtx || musicPlaying) return;
    musicPlaying = true;

    // Chord tones for ambient pad (Am7 variations)
    var chords = [
        [220, 261.6, 329.6, 392],   // Am
        [196, 246.9, 293.7, 370],    // Gm
        [174.6, 220, 261.6, 329.6],  // Fm
        [196, 246.9, 329.6, 392],    // G
    ];

    var chordIndex = 0;
    var chordDuration = 8; // seconds per chord

    function playChord() {
        if (!musicPlaying) return;
        var chord = chords[chordIndex % chords.length];
        chordIndex++;

        for (var i = 0; i < chord.length; i++) {
            var osc = audioCtx.createOscillator();
            var g = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = chord[i];
            // Slow detune for warmth
            osc.detune.value = (Math.random() - 0.5) * 10;

            g.gain.setValueAtTime(0.001, audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 2);
            g.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + chordDuration - 2);
            g.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + chordDuration);

            osc.connect(g);
            g.connect(musicGain);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + chordDuration);
            musicNodes.push({ osc: osc, gain: g });
        }

        // Add a subtle high shimmer
        var shimmer = audioCtx.createOscillator();
        var sg = audioCtx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.value = chord[0] * 4;
        sg.gain.setValueAtTime(0.001, audioCtx.currentTime);
        sg.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime + 3);
        sg.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + chordDuration);
        shimmer.connect(sg);
        sg.connect(musicGain);
        shimmer.start(audioCtx.currentTime);
        shimmer.stop(audioCtx.currentTime + chordDuration);
        musicNodes.push({ osc: shimmer, gain: sg });

        setTimeout(playChord, (chordDuration - 1) * 1000);
    }

    playChord();
}

export function stopMusic() {
    musicPlaying = false;
    for (var i = 0; i < musicNodes.length; i++) {
        try {
            musicNodes[i].osc.stop();
        } catch (e) { /* already stopped */ }
    }
    musicNodes = [];
}
