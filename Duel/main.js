// main.js — UI, DOM wiring, customize, settings, case-rolling, keyboard/click handlers

import {
  settings, ensureAudio,
  playGunshot, playClick, playDrawHorn,
  ALL_GEAR, CASE_ITEMS,
  inventory, equipped, saveCustom, keybinds, setKeybind, keyLabel,
  gameMode, currentRound, roundResults, bestMs,
  registerCallbacks, initMatch, startRound, handleInput, advanceRound,
} from './gameLogic.js';

// ═══════════════════════════════════════════════════════
// SCREEN ROUTING
// ═══════════════════════════════════════════════════════
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 'customize-screen') {
    updateCharPreviews();
    renderItemGrid();
    buildCaseStripInitial();
  }
  if (id === 'settings-screen') updateKeybindLabels();
}

// ═══════════════════════════════════════════════════════
// PLAY SELECT
// ═══════════════════════════════════════════════════════
let playMode       = 'practice';
let selectedRounds = 3;

window.selectPlayMode = function(m) {
  playMode = m;
  document.getElementById('mode-practice').classList.toggle('selected', m === 'practice');
  document.getElementById('mode-local').classList.toggle('selected', m === 'local');
  document.getElementById('local-keys-hint').style.display = m === 'local' ? 'block' : 'none';
  updateKeybindLabels();
};

window.changeRounds = function(d) {
  selectedRounds = Math.max(1, Math.min(9, selectedRounds + d));
  document.getElementById('round-display').textContent = selectedRounds;
};

window.startMatch = function() {
  ensureAudio();
  initMatch(playMode, selectedRounds);

  const isLocal = playMode === 'local';
  document.getElementById('p1-key').textContent  = keyLabel(keybinds.p1);
  document.getElementById('p1-name').textContent = 'PLAYER 1';
  document.getElementById('p2-name').textContent = isLocal ? 'PLAYER 2' : 'OUTLAW AI';
  document.getElementById('p2-key').textContent  = isLocal ? keyLabel(keybinds.p2) : 'CLICK';
  document.getElementById('input-indicators').style.display = isLocal ? 'flex' : 'none';

  updateCharPreviews();
  showScreen('game-screen');
  updateStatusBar();
  beginRound();
};

// ═══════════════════════════════════════════════════════
// GAME CALLBACKS → DOM
// ═══════════════════════════════════════════════════════
registerCallbacks({
  onWord(word, isBait) {
    const cd = document.getElementById('countdown');
    cd.style.display = 'block';
    cd.textContent   = word;
    cd.className     = 'countdown-display flash';
    setTimeout(() => cd.className = 'countdown-display', 350);
    if (isBait) document.getElementById('twist-badge').textContent = '⚠ HOLD YOUR NERVE...';
  },

  onDraw(mode, wallRound) {
    document.getElementById('countdown').style.display = 'none';
    document.getElementById('wall-display').style.display = wallRound ? 'flex' : 'none';
    document.getElementById('draw-text').style.display = wallRound ? 'none' : 'block';
    document.getElementById('zone-hint').textContent =
      mode === 'local' ? `⬆ P1[${keyLabel(keybinds.p1)}]  P2[${keyLabel(keybinds.p2)}] ⬆` : '⬆ CLICK NOW! ⬆';
    document.getElementById('draw-zone').className = wallRound ? 'draw-zone wall-active live' : 'draw-zone live';
    document.getElementById('duelists-row').classList.remove('backs-turned');
    document.getElementById('twist-badge').textContent = wallRound
      ? '🧱 WALL TRAP! First shot breaks it and loses!'
      : 'DRAW!';
    document.getElementById('wall-hint').textContent = wallRound
      ? (mode === 'local' ? 'DON’T BE FIRST! Let the other player break it!' : 'DON’T SHOOT FIRST!')
      : '';
  },

  onEarly(player, mode) {
    document.getElementById('draw-zone').classList.add('early');
    setTimeout(() => showRoundResult('early', player, null, null), 400);
  },

  onResult({ winner, p1Ms, p2Ms, matchOver, champion, wallRound, wallBrokenBy }) {
    if (winner === 'p1' || winner === 'p2' || winner === 'ai') {
      muzzleFlash();
      playGunshot();
    }
    if (wallRound) triggerWallFlash();
    if (winner === 'p1') spawnParticles(['🌟','⭐','🔥','💥'], 10);
    showRoundResult(winner, null, p1Ms, p2Ms, matchOver, champion, wallRound, wallBrokenBy);
  },
});

