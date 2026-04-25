// gameLogic.js — Game state, audio engine, character data, settings, round logic

// ═══════════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════════
const AC = window.AudioContext || window.webkitAudioContext;
let audioCtx;

export let settings = { sfx: true, volume: 0.7, wallEvents: true, baitWords: true };

export function ensureAudio() { if (!audioCtx) audioCtx = new AC(); }
export function vol() { return settings.sfx ? settings.volume : 0; }

export function playGunshot() {
  if (!vol()) return;
  ensureAudio();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / audioCtx.sampleRate;
    d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 1.5;
    if (i < 800) d[i] += Math.sin(i * 0.3) * Math.exp(-t * 30) * 0.8;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol(), audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  src.connect(gain).connect(audioCtx.destination);
  src.start();
}

export function playClick() {
  if (!vol()) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 800; osc.type = 'square';
  gain.gain.setValueAtTime(vol() * 0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.08);
}

export function playBuzz() {
  if (!vol()) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 120; osc.type = 'sawtooth';
  gain.gain.setValueAtTime(vol() * 0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

export function playCountBleep(n) {
  if (!vol()) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const freqs = { 3: 440, 2: 550, 1: 660 };
  osc.frequency.value = freqs[n] || 440; osc.type = 'sine';
  gain.gain.setValueAtTime(vol() * 0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

export function playDrawHorn() {
  if (!vol()) return;
  ensureAudio();
  [440, 550, 660, 880].forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = f; osc.type = 'sawtooth';
    const t = audioCtx.currentTime + i * 0.04;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol() * 0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.35);
  });
}

export function playWallSound() {
  if (!vol()) return;
  ensureAudio();
  [300, 400].forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = f; osc.type = 'square';
    const t = audioCtx.currentTime + i * 0.05;
    gain.gain.setValueAtTime(vol() * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.3);
  });
}

export function playCrashSound() {
  if (!vol()) return;
  ensureAudio();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / audioCtx.sampleRate;
    d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * vol();
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol(), audioCtx.currentTime);
  src.connect(gain).connect(audioCtx.destination);
  src.start();
}

// ═══════════════════════════════════════════════════════
// CHARACTER DATA
// ═══════════════════════════════════════════════════════
export const HATS    = ['🤠','👒','🎩','⛑️','🪖','👑','🎓','🧢'];
export const OUTFITS = ['👘','🥻','🧥','🦺','👔','🩱','🥼','🩲'];
export const FACES   = ['😎','😈','🤡','👻','💀','🤖','👽','🦊'];

export const CASE_ITEMS = [
  {emoji:'🤠',rarity:'common'},{emoji:'👒',rarity:'common'},{emoji:'😎',rarity:'common'},
  {emoji:'👘',rarity:'common'},{emoji:'🧥',rarity:'common'},{emoji:'🧢',rarity:'common'},
  {emoji:'⛑️',rarity:'rare'},{emoji:'🎩',rarity:'rare'},{emoji:'🦺',rarity:'rare'},
  {emoji:'👔',rarity:'rare'},{emoji:'🕵️',rarity:'rare'},{emoji:'🤖',rarity:'rare'},
  {emoji:'👑',rarity:'epic'},{emoji:'💀',rarity:'epic'},{emoji:'👽',rarity:'epic'},
  {emoji:'🃏',rarity:'legendary'},{emoji:'🏴‍☠️',rarity:'legendary'},
];

export let inventory = JSON.parse(localStorage.getItem('hn_inventory') || '["🤠","👒","😎","👘","🧥","🧢"]');
export let equipped  = JSON.parse(localStorage.getItem('hn_equipped')  || '["🤠","😈"]');

export function saveCustom() {
  localStorage.setItem('hn_inventory', JSON.stringify(inventory));
  localStorage.setItem('hn_equipped',  JSON.stringify(equipped));
}

// ═══════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════
export let gameMode      = 'practice'; // 'practice' | 'local'
export let totalRounds   = 3;
export let currentRound  = 1;
export let roundResults  = [];         // array of 'p1' | 'p2' | 'ai' winners
export let bestMs        = null;

// Round-level state
export let gamePhase     = 'idle';     // idle | countdown | wall | live | result
export let drawTime      = 0;
export let wallBrokenBy  = null;       // 'p1' | 'p2' | null
export let p1RoundTime   = null;
export let p2RoundTime   = null;

let timeoutId = null;

const COUNTDOWN_SEQ = [3, 2, 1];
const BAIT_WORDS    = ['DRAW?', 'FIRE?', 'NOW?'];

export const WIN_LINES = [
  "Slicker than a greased rattlesnake.",
  "Fastest gun in the territory.",
  "The devil blinked first.",
  "Even the crows tipped their hats.",
  "That draw'd make Billy the Kid nervous.",
];
export const LOSE_LINES = [
  "Boot Hill's got another tenant.",
  "Your mama warned you, stranger.",
  "That's why you stick to poker.",
  "The undertaker sends his regards.",
  "Try again, greenhorn.",
];

// Callbacks wired up by main.js
export let cb = {
  onWord:       () => {},
  onDraw:       () => {},
  onWall:       () => {},
  onWallResume: () => {},
  onResult:     () => {},
  onEarly:      () => {},
};

export function registerCallbacks(callbacks) {
  cb = { ...cb, ...callbacks };
}

// ── Match setup ──
export function initMatch(mode, rounds) {
  gameMode     = mode;
  totalRounds  = rounds;
  currentRound = 1;
  roundResults = [];
  bestMs       = null;
}

