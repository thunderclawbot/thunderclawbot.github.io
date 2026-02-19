// multiplayer.js — Supabase Realtime multiplayer: lobby, sync, chat & connection handling
// Two-player turn-based: host creates room, guest joins with 4-char code.
// Uses Broadcast for game actions, Presence for lobby state.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { serializeState, deserializeState } from './game-state.js';

// ── State ──
var supabase = null;
var channel = null;
var roomCode = null;
var playerId = null;
var isHost = false;
var opponentId = null;
var opponentRace = null;
var opponentReady = false;
var connected = false;
var disconnectTimer = null;
var onActionCallback = null;
var onChatCallback = null;
var onPresenceCallback = null;
var onDisconnectCallback = null;
var onReconnectCallback = null;
var onForfeitCallback = null;
var myTurn = false;

// Timeout for auto-forfeit (5 minutes)
var DISCONNECT_TIMEOUT = 5 * 60 * 1000;

// ── Generate a random 4-char room code ──
function generateRoomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ── Generate a random player ID ──
function generatePlayerId() {
    return 'p_' + Math.random().toString(36).substr(2, 9);
}

// ── Initialize Supabase client ──
function initSupabase() {
    if (supabase) return supabase;

    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.error('Supabase JS client not loaded. Add the CDN script to index.html.');
        return null;
    }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
            params: { eventsPerSecond: 10 },
        },
    });

    playerId = generatePlayerId();
    return supabase;
}

// ── Create a room (host) ──
export function createRoom(race, callbacks) {
    var client = initSupabase();
    if (!client) return null;

    isHost = true;
    roomCode = generateRoomCode();
    myTurn = true; // Host goes first
    setCallbacks(callbacks);
    joinChannel(race);
    return roomCode;
}

// ── Join a room (guest) ──
export function joinRoom(code, race, callbacks) {
    var client = initSupabase();
    if (!client) return false;

    isHost = false;
    roomCode = code.toUpperCase();
    myTurn = false; // Guest goes second
    setCallbacks(callbacks);
    joinChannel(race);
    return true;
}

function setCallbacks(callbacks) {
    onActionCallback = callbacks.onAction || null;
    onChatCallback = callbacks.onChat || null;
    onPresenceCallback = callbacks.onPresence || null;
    onDisconnectCallback = callbacks.onDisconnect || null;
    onReconnectCallback = callbacks.onReconnect || null;
    onForfeitCallback = callbacks.onForfeit || null;
}

// ── Join the Supabase Realtime channel ──
function joinChannel(race) {
    if (!supabase || !roomCode) return;

    channel = supabase.channel('room-' + roomCode, {
        config: {
            broadcast: { self: false },
            presence: { key: playerId },
        },
    });

    // Presence: track who is in the room
    channel.on('presence', { event: 'sync' }, function () {
        var state = channel.presenceState();
        handlePresenceSync(state);
    });

    channel.on('presence', { event: 'join' }, function (payload) {
        clearDisconnectTimer();
        if (onReconnectCallback) onReconnectCallback();
    });

    channel.on('presence', { event: 'leave' }, function (payload) {
        handlePresenceLeave(payload);
    });

    // Broadcast: game actions
    channel.on('broadcast', { event: 'game-action' }, function (payload) {
        handleGameAction(payload.payload);
    });

    // Broadcast: chat messages
    channel.on('broadcast', { event: 'chat' }, function (payload) {
        handleChat(payload.payload);
    });

    // Broadcast: full state sync (for catch-up on join)
    channel.on('broadcast', { event: 'state-sync' }, function (payload) {
        handleStateSync(payload.payload);
    });

    channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
            connected = true;
            channel.track({
                playerId: playerId,
                race: race,
                isHost: isHost,
                ready: false,
            });
        }
    });
}