// ═══════════════════════════════════════════════════════
// ROUND UI
// ═══════════════════════════════════════════════════════
function beginRound() {
  const zone = document.getElementById('draw-zone');
  zone.className = 'draw-zone';
  document.getElementById('duelists-row').classList.add('backs-turned');
  document.getElementById('countdown').style.display = 'block';
  document.getElementById('countdown').textContent   = '—';
  document.getElementById('draw-text').style.display  = 'none';
  document.getElementById('wall-display').style.display = 'none';
  document.getElementById('zone-hint').textContent    = 'GET READY...';
  document.getElementById('twist-badge').textContent  = 'GET READY, PARTNER...';
  document.getElementById('ind-p1').classList.remove('pressed');
  document.getElementById('ind-p2').classList.remove('pressed');
  startRound();
}

function showRoundResult(winner, earlyPlayer, p1Ms, p2Ms, matchOver, champion, wallRound = false, wallBrokenBy = null) {
  showScreen('result-screen');

  const headline  = document.getElementById('result-headline');
  const sub       = document.getElementById('result-sub');
  const timeDiv   = document.getElementById('time-display');
  const nextBtn   = document.getElementById('next-btn');
  const againBtn  = document.getElementById('again-btn');
  const champArea = document.getElementById('champion-area');

  champArea.innerHTML = '';
  againBtn.style.display = 'none';
  sub.textContent = wallRound && wallBrokenBy
    ? `${wallBrokenBy === 'p1' ? 'Player 1' : wallBrokenBy === 'p2' ? 'Player 2' : 'The AI'} broke the wall first. The patient duelist wins.`
    : 'Slicker than a greased rattlesnake.';

  const prog = document.getElementById('round-progress');
  prog.innerHTML = roundResults.map((r, i) => {
    const cls   = r === 'p1' ? 'win-p1' : (r === 'p2' || r === 'ai') ? 'win-p2' : '';
    const label = r === 'p1' ? 'P1' : r === 'p2' ? 'P2' : r === 'ai' ? 'AI' : '?';
    return `<div class="round-pip ${cls}" title="Round ${i+1}">${label}</div>`;
  }).join('') + Array(Math.max(0, selectedRounds - roundResults.length))
      .fill('<div class="round-pip" style="opacity:0.3">·</div>').join('');

  if (winner === 'early') {
    headline.textContent = 'TOO EARLY!';
    headline.className   = 'result-headline early';
    sub.textContent      = 'A cheat and a coward. Holster up.';
    timeDiv.innerHTML    = `<div style="color:#ff6600;font-size:0.9rem;">${earlyPlayer === 'p1' ? 'Player 1' : 'Player 2'} fired before DRAW!</div>`;
  } else if (winner === 'p1') {
    headline.textContent = gameMode === 'local' ? 'P1 WINS!' : 'YOU WIN!';
    headline.className   = 'result-headline win';
    timeDiv.innerHTML    = buildTimeDisplay(p1Ms, p2Ms, 'p1');
  } else if (winner === 'p2' || winner === 'ai') {
    headline.textContent = gameMode === 'local' ? 'P2 WINS!' : 'TOO SLOW!';
    headline.className   = 'result-headline lose';
    timeDiv.innerHTML    = buildTimeDisplay(p1Ms, p2Ms, winner);
  } else {
    headline.textContent = 'DEAD HEAT!';
    headline.className   = 'result-headline';
    sub.textContent      = 'The dust settles with no clear winner.';
    timeDiv.innerHTML    = '';
  }

  if (matchOver) {
    champArea.innerHTML    = `<div class="champion-banner">🏆 CHAMPION: ${champion}</div>`;
    nextBtn.style.display  = 'none';
    againBtn.style.display = 'inline-block';
  } else {
    nextBtn.style.display  = 'inline-block';
    nextBtn.innerHTML = `⚔ Round ${currentRound + 1}`;
    nextBtn.onclick = () => {
      advanceRound();
      updateStatusBar();
      showScreen('game-screen');
      beginRound();
    };
  }

  updateStatusBar();
}