// ── Round start ──
export function startRound() {
  gamePhase    = 'countdown';
  drawTime     = 0;
  wallBrokenBy = null;
  p1RoundTime  = null;
  p2RoundTime  = null;

  setTimeout(() => runCountdown([...COUNTDOWN_SEQ], 0), 600);
}

function runCountdown(counts, idx) {
  if (gamePhase !== 'countdown') return;

  // Possibly inject a wall between count steps
  if (idx > 0 && settings.wallEvents && Math.random() < 0.25) {
    triggerWall(counts, idx);
    return;
  }

  // Bait word fake-out before the last count
  if (settings.baitWords && idx === counts.length - 1 && Math.random() < 0.3) {
    const bait = BAIT_WORDS[Math.floor(Math.random() * BAIT_WORDS.length)];
    cb.onWord(bait, true); // true = bait
    timeoutId = setTimeout(() => { if (gamePhase === 'countdown') runCountdown(counts, idx); }, 900);
    return;
  }

  if (idx >= counts.length) {
    cb.onWord('', false);
    const delay = 300 + Math.random() * 1800;
    timeoutId = setTimeout(() => { if (gamePhase === 'countdown') triggerDraw(); }, delay);
    return;
  }

  const n = counts[idx];
  cb.onWord(String(n), false);
  playCountBleep(n);
  timeoutId = setTimeout(() => runCountdown(counts, idx + 1), 800);
}

function triggerWall() {
  gamePhase    = 'wall';
  wallBrokenBy = null;

  playWallSound();
  cb.onWall(gameMode);

  // In practice mode the AI also races to smash the wall
  if (gameMode === 'practice') {
    const aiMs = 300 + Math.random() * 700;
    timeoutId = setTimeout(() => {
      if (gamePhase === 'wall') handleWallHit('ai');
    }, aiMs);
  }
}

export function handleWallHit(player) {
  if (gamePhase !== 'wall') return;

  if (gameMode === 'local') {
    if (wallBrokenBy === null) {
      wallBrokenBy = player;
      resolveWall();
    }
  } else {
    wallBrokenBy = player;
    resolveWall();
  }
}

function resolveWall() {
  clearTimeout(timeoutId);
  playCrashSound();

  gamePhase = 'countdown';
  cb.onWallResume(wallBrokenBy, gameMode);

  timeoutId = setTimeout(() => {
    if (gamePhase === 'countdown') triggerDraw();
  }, 400 + Math.random() * 800);
}

function triggerDraw() {
  gamePhase = 'live';
  drawTime  = performance.now();

  playDrawHorn();
  cb.onDraw(gameMode);

  if (gameMode === 'practice') {
    const aiMs = 200 + Math.random() * 400;
    timeoutId = setTimeout(() => {
      if (gamePhase === 'live') endRound('ai', null, Math.round(aiMs));
    }, aiMs);
  } else {
    // 2-player: timeout if neither presses
    timeoutId = setTimeout(() => {
      if (gamePhase === 'live') {
        if      (p1RoundTime !== null) endRound('p1', Math.round(p1RoundTime), null);
        else if (p2RoundTime !== null) endRound('p2', null, Math.round(p2RoundTime));
        else                           endRound('draw', null, null);
      }
    }, 3000);
  }
}

// ── Input handling ──
export function handleInput(player) {
  ensureAudio();

  if (gamePhase === 'wall') {
    handleWallHit(player);
    return;
  }

  if (gamePhase === 'countdown') {
    clearTimeout(timeoutId);
    gamePhase = 'result';
    playBuzz();
    cb.onEarly(player, gameMode);
    return;
  }

  if (gamePhase !== 'live') return;

  const reaction = Math.round(performance.now() - drawTime);

  if (player === 'p1' && p1RoundTime === null) p1RoundTime = reaction;
  if (player === 'p2' && p2RoundTime === null) p2RoundTime = reaction;

  if (gameMode === 'practice') {
    clearTimeout(timeoutId);
    const aiMs = 200 + Math.random() * 400;
    endRound(reaction < aiMs ? 'p1' : 'ai', reaction, Math.round(aiMs));
  } else {
    if (p1RoundTime !== null && p2RoundTime !== null) {
      clearTimeout(timeoutId);
      endRound(p1RoundTime < p2RoundTime ? 'p1' : 'p2', p1RoundTime, p2RoundTime);
    }
  }
}

function endRound(winner, p1Ms, p2Ms) {
  gamePhase = 'result';

  if (winner === 'p1' && (bestMs === null || p1Ms < bestMs)) bestMs = p1Ms;

  roundResults.push(winner);

  const p1Wins    = roundResults.filter(r => r === 'p1').length;
  const p2Wins    = roundResults.filter(r => r === 'p2' || r === 'ai').length;
  const winsNeeded = Math.ceil(totalRounds / 2);
  const matchOver = p1Wins >= winsNeeded || p2Wins >= winsNeeded
                    || roundResults.filter(r => r !== null).length >= totalRounds;

  let champion = null;
  if (matchOver) {
    if      (p1Wins > p2Wins) champion = gameMode === 'local' ? 'PLAYER 1' : 'YOU';
    else if (p2Wins > p1Wins) champion = gameMode === 'local' ? 'PLAYER 2' : 'THE AI OUTLAW';
    else                       champion = "NOBODY — IT'S A TIE";
  }

  cb.onResult({ winner, p1Ms, p2Ms, matchOver, champion, p1Wins, p2Wins });
}

// ── Helpers ──
export function advanceRound() {
  currentRound++;
}