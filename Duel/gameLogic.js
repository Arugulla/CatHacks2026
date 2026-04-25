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
  const freqs = { 3: 440, 2: 550, 1: 660, 0: 770 };
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
export const HATS = ['🤠','👒','🎩','⛑️','🪖','👑','🎓','🧢','🏴‍☠️'];
export const FACES = ['😎','😈','🤡','👻','💀','🤖','👽','🦊','🕵️','🃏'];
export const OUTFITS = ['👘','🥻','🧥','🦺','👔','🥼','🧣','🧤','🥾'];
export const ALL_GEAR = [...HATS, ...OUTFITS, ...FACES];

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
// SETTINGS + KEYBINDS
// ═══════════════════════════════════════════════════════
const defaultKeybinds = { p1: 'a', p2: 'l' };
export let keybinds = JSON.parse(localStorage.getItem('hn_keybinds') || JSON.stringify(defaultKeybinds));

export function setKeybind(player, key) {
  if (!['p1','p2'].includes(player) || !key) return false;
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  const other = player === 'p1' ? 'p2' : 'p1';
  if (normalized === keybinds[other]) return false;
  keybinds[player] = normalized;
  localStorage.setItem('hn_keybinds', JSON.stringify(keybinds));
  return true;
}

export function keyLabel(key) {
  if (key === ' ') return 'SPACE';
  return key.length === 1 ? key.toUpperCase() : key.replace('Arrow','').toUpperCase();
}

// ═══════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════
export let gameMode = 'practice';
export let totalRounds = 3;
export let currentRound = 1;
export let roundResults = [];
export let bestMs = null;

export let gamePhase = 'idle';
export let drawTime = 0;
export let wallRound = false;
export let wallBrokenBy = null;
export let p1RoundTime = null;
export let p2RoundTime = null;

let timeoutId = null;
let baitShownThisRound = false;

const COUNTDOWN_VALUES = [3, 2, 1, 0];
const BAIT_WORDS = ['DRAW?', 'FIRE?', 'NOW?', 'BANG?'];

export let cb = {
  onWord: () => {},
  onDraw: () => {},
  onResult: () => {},
  onEarly: () => {},
};

export function registerCallbacks(callbacks) { cb = { ...cb, ...callbacks }; }

export function initMatch(mode, rounds) {
  gameMode = mode;
  totalRounds = rounds;
  currentRound = 1;
  roundResults = [];
  bestMs = null;
}

export function startRound() {
  clearTimeout(timeoutId);
  gamePhase = 'countdown';
  drawTime = 0;
  wallRound = settings.wallEvents && Math.random() < 0.10;
  wallBrokenBy = null;
  p1RoundTime = null;
  p2RoundTime = null;
  baitShownThisRound = false;
  timeoutId = setTimeout(() => runCountdown(0, 3), 500);
}

function randomDelay() { return Math.floor(Math.random() * 3001); }

function nextCount(last) {
  // Countdown can repeat or skip downward, but it can never backtrack upward.
  // Examples allowed: 3 -> 3, 3 -> 1, 3 -> 0, 1 -> 0.
  // Examples blocked: 0 -> 3, 1 -> 2, 2 -> 3.
  const choices = COUNTDOWN_VALUES.filter(n => n <= last);
  return choices[Math.floor(Math.random() * choices.length)];
}

function runCountdown(step, lastNumber) {
  if (gamePhase !== 'countdown') return;

  if (settings.baitWords && !baitShownThisRound && step >= 1 && Math.random() < 0.25) {
    baitShownThisRound = true;
    const bait = BAIT_WORDS[Math.floor(Math.random() * BAIT_WORDS.length)];
    cb.onWord(bait, true);
    timeoutId = setTimeout(() => runCountdown(step, lastNumber), randomDelay());
    return;
  }

  if (step >= 4) {
    cb.onWord('', false);
    timeoutId = setTimeout(() => { if (gamePhase === 'countdown') triggerDraw(); }, randomDelay());
    return;
  }

  const n = step === 0 ? 3 : nextCount(lastNumber);
  cb.onWord(String(n), false);
  playCountBleep(n);

  // Zero means the duel can become live instantly. Do not continue to another
  // countdown number after 0, because that would feel like backtracking.
  if (n === 0) {
    timeoutId = setTimeout(() => { if (gamePhase === 'countdown') triggerDraw(); }, 0);
    return;
  }

  timeoutId = setTimeout(() => runCountdown(step + 1, n), randomDelay());
}

function triggerDraw() {
  gamePhase = 'live';
  drawTime = performance.now();
  playDrawHorn();
  if (wallRound) playWallSound();
  cb.onDraw(gameMode, wallRound);

  if (gameMode === 'practice') {
    const aiMs = 200 + Math.random() * 400;
    timeoutId = setTimeout(() => { if (gamePhase === 'live') handleInput('ai'); }, aiMs);
  } else {
    timeoutId = setTimeout(() => {
      if (gamePhase === 'live') {
        if (p1RoundTime !== null) endRound(resolveWinnerFromShot('p1'), p1RoundTime, null);
        else if (p2RoundTime !== null) endRound(resolveWinnerFromShot('p2'), null, p2RoundTime);
        else endRound('draw', null, null);
      }
    }, 3000);
  }
}

function resolveWinnerFromShot(shooter) {
  if (!wallRound) return shooter;
  wallBrokenBy = shooter;
  playCrashSound();
  if (gameMode === 'practice') return shooter === 'p1' ? 'ai' : 'p1';
  return shooter === 'p1' ? 'p2' : 'p1';
}

export function handleInput(player) {
  ensureAudio();

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

  clearTimeout(timeoutId);
  if (gameMode === 'practice') {
    if (player === 'ai') endRound(resolveWinnerFromShot('ai'), null, reaction);
    else endRound(resolveWinnerFromShot('p1'), reaction, null);
  } else {
    endRound(resolveWinnerFromShot(player), p1RoundTime, p2RoundTime);
  }
}

function endRound(winner, p1Ms, p2Ms) {
  gamePhase = 'result';
  if (winner === 'p1' && p1Ms !== null && (bestMs === null || p1Ms < bestMs)) bestMs = p1Ms;
  roundResults.push(winner);

  const p1Wins = roundResults.filter(r => r === 'p1').length;
  const p2Wins = roundResults.filter(r => r === 'p2' || r === 'ai').length;
  const winsNeeded = Math.ceil(totalRounds / 2);
  const matchOver = p1Wins >= winsNeeded || p2Wins >= winsNeeded || roundResults.length >= totalRounds;

  let champion = null;
  if (matchOver) {
    if (p1Wins > p2Wins) champion = gameMode === 'local' ? 'PLAYER 1' : 'YOU';
    else if (p2Wins > p1Wins) champion = gameMode === 'local' ? 'PLAYER 2' : 'THE AI OUTLAW';
    else champion = "NOBODY — IT'S A TIE";
  }

  cb.onResult({ winner, p1Ms, p2Ms, matchOver, champion, p1Wins, p2Wins, wallRound, wallBrokenBy });
}

export function advanceRound() { currentRound++; }