function buildTimeDisplay(p1Ms, p2Ms, winner) {
  if (gameMode === 'practice') {
    const isRecord = winner === 'p1' && bestMs === p1Ms && p1Ms < 300;
    return `
      <div class="player-time"><div class="player-label">YOUR DRAW</div><div class="player-ms ${winner === 'p1' ? 'best' : ''}">${p1Ms !== null ? p1Ms + 'ms' : '—'} ${isRecord ? '<span class="new-record">NEW RECORD</span>' : ''}</div></div>
      <div class="player-time"><div class="player-label">OUTLAW AI</div><div class="player-ms p2">${p2Ms !== null ? p2Ms + 'ms' : '—'}</div></div>`;
  }
  return `
    <div class="player-time"><div class="player-label">PLAYER 1</div><div class="player-ms ${winner === 'p1' ? 'best' : 'p2'}">${p1Ms !== null ? p1Ms + 'ms' : '—'}</div></div>
    <div class="player-time"><div class="player-label">PLAYER 2</div><div class="player-ms ${winner === 'p2' || winner === 'ai' ? 'best' : 'p2'}">${p2Ms !== null ? p2Ms + 'ms' : '—'}</div></div>`;
}

function updateStatusBar() {
  document.getElementById('round-num').textContent = currentRound;
  const p1W = roundResults.filter(r => r === 'p1').length;
  const p2W = roundResults.filter(r => r === 'p2' || r === 'ai').length;
  if (gameMode === 'local') {
    document.getElementById('wins-display').innerHTML = `P1 <span class="status-value">${p1W}</span> — <span class="status-value">${p2W}</span> P2`;
  } else {
    document.getElementById('wins-display').innerHTML = `WINS <span class="status-value">${p1W}</span>`;
  }
  document.getElementById('best-time').textContent = bestMs !== null ? bestMs + 'ms' : '—';
}

// ═══════════════════════════════════════════════════════
// KEYBOARD + CLICK
// ═══════════════════════════════════════════════════════
function keyMatches(e, savedKey) {
  return e.key.toLowerCase() === savedKey || e.code === savedKey;
}

document.addEventListener('keydown', e => {
  if (document.body.dataset.listeningKeybind) return;

  if (keyMatches(e, keybinds.p1)) {
    handleInput('p1');
    document.getElementById('ind-p1').classList.add('pressed');
  }
  if (gameMode === 'local' && keyMatches(e, keybinds.p2)) {
    handleInput('p2');
    document.getElementById('ind-p2').classList.add('pressed');
  }
  if ((e.code === 'Space' || e.code === 'Enter') && gameMode === 'practice') {
    e.preventDefault();
    handleInput('p1');
  }
});

window.handleZoneClick = function() {
  if (gameMode === 'practice') handleInput('p1');
};

// ═══════════════════════════════════════════════════════
// CUSTOMIZE SCREEN
// ═══════════════════════════════════════════════════════
let editingPlayer = 1;

window.selectCharSlot = function(p) {
  editingPlayer = p;
  document.getElementById('slot-p1').classList.toggle('selected', p === 1);
  document.getElementById('slot-p2').classList.toggle('selected', p === 2);
  renderItemGrid();
};