// ── Presence handlers ──
function handlePresenceSync(state) {
    var players = [];
    for (var key in state) {
        var presences = state[key];
        for (var i = 0; i < presences.length; i++) {
            players.push(presences[i]);
        }
    }

    // Find opponent
    opponentId = null;
    opponentRace = null;
    opponentReady = false;
    for (var j = 0; j < players.length; j++) {
        if (players[j].playerId !== playerId) {
            opponentId = players[j].playerId;
            opponentRace = players[j].race;
            opponentReady = players[j].ready || false;
        }
    }

    if (onPresenceCallback) {
        onPresenceCallback({
            players: players,
            opponentId: opponentId,
            opponentRace: opponentRace,
            opponentReady: opponentReady,
            roomCode: roomCode,
            isHost: isHost,
        });
    }
}

function handlePresenceLeave(payload) {
    if (!payload || !payload.leftPresences) return;

    for (var i = 0; i < payload.leftPresences.length; i++) {
        if (payload.leftPresences[i].playerId !== playerId) {
            connected = false;
            if (onDisconnectCallback) onDisconnectCallback();
            startDisconnectTimer();
        }
    }
}

// ── Disconnect timer for auto-forfeit ──
function startDisconnectTimer() {
    clearDisconnectTimer();
    disconnectTimer = setTimeout(function () {
        if (onForfeitCallback) onForfeitCallback();
    }, DISCONNECT_TIMEOUT);
}

function clearDisconnectTimer() {
    if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
    }
}

// ── Game action handling ──
function handleGameAction(data) {
    if (!data) return;

    if (data.type === 'end-turn') {
        myTurn = true;
    }

    if (onActionCallback) {
        onActionCallback(data);
    }
}

// ── Chat handling ──
function handleChat(data) {
    if (!data) return;
    if (onChatCallback) {
        onChatCallback({
            from: data.playerId === playerId ? 'you' : 'opponent',
            text: data.text,
            timestamp: data.timestamp,
        });
    }
}

// ── State sync handling ──
function handleStateSync(data) {
    if (!data) return;
    if (onActionCallback) {
        onActionCallback({ type: 'state-sync', state: data.state });
    }
}

// ── Send a game action ──
export function sendAction(action) {
    if (!channel) return;
    channel.send({
        type: 'broadcast',
        event: 'game-action',
        payload: {
            playerId: playerId,
            ...action,
        },
    });

    if (action.type === 'end-turn') {
        myTurn = false;
    }
}

// ── Send a chat message ──
export function sendChat(text) {
    if (!channel || !text) return;
    channel.send({
        type: 'broadcast',
        event: 'chat',
        payload: {
            playerId: playerId,
            text: text,
            timestamp: Date.now(),
        },
    });
}

// ── Send full state sync (host -> new joiner) ──
export function sendStateSync(gameState) {
    if (!channel) return;
    channel.send({
        type: 'broadcast',
        event: 'state-sync',
        payload: {
            playerId: playerId,
            state: serializeState(gameState),
        },
    });
}

// ── Mark self as ready ──
export function setReady(race) {
    if (!channel) return;
    channel.track({
        playerId: playerId,
        race: race,
        isHost: isHost,
        ready: true,
    });
}

// ── Leave the room ──
export function leaveRoom() {
    clearDisconnectTimer();
    if (channel) {
        channel.untrack();
        channel.unsubscribe();
        channel = null;
    }
    roomCode = null;
    opponentId = null;
    opponentRace = null;
    opponentReady = false;
    connected = false;
    myTurn = false;
}

// ── Getters ──
export function getRoomCode() { return roomCode; }
export function getPlayerId() { return playerId; }
export function getIsHost() { return isHost; }
export function getIsMyTurn() { return myTurn; }
export function setIsMyTurn(val) { myTurn = val; }
export function getIsConnected() { return connected; }
export function getOpponentRace() { return opponentRace; }
export function getOpponentReady() { return opponentReady; }

// ── Check if multiplayer mode is active ──
export function isMultiplayerActive() {
    return channel !== null && roomCode !== null;
}

// ── Check if Supabase client is available ──
export function isSupabaseAvailable() {
    return typeof window.supabase !== 'undefined' && !!window.supabase.createClient;
}