window.switchTab = function() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.add('active'));
  renderItemGrid();
};

function renderItemGrid() {
  const grid  = document.getElementById('item-grid');
  grid.innerHTML = '';
  ALL_GEAR.forEach(em => {
    const btn        = document.createElement('button');
    btn.className    = 'item-btn';
    btn.textContent  = em;
    const isOwned    = inventory.includes(em);
    const isEquipped = equipped[editingPlayer - 1] === em;
    if (!isOwned)    btn.classList.add('locked');
    if (isEquipped)  btn.classList.add('equipped');
    btn.onclick = () => {
      if (!isOwned) return;
      equipped[editingPlayer - 1] = em;
      saveCustom();
      updateCharPreviews();
      renderItemGrid();
    };
    grid.appendChild(btn);
  });
}

function updateCharPreviews() {
  document.getElementById('preview-p1').textContent = equipped[0];
  document.getElementById('preview-p2').textContent = equipped[1];
  document.getElementById('p1-char').textContent    = equipped[0];
  document.getElementById('p2-char').textContent    = equipped[1];
}

// ═══════════════════════════════════════════════════════
// CASE OPENING (CSGO-style)
// ═══════════════════════════════════════════════════════
let caseSpinning = false;

function buildCaseStrip() {
  const strip = document.getElementById('case-items');
  strip.innerHTML = '';
  const pool = [];
  for (let i = 0; i < 40; i++) {
    const r = Math.random();
    let rarity;
    if      (r < 0.55) rarity = 'common';
    else if (r < 0.85) rarity = 'rare';
    else if (r < 0.95) rarity = 'epic';
    else               rarity = 'legendary';
    const choices = CASE_ITEMS.filter(ci => ci.rarity === rarity);
    const picked  = choices[Math.floor(Math.random() * choices.length)];
    pool.push(picked);
    const el       = document.createElement('div');
    el.className   = `case-roll-item case-rarity-${rarity}`;
    el.textContent = picked.emoji;
    strip.appendChild(el);
  }
  return pool;
}

export function buildCaseStripInitial() {
  const strip = document.getElementById('case-items');
  strip.innerHTML = '';
  strip.style.transform = 'translateX(0)';
  document.getElementById('case-result').textContent = 'Press the button to spin the barrel...';
  document.getElementById('case-result').className   = 'case-result';
  for (let i = 0; i < 8; i++) {
    const item     = CASE_ITEMS[Math.floor(Math.random() * CASE_ITEMS.length)];
    const el       = document.createElement('div');
    el.className   = `case-roll-item case-rarity-${item.rarity}`;
    el.textContent = item.emoji;
    strip.appendChild(el);
  }
}

window.openCase = function() {
  if (caseSpinning) return;
  caseSpinning = true;
  ensureAudio();

  const btn = document.getElementById('case-btn');
  btn.disabled    = true;
  btn.textContent = '⏳ ROLLING...';
  document.getElementById('case-result').textContent = '';

  const pool      = buildCaseStrip();
  const strip     = document.getElementById('case-items');
  const track     = document.getElementById('case-track');
  const itemW     = 80;
  const targetIdx = 28 + Math.floor(Math.random() * 8);
  const won       = pool[targetIdx];
  const finalX    = -(targetIdx * itemW) + track.offsetWidth / 2 - itemW / 2;
  const duration  = 3500;
  let startTime   = null;

  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }
  function animate(ts) {
    if (!startTime) startTime = ts;
    const elapsed  = ts - startTime;
    const progress = Math.min(elapsed / duration, 1);
    strip.style.transform = `translateX(${finalX * easeOut(progress)}px)`;
    if (elapsed < 2000 && Math.floor(elapsed / 80) !== Math.floor((elapsed - 16) / 80)) playClick();
    if (progress < 1) requestAnimationFrame(animate);
    else finishCase(won, btn);
  }
  requestAnimationFrame(animate);
};

function finishCase(won, btn) {
  caseSpinning    = false;
  btn.disabled    = false;
  btn.textContent = '🎲 OPEN CASE';

  const res         = document.getElementById('case-result');
  const rarityLabel = { common:'Common', rare:'Rare', epic:'Epic', legendary:'LEGENDARY' }[won.rarity];
  const rarityClass = won.rarity === 'legendary' ? 'won-legendary' : won.rarity === 'epic' ? 'won-epic' : 'won';

  if (!inventory.includes(won.emoji)) {
    inventory.push(won.emoji);
    saveCustom();
    res.className   = `case-result ${rarityClass}`;
    res.textContent = `✨ ${won.emoji} — ${rarityLabel} unlocked!`;
    playDrawHorn();
    spawnParticles(['✨','⭐','💫'], 10);
  } else {
    res.className   = 'case-result won';
    res.textContent = `${won.emoji} — already owned (${rarityLabel})`;
    playClick();
  }
  renderItemGrid();
}

// ═══════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════
window.updateSettings = function() {
  settings.sfx        = document.getElementById('sfx-toggle').checked;
  settings.volume     = document.getElementById('vol-slider').value / 100;
  settings.wallEvents = document.getElementById('wall-toggle').checked;
  settings.baitWords  = document.getElementById('bait-toggle').checked;
  document.getElementById('vol-label').textContent = document.getElementById('vol-slider').value + '%';
  updateKeybindLabels();
};

function updateKeybindLabels() {
  document.querySelectorAll('[data-key-label="p1"]').forEach(el => el.textContent = keyLabel(keybinds.p1));
  document.querySelectorAll('[data-key-label="p2"]').forEach(el => el.textContent = keyLabel(keybinds.p2));
  document.getElementById('ind-p1').textContent = `P1 [${keyLabel(keybinds.p1)}]`;
  document.getElementById('ind-p2').textContent = `P2 [${keyLabel(keybinds.p2)}]`;
}

window.listenForKeybind = function(player) {
  const btn = document.getElementById(player + '-bind-btn');
  const oldText = btn.textContent;
  btn.textContent = 'PRESS A KEY...';
  document.body.dataset.listeningKeybind = player;

  const capture = (e) => {
    e.preventDefault();
    const ok = setKeybind(player, e.key.length === 1 ? e.key.toLowerCase() : e.code);
    document.body.dataset.listeningKeybind = '';
    window.removeEventListener('keydown', capture, true);
    if (!ok) {
      btn.textContent = oldText;
      alert('That key is already used by the other player. Pick another key.');
      return;
    }
    updateKeybindLabels();
  };
  window.addEventListener('keydown', capture, true);
};

window.quitGame = function() {
  if (confirm('Close the game? Your progress is saved.')) {
    window.close();
    document.body.innerHTML = '<div style="font-family:\'Special Elite\',cursive;color:#c8a96e;text-align:center;padding:4rem;font-size:1.5rem;">🤠 May your draws be ever swift, partner.</div>';
  }
};

// ═══════════════════════════════════════════════════════
// VISUAL EFFECTS
// ═══════════════════════════════════════════════════════
function muzzleFlash() {
  const el = document.getElementById('muzzle');
  el.classList.remove('bang'); void el.offsetWidth; el.classList.add('bang');
}

function triggerWallFlash() {
  const el = document.getElementById('wall-flash');
  el.classList.remove('crack'); void el.offsetWidth; el.classList.add('crack');
}

function spawnParticles(chars, count) {
  for (let i = 0; i < count; i++) {
    const el       = document.createElement('div');
    el.className   = 'particle';
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    el.style.left  = (20 + Math.random() * 60) + 'vw';
    el.style.top   = (30 + Math.random() * 40) + 'vh';
    el.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    el.style.setProperty('--dy', (-80 - Math.random() * 160) + 'px');
    el.style.animationDelay = Math.random() * 0.3 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

window.showScreen = showScreen;
updateCharPreviews();
updateKeybindLabels();
